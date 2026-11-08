import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// GitHub Copilot official VS Code OAuth Client ID
const COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

/**
 * Helper to unwrap nested Google API error messages into clean readable strings
 */
function cleanGoogleError(raw: any): string {
  try {
    if (raw?.name === 'AbortError' || String(raw?.message).includes('aborted')) {
      return 'Google Gemini API request timed out. Please try again in a few moments.';
    }
    const errCode = raw?.code || raw?.error?.code;
    const errMsgStr = String(raw?.error?.message || raw?.message || JSON.stringify(raw));
    if (errCode === 503 || errMsgStr.includes('high demand') || errMsgStr.includes('UNAVAILABLE')) {
      return 'Gemini 3.8 Flash is currently experiencing high demand on Google servers (503). Switched to Gemini 2.5 Flash, or try OpenRouter free models from the top selector.';
    }
    let msg = typeof raw === 'string' ? raw : raw?.error?.message || raw?.message || JSON.stringify(raw);
    for (let i = 0; i < 3; i++) {
      const start = msg.indexOf('{');
      const end = msg.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(msg.slice(start, end + 1));
        if (parsed.error?.message) {
          msg = parsed.error.message;
        } else if (typeof parsed.error === 'string') {
          msg = parsed.error;
        } else if (parsed.message) {
          msg = parsed.message;
        }
      }
    }
    return msg.replace(/^ApiError:\s*/, '');
  } catch {
    return String(raw?.message || raw || 'Generation error occurred');
  }
}

/**
 * 1. Initialize GitHub Device Flow OAuth for Copilot
 */
app.post('/api/auth/github-device', async (req, res) => {
  try {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        scope: 'read:user',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_description || 'Failed to start device flow' });
    }

    res.json({
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri || 'https://github.com/login/device',
      expires_in: data.expires_in,
      interval: data.interval || 5,
    });
  } catch (error: any) {
    console.error('Device flow error:', error);
    res.status(500).json({ error: error.message || 'Server error starting device flow' });
  }
});

/**
 * Helper to fetch Copilot token and user details from a GitHub access token
 */
async function fetchCopilotSession(githubToken: string) {
  let user = { login: 'GitHub User', avatar_url: '', name: 'GitHub User' };
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'GitHubCopilotChat/0.22.0',
        'Accept': 'application/json',
      },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      user = {
        login: userData.login,
        avatar_url: userData.avatar_url,
        name: userData.name || userData.login,
      };
    }
  } catch (e) {
    console.warn('Could not fetch user profile:', e);
  }

  const copilotRes = await fetch('https://api.github.com/copilot_internal/v2/token', {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Editor-Version': 'vscode/1.95.0',
      'Editor-Plugin-Version': 'copilot-chat/0.22.0',
      'User-Agent': 'GitHubCopilotChat/0.22.0',
      'Accept': 'application/json',
    },
  });

  const copilotData = await copilotRes.json();
  if (!copilotRes.ok) {
    throw new Error(copilotData.message || 'Your GitHub account does not appear to have an active GitHub Copilot subscription.');
  }

  return {
    copilotToken: copilotData.token,
    expiresAt: copilotData.expires_at,
    user,
  };
}

/**
 * 2. Poll GitHub Device Flow for Access Token
 */
app.post('/api/auth/github-poll', async (req, res) => {
  const { device_code } = req.body;
  if (!device_code) {
    return res.status(400).json({ error: 'device_code is required' });
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.json({ status: data.error, message: data.error_description });
    }

    if (data.access_token) {
      const session = await fetchCopilotSession(data.access_token);
      return res.json({
        status: 'success',
        githubToken: data.access_token,
        copilotToken: session.copilotToken,
        expiresAt: session.expiresAt,
        user: session.user,
      });
    }

    res.status(400).json({ error: 'Unexpected response from GitHub' });
  } catch (error: any) {
    console.error('Device poll error:', error);
    res.status(500).json({ error: error.message || 'Poll failed' });
  }
});

/**
 * 3. Verify or Refresh Token with an existing GitHub Token
 */
app.post('/api/auth/github-exchange', async (req, res) => {
  const { githubToken } = req.body;
  if (!githubToken) {
    return res.status(400).json({ error: 'githubToken is required' });
  }

  try {
    const session = await fetchCopilotSession(githubToken);
    res.json({
      success: true,
      githubToken,
      copilotToken: session.copilotToken,
      expiresAt: session.expiresAt,
      user: session.user,
    });
  } catch (error: any) {
    console.error('Exchange error:', error);
    res.status(400).json({ error: error.message || 'Token exchange failed' });
  }
});

/**
 * 4. GitHub Copilot Streaming Chat Completion
 */
app.post('/api/copilot/chat', async (req, res) => {
  const { githubToken, copilotToken, model, messages, temperature = 0.7 } = req.body;

  let activeToken = copilotToken;

  try {
    if (!activeToken && githubToken) {
      const session = await fetchCopilotSession(githubToken);
      activeToken = session.copilotToken;
    }

    if (!activeToken) {
      return res.status(401).json({ error: 'Missing Copilot Token. Please sign in with GitHub Copilot.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const copilotRes = await fetch('https://api.githubcopilot.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeToken}`,
        'Editor-Version': 'vscode/1.95.0',
        'Editor-Plugin-Version': 'copilot-chat/0.22.0',
        'Copilot-Integration-Id': 'vscode-chat',
        'Openai-Organization': 'github-copilot',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages,
        temperature,
        stream: true,
      }),
    });

    if (!copilotRes.ok) {
      const errText = await copilotRes.text();
      res.write(`data: ${JSON.stringify({ error: `Copilot API error (${copilotRes.status}): ${errText}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (!copilotRes.body) {
      res.write(`data: ${JSON.stringify({ error: 'No response body from Copilot' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = (copilotRes.body as any).getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      res.write(text);
    }

    res.end();
  } catch (error: any) {
    console.error('Copilot streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Copilot streaming failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

/**
 * 4.5. OpenRouter Streaming Chat Completion
 */
app.post('/api/openrouter/chat', async (req, res) => {
  const { apiKey, model, messages, temperature = 0.7 } = req.body;

  const keyToUse = apiKey || process.env.OPENROUTER_API_KEY;

  if (!keyToUse) {
    return res.status(400).json({ error: 'No OpenRouter API key provided.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyToUse}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'ChatGPT Remake',
      },
      body: JSON.stringify({
        model: model || 'nvidia/nemotron-3.5-lightning:free',
        messages,
        temperature,
        stream: true,
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error?.message || errText;
      } catch {}
      res.write(`data: ${JSON.stringify({ error: `OpenRouter Error (${orRes.status}): ${errMsg}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (!orRes.body) {
      res.write(`data: ${JSON.stringify({ error: 'No response body from OpenRouter' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = orRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
      if (typeof (res as any).flush === 'function') (res as any).flush();
    }

    res.end();
  } catch (error: any) {
    console.error('OpenRouter stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * 5. Gemini Chat Streaming Endpoint
 */
app.post('/api/gemini/chat', async (req, res) => {
  const { apiKey, model, messages, systemPrompt, temperature = 0.7 } = req.body;

  const keyToUse = apiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    return res.status(400).json({ error: 'No Gemini API key provided. Please configure your key in Settings.' });
  }

  // Respect user's selected Gemini model; default to gemini-2.5-flash
  let activeModel = model || 'gemini-2.5-flash';

  console.log(`[Gemini API] Request received: model=${activeModel}, messages=${messages?.length || 0}`);

  // Test and inspect user's available models and key validity
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);
    const listData = await listRes.json();
    if (listData.error) {
      console.error('[Gemini API] Key validation error:', listData.error);
      const cleanErr = cleanGoogleError(listData.error);
      res.write(`data: ${JSON.stringify({ error: cleanErr })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    const modelNames = listData.models?.map((m: any) => m.name.replace('models/', '')) || [];
    console.log(`[Gemini API] Key is VALID. Available models (${modelNames.length}):`, modelNames.slice(0, 10).join(', '));
  } catch (e: any) {
    console.warn('[Gemini API] Could not list models:', e?.message || e);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const ai = new GoogleGenAI({ apiKey: keyToUse, apiVersion: 'v1beta' });

  // Clean and format contents for models API
  const contents: any[] = [];
  for (const msg of messages || []) {
    let cleanText = (msg.content || '').trim();
    if (cleanText.startsWith('⚠️')) continue;
    const errIdx = cleanText.indexOf('⚠️');
    if (errIdx !== -1) {
      cleanText = cleanText.substring(0, errIdx).trim();
    }

    const parts: any[] = [];
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        if (att.base64) {
          parts.push({
            inlineData: {
              mimeType: att.type,
              data: att.base64.split(',')[1] || att.base64,
            }
          });
        }
      }
    }
    if (cleanText) {
      parts.push({ text: cleanText });
    }
    if (parts.length > 0) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  // Combine consecutive messages with the same role into clean single-text turns
  const normalizedContents: any[] = [];
  for (const item of contents) {
    if (!item.parts || item.parts.length === 0) continue;
    const last = normalizedContents[normalizedContents.length - 1];

    const textPart = item.parts.find((p: any) => p.text);
    const mediaParts = item.parts.filter((p: any) => !p.text);

    if (last && last.role === item.role) {
      const lastTextPart = last.parts.find((p: any) => p.text);
      if (lastTextPart && textPart) {
        lastTextPart.text += '\n\n' + textPart.text;
      } else if (textPart) {
        last.parts.push(textPart);
      }
      last.parts.push(...mediaParts);
    } else {
      normalizedContents.push({
        role: item.role,
        parts: [...item.parts],
      });
    }
  }

  // Ensure conversation ends with user role and is not empty
  if (normalizedContents.length === 0) {
    normalizedContents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  } else if (normalizedContents[normalizedContents.length - 1].role !== 'user') {
    normalizedContents.push({ role: 'user', parts: [{ text: 'Continue' }] });
  }

  console.log(`[Gemini API] Contents prepared (${normalizedContents.length} turns)`);

  // Helper to stream with Gemini API via direct native fetch (bypassing Undici socket locks)
  async function streamWithModel(targetModel: string): Promise<boolean> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${keyToUse}`;
    
    const requestBody: any = {
      contents: normalizedContents,
      generationConfig: {
        temperature,
      },
    };

    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    console.log(`[Gemini API] Dispatching native fetch to ${url.replace(keyToUse, 'REDACTED')}...`);

    const controller = new AbortController();
    const abortTimeout = setTimeout(() => {
      controller.abort();
      console.error(`[Gemini API] Aborted Google fetch after 20s timeout!`);
    }, 20000);

    let apiRes;
    try {
      apiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(abortTimeout);
    }

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      let parsedErr: any = errText;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}
      throw parsedErr;
    }

    if (!apiRes.body) {
      throw new Error('No response body from Gemini API');
    }

    console.log(`[Gemini API] Connected to Gemini stream for ${targetModel}, reading body...`);
    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let sent = false;

    // Timeout if first chunk doesn't arrive within 12 seconds
    let receivedFirstChunk = false;
    const firstChunkTimer = setTimeout(() => {
      if (!receivedFirstChunk) {
        console.warn(`[Gemini API] First chunk stall detected on ${targetModel} after 12s`);
        try { reader.cancel(); } catch {}
      }
    }, 12000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          clearTimeout(firstChunkTimer);
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') return sent;

          try {
            const json = JSON.parse(dataStr);
            if (json.error) {
              throw json.error;
            }

            for (const candidate of json.candidates || []) {
              for (const part of candidate.content?.parts || []) {
                if (part.thought && part.text) {
                  sent = true;
                  res.write(`data: ${JSON.stringify({ thought: part.text })}\n\n`);
                  if (typeof (res as any).flush === 'function') (res as any).flush();
                } else if (part.text) {
                  sent = true;
                  res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
                  if (typeof (res as any).flush === 'function') (res as any).flush();
                }
              }
            }
          } catch (parseErr: any) {
            if (parseErr?.message && (parseErr.message.includes('API key') || parseErr.message.includes('error'))) {
              throw parseErr;
            }
          }
        }
      }
    } finally {
      clearTimeout(firstChunkTimer);
    }

    if (!sent && !receivedFirstChunk) {
      throw new Error('Server stall: No response tokens received from model within 12 seconds.');
    }

    return sent;
  }

  try {
    await streamWithModel(activeModel);
    console.log(`[Gemini API] Successfully completed stream for ${activeModel}`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error(`[Gemini API] Error streaming with ${activeModel}:`, err?.message || err);

    // Auto-recovery: If model is overloaded (503), rate-limited (429), or stalled, auto-failover
    const isOverloadedOrStalled =
      err?.code === 503 ||
      err?.status === 'UNAVAILABLE' ||
      err?.error?.code === 503 ||
      err?.error?.status === 'UNAVAILABLE' ||
      String(err?.message || '').includes('high demand') ||
      String(err?.error?.message || '').includes('high demand') ||
      String(err?.message || '').includes('stall') ||
      String(err?.message || '').includes('UNAVAILABLE') ||
      String(err?.error?.message || '').includes('UNAVAILABLE');

    if (isOverloadedOrStalled) {
      const fallbackModel = activeModel === 'gemini-2.5-flash' ? 'gemini-2.0-flash' : 'gemini-2.5-flash';
      try {
        console.log(`[Gemini API] Auto-recovering: ${activeModel} hit Google server capacity. Auto-failing over to ${fallbackModel}...`);
        res.write(`data: ${JSON.stringify({ thought: `Google servers reported high demand on ${activeModel}. Automatically switching to ${fallbackModel} for an instant response...\n\n` })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
        await streamWithModel(fallbackModel);
        console.log(`[Gemini API] Auto-failover to ${fallbackModel} succeeded!`);
        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (fallbackErr: any) {
        console.error('[Gemini API] Fallback model also failed:', fallbackErr?.message || fallbackErr);
      }
    }

    const cleanErr = cleanGoogleError(err);
    res.write(`data: ${JSON.stringify({ error: cleanErr })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * 6. Meta AI Chat Streaming Endpoint
 */
app.post('/api/meta/chat', async (req, res) => {
  const { apiKey, model, messages, temperature = 0.7 } = req.body;

  const keyToUse = apiKey || process.env.META_API_KEY;
  if (!keyToUse) {
    return res.status(400).json({ error: 'No Meta API key provided. Please configure your key in Settings.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  try {
    const metaRes = await fetch('https://api.meta.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyToUse}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'muse-spark-1.3',
        messages: messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature,
        stream: true,
      }),
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error?.message || errText;
      } catch {}

      if (metaRes.status === 402 || errMsg.includes('billing')) {
        errMsg = 'Meta AI Billing Setup Required: To activate chat completions, please visit https://dev.meta.ai/billing/?team_id=1452826790383727 to verify your billing/credits.';
      }

      res.write(`data: ${JSON.stringify({ error: `Meta AI Notice: ${errMsg}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (!metaRes.body) {
      res.write(`data: ${JSON.stringify({ error: 'No response body from Meta AI' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = metaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
      if (typeof (res as any).flush === 'function') (res as any).flush();
    }

    res.end();
  } catch (error: any) {
    console.error('Meta stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'ChatGPT Remake API' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
