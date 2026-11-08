import { CopilotDeviceAuthResponse, Message } from '../types/chat';

export interface StreamChatParams {
  copilotToken: string;
  githubToken: string;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  onChunk: (text: string) => void;
  onThought?: (thought: string) => void;
  signal?: AbortSignal;
}

async function resilientFetch(path: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(path, options);
  } catch (err: any) {
    if (options.signal?.aborted) throw err;
    console.warn(`[CopilotService] Proxy fetch to ${path} failed, retrying directly on port 3001`);
    return await fetch(`http://127.0.0.1:3001${path}`, options);
  }
}

export const copilotService = {
  /**
   * Start the GitHub Device Code OAuth Flow
   */
  async startDeviceAuth(): Promise<CopilotDeviceAuthResponse> {
    const res = await resilientFetch('/api/auth/github-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to initiate GitHub Device Flow' }));
      throw new Error(err.error || 'Failed to start device flow');
    }
    return res.json();
  },

  /**
   * Poll GitHub for authorization completion
   */
  async pollDeviceAuth(device_code: string) {
    const res = await resilientFetch('/api/auth/github-poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Poll request failed' }));
      throw new Error(err.error || 'Poll failed');
    }
    return res.json();
  },

  /**
   * Verify / Exchange a GitHub Token (e.g. ghu_... or PAT) for Copilot session token
   */
  async exchangeToken(githubToken: string) {
    const res = await resilientFetch('/api/auth/github-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Exchange failed' }));
      throw new Error(err.error || 'Exchange failed');
    }
    return res.json();
  },

  /**
   * Stream Chat completions from GitHub Copilot
   */
  async streamChat({
    copilotToken,
    githubToken,
    model,
    messages,
    systemPrompt,
    temperature = 0.7,
    onChunk,
    onThought,
    signal,
  }: StreamChatParams): Promise<void> {
    // Format messages for OpenAI format
    const formattedMessages: { role: string; content: string }[] = [];

    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    const res = await resilientFetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        copilotToken,
        githubToken,
        model,
        messages: formattedMessages,
        temperature,
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Copilot request failed: ${res.statusText}` }));
      throw new Error(err.error || 'Copilot request failed');
    }

    if (!res.body) {
      throw new Error('No stream body received from Copilot');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }

          // Check standard OpenAI delta
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            if (delta.content) {
              onChunk(delta.content);
            }
            // Check reasoning / thought chunks for o1/o3-mini
            if (delta.reasoning_content && onThought) {
              onThought(delta.reasoning_content);
            }
          }
        } catch (e: any) {
          if (e.message && e.message.includes('Copilot API error')) {
            throw e;
          }
        }
      }
    }
  },
};
