import { Message } from '../types/chat';

export interface StreamMetaParams {
  apiKey: string;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export const metaService = {
  /**
   * Stream Meta chat completions via proxy endpoint with automatic port fallback
   */
  async streamChat({
    apiKey,
    model,
    messages,
    systemPrompt,
    temperature = 0.7,
    onChunk,
    signal,
  }: StreamMetaParams): Promise<void> {
    if (!apiKey) {
      throw new Error('Please enter your Meta API Key in Settings (or click "Add Meta Key").');
    }

    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      timeoutController.abort(new Error('Connection timed out after 30 seconds.'));
    }, 30000);

    const onAbort = () => timeoutController.abort();
    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    const chatMessages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      chatMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.content && !msg.content.startsWith('⚠️')) {
        chatMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    if (chatMessages.length === 0) {
      chatMessages.push({ role: 'user', content: 'Hello' });
    }

    const payload = JSON.stringify({
      apiKey,
      model,
      messages: chatMessages,
      temperature,
    });

    try {
      console.log(`[MetaService] Requesting stream for model: ${model}`);

      let res: Response;
      try {
        res = await fetch('/api/meta/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: timeoutController.signal,
        });
      } catch (fetchErr: any) {
        if (timeoutController.signal.aborted) throw fetchErr;
        res = await fetch('http://127.0.0.1:3001/api/meta/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: timeoutController.signal,
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error (${res.status}): ${res.statusText}` }));
        throw new Error(err.error || 'Meta generation failed');
      }

      if (!res.body) {
        throw new Error('No stream response from server');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (signal?.aborted || timeoutController.signal.aborted) break;

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

            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              onChunk(delta.content);
            }
          } catch (e: any) {
            if (e.message && !e.message.startsWith('Unexpected token') && !e.message.includes('JSON')) {
              throw e;
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutTimer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }
  },
};
