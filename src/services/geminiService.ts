import { Message } from '../types/chat';

export interface StreamGeminiParams {
  apiKey: string;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  onChunk: (text: string) => void;
  onThought?: (thought: string) => void;
  signal?: AbortSignal;
}

export const geminiService = {
  /**
   * Stream Gemini content via proxy endpoint with automatic fallback to direct port
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
  }: StreamGeminiParams): Promise<void> {
    if (!apiKey) {
      throw new Error('Please configure your free Gemini API Key in Settings (or click "Add Gemini Key").');
    }

    // Set a 35-second timeout so stalled queries fail fast with guidance
    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      timeoutController.abort(new Error('Connection timed out after 35 seconds. Google servers may be experiencing high load.'));
    }, 35000);

    const onAbort = () => timeoutController.abort();
    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    const payload = JSON.stringify({
      apiKey,
      model,
      messages,
      systemPrompt,
      temperature,
    });

    try {
      console.log(`[GeminiService] Requesting stream for model: ${model}`);

      let res: Response;
      try {
        res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: timeoutController.signal,
        });
      } catch (fetchErr: any) {
        if (timeoutController.signal.aborted) throw fetchErr;
        console.warn('[GeminiService] Relative proxy failed, falling back to http://127.0.0.1:3001/api/gemini/chat');
        res = await fetch('http://127.0.0.1:3001/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: timeoutController.signal,
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error (${res.status}): ${res.statusText}` }));
        throw new Error(err.error || 'Gemini generation failed');
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
            if (parsed.text) {
              onChunk(parsed.text);
            }
            if (parsed.thought && onThought) {
              onThought(parsed.thought);
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
