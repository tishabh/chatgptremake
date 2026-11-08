import { Conversation, UserSettings } from '../types/chat';

const SETTINGS_KEY = 'chatgpt_remake_settings_v1';
const CONVERSATIONS_KEY = 'chatgpt_remake_conversations_v1';
const ACTIVE_CONV_KEY = 'chatgpt_remake_active_conv_v1';

const ENV_OPENROUTER_KEY = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || '';
const ENV_META_KEY = (import.meta as any).env?.VITE_META_API_KEY || '';

export const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: '',
  openrouterApiKey: ENV_OPENROUTER_KEY,
  metaApiKey: ENV_META_KEY,
  githubToken: '',
  copilotToken: '',
  copilotExpiresAt: 0,
  copilotUser: null,
  systemPrompt: 'You are ChatGPT, a large language model trained by OpenAI, or Gemini/Copilot/OpenRouter assistant depending on user selection. You are helpful, direct, concise, and provide beautifully formatted markdown and code.',
  temperature: 0.7,
  theme: 'dark',
  selectedModelId: 'nvidia/nemotron-3.5-lightning:free',
};

export const storageService = {
  getSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };

      // Auto-migrate OpenRouter key if accidentally placed in Gemini key
      if (parsed.geminiApiKey && parsed.geminiApiKey.startsWith('sk-or-v1-')) {
        parsed.openrouterApiKey = parsed.geminiApiKey;
        parsed.geminiApiKey = '';
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      }

      // Auto-migrate Meta key if accidentally placed in Gemini or OpenRouter key
      if (parsed.geminiApiKey && parsed.geminiApiKey.startsWith('LLM_')) {
        parsed.metaApiKey = parsed.geminiApiKey;
        parsed.geminiApiKey = '';
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      }

      if (parsed.openrouterApiKey && parsed.openrouterApiKey.startsWith('LLM_')) {
        parsed.metaApiKey = parsed.openrouterApiKey;
        parsed.openrouterApiKey = DEFAULT_SETTINGS.openrouterApiKey;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      }

      if (!parsed.openrouterApiKey && ENV_OPENROUTER_KEY) {
        parsed.openrouterApiKey = ENV_OPENROUTER_KEY;
      }

      if (!parsed.metaApiKey && ENV_META_KEY) {
        parsed.metaApiKey = ENV_META_KEY;
      }

      // Auto-migrate legacy or retired model IDs to active openrouter model
      if (
        !parsed.selectedModelId ||
        parsed.selectedModelId.startsWith('gemini-2.0') ||
        parsed.selectedModelId.startsWith('gemini-1.5') ||
        parsed.selectedModelId === 'gemini-3.8-pro'
      ) {
        parsed.selectedModelId = 'nvidia/nemotron-3.5-lightning:free';
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  getConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Error saving conversations', e);
    }
  },

  getActiveConversationId(): string | null {
    return localStorage.getItem(ACTIVE_CONV_KEY);
  },

  saveActiveConversationId(id: string | null): void {
    if (id) {
      localStorage.setItem(ACTIVE_CONV_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  }
};
