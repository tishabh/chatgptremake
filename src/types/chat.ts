export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  name: string;
  type: string; // mime type
  url: string;
  base64?: string;
  size: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  thought?: string; // For reasoning models (Gemini Flash Thinking / Copilot o1/o3-mini)
  createdAt: number;
  attachments?: Attachment[];
  model?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
}

export type ModelProvider = 'gemini' | 'copilot' | 'openrouter' | 'meta';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  badge?: string;
  supportsThinking?: boolean;
  supportsVision?: boolean;
  isFree?: boolean;
}

export interface CopilotUser {
  login: string;
  avatar_url?: string;
  name?: string;
}

export interface UserSettings {
  geminiApiKey: string;
  openrouterApiKey: string;
  metaApiKey: string;
  githubToken: string;
  copilotToken: string;
  copilotExpiresAt: number;
  copilotUser: CopilotUser | null;
  systemPrompt: string;
  temperature: number;
  theme: 'dark' | 'light' | 'system';
  selectedModelId: string;
}

export interface CopilotDeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // OpenRouter Free Models (Powered by your OpenRouter key!)
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning (Free)',
    provider: 'openrouter',
    description: 'Ultra-fast NVIDIA reasoning & coding assistant with real-time thought stream',
    badge: 'Fast & Free',
    supportsThinking: true,
    isFree: true,
  },
  {
    id: 'liquid/lfm-2.5-2.6b:free',
    name: 'Liquid LFM 2.5 (Free)',
    provider: 'openrouter',
    description: 'Instant response model with step-by-step thinking breakdown',
    badge: 'Instant',
    supportsThinking: true,
    isFree: true,
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B (OpenRouter)',
    provider: 'openrouter',
    description: 'Google open flagship model accessible via OpenRouter free tier',
    badge: 'Google Open',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super Vision (Free)',
    provider: 'openrouter',
    description: 'High performance NVIDIA multimodal vision model',
    badge: 'Vision Free',
    supportsVision: true,
    isFree: true,
  },

  // Google Gemini Direct Free Models (Requires Google AI Studio AIzaSy... key)
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Ultra-fast official Google AI Studio model with sub-second generation (Recommended)',
    badge: 'Recommended',
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'High-speed Google multimodal production model with high rate limits',
    badge: 'Fast',
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Next-gen Google preview model (May experience high server demand)',
    badge: 'Preview',
    supportsVision: true,
    isFree: true,
  },

  // Meta AI Models (Requires Meta Developer key)
  {
    id: 'muse-spark-1.3',
    name: 'Meta Muse Spark 1.3',
    provider: 'meta',
    description: 'Official Meta AI fast chat and coding model',
    badge: 'Meta AI',
    isFree: false,
  },
  {
    id: 'muse-wonder-1.0',
    name: 'Meta Muse Wonder 1.0',
    provider: 'meta',
    description: 'Meta creative and complex reasoning assistant',
    badge: 'Meta AI',
    isFree: false,
  },

  // GitHub Copilot Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Copilot)',
    provider: 'copilot',
    description: 'Flagship OpenAI model via GitHub Copilot subscription',
    badge: 'Copilot',
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (Copilot)',
    provider: 'copilot',
    description: "Anthropic's top-tier coding & analysis model via Copilot",
    badge: 'Copilot',
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'o3-mini',
    name: 'o3-mini (Copilot)',
    provider: 'copilot',
    description: 'Specialized STEM, coding, and mathematical reasoning model',
    badge: 'Reasoning',
    supportsThinking: true,
    supportsVision: false,
    isFree: false,
  },
  {
    id: 'o1',
    name: 'o1 (Copilot)',
    provider: 'copilot',
    description: 'Deep thoughtful reasoning and problem solving',
    badge: 'Reasoning',
    supportsThinking: true,
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini (Copilot)',
    provider: 'copilot',
    description: 'Fast, efficient everyday assistant via Copilot',
    badge: 'Copilot',
    supportsVision: true,
    isFree: false,
  },
];
