import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Zap, Brain } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { AVAILABLE_MODELS } from '../types/chat';
import type { UserSettings } from '../types/chat';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  settings: UserSettings;
  onOpenCopilotAuth: () => void;
  onOpenSettings: (tab?: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  settings,
  onOpenCopilotAuth,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openrouterModels = AVAILABLE_MODELS.filter((m) => m.provider === 'openrouter');
  const geminiModels = AVAILABLE_MODELS.filter((m) => m.provider === 'gemini');
  const metaModels = AVAILABLE_MODELS.filter((m) => m.provider === 'meta');
  const copilotModels = AVAILABLE_MODELS.filter((m) => m.provider === 'copilot');
  const hasCopilotAuth = !!(settings.copilotToken || settings.githubToken);
  const hasOpenRouterKey = !!settings.openrouterApiKey;
  const hasMetaKey = !!settings.metaApiKey;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-lg font-semibold text-gray-200 hover:bg-[#282828] transition-colors"
      >
        <span>{selectedModel.name}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 md:w-96 rounded-2xl bg-[#282828] border border-[#383838] shadow-2xl py-2 z-50 text-sm overflow-hidden animate-in fade-in duration-100 max-h-[85vh] overflow-y-auto">
          {/* OpenRouter Group */}
          <div className="px-3 py-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap size={13} className="text-emerald-400" />
              OpenRouter (Active Free Models)
            </span>
            {hasOpenRouterKey ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 normal-case">
                Connected
              </span>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings('openrouter');
                }}
                className="text-[11px] text-emerald-400 hover:underline normal-case"
              >
                Set Key
              </button>
            )}
          </div>

          <div className="space-y-0.5 px-1.5">
            {openrouterModels.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected ? 'bg-[#343434] text-white' : 'hover:bg-[#303030] text-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    {model.supportsThinking ? (
                      <Brain size={16} className="text-purple-400" />
                    ) : (
                      <Zap size={16} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-200">{model.name}</span>
                      {model.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{model.description}</p>
                  </div>
                  {isSelected && <Check size={16} className="text-white mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-[#383838]" />

          {/* Gemini Group */}
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-400" />
              Google Gemini (Google AI Studio)
            </span>
            {!settings.geminiApiKey && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings('gemini');
                }}
                className="text-[11px] text-blue-400 hover:underline normal-case"
              >
                Set Key
              </button>
            )}
          </div>

          <div className="space-y-0.5 px-1.5">
            {geminiModels.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected ? 'bg-[#343434] text-white' : 'hover:bg-[#303030] text-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    {model.supportsThinking ? (
                      <Brain size={16} className="text-purple-400" />
                    ) : (
                      <Sparkles size={16} className="text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-200">{model.name}</span>
                      {model.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{model.description}</p>
                  </div>
                  {isSelected && <Check size={16} className="text-white mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-[#383838]" />

          {/* Meta AI Group */}
          <div className="px-3 py-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-400" />
              Meta AI (Llama & Muse)
            </span>
            {hasMetaKey ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50 normal-case">
                Connected
              </span>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings('meta');
                }}
                className="text-[11px] text-blue-400 hover:underline normal-case"
              >
                Set Key
              </button>
            )}
          </div>

          <div className="space-y-0.5 px-1.5">
            {metaModels.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected ? 'bg-[#343434] text-white' : 'hover:bg-[#303030] text-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    <Sparkles size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-200">{model.name}</span>
                      {model.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{model.description}</p>
                  </div>
                  {isSelected && <Check size={16} className="text-white mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-[#383838]" />

          {/* GitHub Copilot Group */}
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GithubIcon size={13} className="text-purple-400" />
              GitHub Copilot
            </span>
            {hasCopilotAuth ? (
              <span className="text-[11px] text-green-400 font-normal normal-case">Connected</span>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenCopilotAuth();
                }}
                className="text-[11px] text-purple-400 hover:underline normal-case"
              >
                Sign In
              </button>
            )}
          </div>

          <div className="space-y-0.5 px-1.5">
            {copilotModels.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    if (!hasCopilotAuth) {
                      setIsOpen(false);
                      onOpenCopilotAuth();
                      return;
                    }
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected ? 'bg-[#343434] text-white' : 'hover:bg-[#303030] text-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    {model.supportsThinking ? (
                      <Brain size={16} className="text-purple-400" />
                    ) : (
                      <GithubIcon size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-200">{model.name}</span>
                      {model.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{model.description}</p>
                  </div>
                  {isSelected && <Check size={16} className="text-white mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Copilot Sign In Banner if not connected */}
          {!hasCopilotAuth && (
            <div className="mx-2 mt-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs">
              <div className="flex items-center gap-2 text-purple-300 font-medium">
                <GithubIcon size={14} />
                <span>Sign in with GitHub Copilot</span>
              </div>
              <p className="text-gray-400 mt-1 text-[11px]">
                Authenticate your GitHub account to access GPT-4o, Claude 3.5 Sonnet, and o3-mini.
              </p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenCopilotAuth();
                }}
                className="mt-2 w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                Connect GitHub Copilot
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
