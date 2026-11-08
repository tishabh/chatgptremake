import React from 'react';
import {
  PanelLeft,
  Share2,
  Settings,
  Key,
  Zap,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { ModelSelector } from './ModelSelector';
import type { UserSettings } from '../types/chat';

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  settings: UserSettings;
  onOpenSettings: (tab?: string) => void;
  onOpenCopilotAuth: () => void;
  onShareChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
  selectedModelId,
  onSelectModel,
  settings,
  onOpenSettings,
  onOpenCopilotAuth,
  onShareChat,
}) => {
  const hasGeminiKey = !!settings.geminiApiKey;
  const hasOpenRouterKey = !!settings.openrouterApiKey;
  const hasCopilotAuth = !!(settings.copilotToken || settings.githubToken);

  return (
    <header className="h-14 border-b border-[#2e2e2e] flex items-center justify-between px-3 z-20 bg-[#212121]">
      {/* Left section */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft size={20} />
        </button>

        {/* Model Selector dropdown */}
        <ModelSelector
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          settings={settings}
          onOpenCopilotAuth={onOpenCopilotAuth}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* OpenRouter indicator */}
        <button
          onClick={() => onOpenSettings('openrouter')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            hasOpenRouterKey
              ? 'bg-emerald-900/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
          }`}
          title={hasOpenRouterKey ? 'OpenRouter Connected (Free Models Ready)' : 'Configure OpenRouter Key'}
        >
          <Zap size={12} className={hasOpenRouterKey ? 'text-emerald-400' : ''} />
          <span className="hidden sm:inline">{hasOpenRouterKey ? 'OpenRouter Ready' : 'Add OpenRouter'}</span>
        </button>

        {/* Gemini API Key indicator */}
        <button
          onClick={() => onOpenSettings('gemini')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            hasGeminiKey
              ? 'bg-blue-900/20 text-blue-300 border-blue-800/40 hover:bg-blue-900/40'
              : 'bg-[#2a2a2a] text-gray-400 border-[#444] hover:bg-[#333]'
          }`}
          title={hasGeminiKey ? 'Gemini Key Configured' : 'Configure Free Gemini API Key (AIzaSy...)'}
        >
          <Key size={12} />
          <span className="hidden sm:inline">{hasGeminiKey ? 'Gemini Ready' : 'Add Gemini Key'}</span>
        </button>

        {/* Copilot indicator */}
        <button
          onClick={() => (hasCopilotAuth ? onOpenSettings('copilot') : onOpenCopilotAuth())}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            hasCopilotAuth
              ? 'bg-purple-900/20 text-purple-300 border-purple-800/40 hover:bg-purple-900/40'
              : 'bg-[#2a2a2a] text-gray-300 border-[#444] hover:bg-[#333]'
          }`}
          title={hasCopilotAuth ? `Copilot Connected: @${settings.copilotUser?.login || 'User'}` : 'Sign in with GitHub Copilot'}
        >
          <GithubIcon size={12} />
          <span className="hidden sm:inline">
            {hasCopilotAuth ? (settings.copilotUser?.login ? `@${settings.copilotUser.login}` : 'Copilot Active') : 'Copilot Login'}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={onShareChat}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title="Share chat"
        >
          <Share2 size={18} />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => onOpenSettings()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
