import { Message } from '../types/chat';

export interface StreamOpenRouterParams {
  apiKey: string;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  onChunk: (text: string) => void;
  onThought?: (thought: string) => void;
  signal?: AbortSignal;
}

export const openrouterService = {
  /**
   * Stream chat completion from OpenRouter API
   */
  async streamChat({
    apiKey,
    model,
    messages,
    systemPrompt,
    temperature = 0.7,
    onChunk,
    onThought,
    signal,
  }: StreamOpenRouterParams): Promise<void> {
    if (!apiKey) {
      throw new Error('Please configure your OpenRouter API Key in Settings.');
    }

    // Format messages for OpenAI/OpenRouter format
    const formattedMessages: { role: string; content: string }[] = [];

    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.content && msg.content.startsWith('⚠️')) continue;
      formattedMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    const payload = JSON.stringify({
      apiKey,
      model,
      messages: formattedMessages,
      temperature,
    });

    let res: Response;
    try {
      res = await fetch('/api/openrouter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal,
      });
    } catch (fetchErr: any) {
      if (signal?.aborted) throw fetchErr;
      console.warn('[OpenRouterService] Proxy failed, retrying directly on port 3001');
      res = await fetch('http://127.0.0.1:3001/api/openrouter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal,
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `OpenRouter request failed (${res.status}): ${res.statusText}` }));
      throw new Error(err.error || 'OpenRouter generation failed');
    }

    if (!res.body) {
      throw new Error('No stream body received from OpenRouter');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }

          // Check standard delta content
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            if (delta.content) {
              onChunk(delta.content);
            }
            // Check reasoning / thinking chunks
            const thoughtText = delta.reasoning || delta.reasoning_details?.[0]?.text;
            if (thoughtText && onThought) {
              onThought(thoughtText);
            }
          }
        } catch (e: any) {
          if (e.message && (e.message.includes('API') || e.message.includes('error') || e.message.includes('failed'))) {
            throw e;
          }
        }
      }
    }
  },
};
