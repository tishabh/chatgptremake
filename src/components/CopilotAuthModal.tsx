import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { copilotService } from '../services/copilotService';
import type { CopilotDeviceAuthResponse, UserSettings } from '../types/chat';

interface CopilotAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onSuccess?: () => void;
}

export const CopilotAuthModal: React.FC<CopilotAuthModalProps> = ({
  isOpen,
  onClose,
  onUpdateSettings,
  onSuccess,
}) => {
  const [deviceData, setDeviceData] = useState<CopilotDeviceAuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [pollStatus, setPollStatus] = useState<'idle' | 'polling' | 'success' | 'expired'>('idle');
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  const pollTimerRef = useRef<any>(null);

  // Start device flow when modal opens
  useEffect(() => {
    if (isOpen) {
      startAuth();
    } else {
      cleanupPoll();
    }
    return () => cleanupPoll();
  }, [isOpen]);

  const cleanupPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const startAuth = async () => {
    setLoading(true);
    setError(null);
    setPollStatus('idle');
    cleanupPoll();

    try {
      const data = await copilotService.startDeviceAuth();
      setDeviceData(data);
      setPollStatus('polling');
      startPolling(data.device_code, data.interval || 5);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start GitHub authorization');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (deviceCode: string, intervalSec: number) => {
    cleanupPoll();
    pollTimerRef.current = setInterval(async () => {
      try {
        const result = await copilotService.pollDeviceAuth(deviceCode);
        if (result.status === 'success') {
          cleanupPoll();
          setPollStatus('success');
          onUpdateSettings({
            githubToken: result.githubToken,
            copilotToken: result.copilotToken,
            copilotExpiresAt: result.expiresAt,
            copilotUser: result.user,
            selectedModelId: 'gpt-4o', // switch to flagship Copilot model
          });
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onClose();
          }, 1500);
        } else if (result.status === 'expired_token') {
          cleanupPoll();
          setPollStatus('expired');
          setError('Authorization code expired. Please click Restart to try again.');
        } else if (result.status === 'access_denied') {
          cleanupPoll();
          setError('Authorization was cancelled on GitHub.');
        }
      } catch (e: any) {
        console.warn('Poll error:', e);
      }
    }, (intervalSec + 1) * 1000);
  };

  const handleCopyCode = async () => {
    if (!deviceData?.user_code) return;
    try {
      await navigator.clipboard.writeText(deviceData.user_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenGitHub = async () => {
    handleCopyCode();
    window.open(deviceData?.verification_uri || 'https://github.com/login/device', '_blank');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setManualLoading(true);
    setError(null);
    try {
      const result = await copilotService.exchangeToken(manualToken.trim());
      onUpdateSettings({
        githubToken: manualToken.trim(),
        copilotToken: result.copilotToken,
        copilotExpiresAt: result.expiresAt,
        copilotUser: result.user,
        selectedModelId: 'gpt-4o',
      });
      setPollStatus('success');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid token or no active GitHub Copilot subscription.');
    } finally {
      setManualLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#212121] border border-[#383838] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#303030]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <GithubIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Sign In with GitHub Copilot</h2>
              <p className="text-xs text-gray-400">Unlock GPT-4o, Claude 3.5 Sonnet & o3-mini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d2d2d] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {pollStatus === 'success' ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-3 border border-green-500/30">
                <Check size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white">Connected Successfully!</h3>
              <p className="text-xs text-gray-400 mt-1">
                Your GitHub Copilot subscription is active. Switching model to GPT-4o...
              </p>
            </div>
          ) : showManualInput ? (
            /* Manual Token Form */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="text-xs text-gray-400 leading-relaxed">
                Paste your GitHub Personal Access Token (PAT) or Copilot token (<code className="text-purple-300">ghu_...</code> or <code className="text-purple-300">ghp_...</code>) with Copilot subscription enabled.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  GitHub Token
                </label>
                <input
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="ghu_... or ghp_..."
                  className="w-full bg-[#181818] border border-[#383838] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-900/30 border border-red-800 text-xs text-red-300">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#3e3e3e] text-xs text-gray-300 hover:bg-[#2d2d2d]"
                >
                  Back to Device Code
                </button>
                <button
                  type="submit"
                  disabled={manualLoading || !manualToken.trim()}
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
                >
                  {manualLoading ? 'Verifying...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          ) : (
            /* Device Flow UI */
            <div className="space-y-5">
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-400 flex flex-col items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                  <span>Requesting device code from GitHub...</span>
                </div>
              ) : error ? (
                <div className="py-4 space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-xs text-red-300">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={startAuth}
                    className="w-full py-2 bg-[#2d2d2d] hover:bg-[#383838] text-white text-xs font-medium rounded-xl transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : deviceData ? (
                <>
                  <div className="text-xs text-gray-300">
                    Follow these 2 simple steps to authenticate:
                  </div>

                  {/* Step 1: Code display */}
                  <div className="p-4 rounded-xl bg-[#171717] border border-[#333] flex flex-col items-center justify-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400">
                      Step 1: Your Device Code
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-mono font-bold tracking-widest text-purple-300 select-all">
                        {deviceData.user_code}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#333] text-gray-300 hover:text-white transition-colors"
                        title="Copy code"
                      >
                        {codeCopied ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                    {codeCopied && (
                      <span className="text-[11px] text-green-400">Copied to clipboard!</span>
                    )}
                  </div>

                  {/* Step 2: Open GitHub Link */}
                  <div className="space-y-2">
                    <button
                      onClick={handleOpenGitHub}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                      <span>Copy Code & Open GitHub</span>
                      <ExternalLink size={16} />
                    </button>
                    <p className="text-[11px] text-center text-gray-400">
                      Opens <code className="text-gray-300">github.com/login/device</code> in a new tab.
                    </p>
                  </div>

                  {/* Polling Spinner */}
                  <div className="flex items-center justify-center gap-2.5 pt-2 text-xs text-gray-400">
                    <Loader2 size={14} className="animate-spin text-purple-400" />
                    <span>Waiting for authorization on GitHub...</span>
                  </div>

                  {/* Switch to manual token */}
                  <div className="text-center pt-2 border-t border-[#2e2e2e]">
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="text-xs text-gray-400 hover:text-purple-300 underline"
                    >
                      Or enter GitHub Personal Access Token manually
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
