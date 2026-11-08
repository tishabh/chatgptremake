import React, { useState } from 'react';
import {
  X,
  Key,
  Sliders,
  Sparkles,
  ExternalLink,
  Check,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  LogOut,
  Zap,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import type { UserSettings } from '../types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearAllChats: () => void;
  onOpenCopilotAuth: () => void;
  defaultTab?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllChats,
  onOpenCopilotAuth,
  defaultTab = 'openrouter',
}) => {
  const [activeTab, setActiveTab] = useState<'openrouter' | 'gemini' | 'meta' | 'copilot' | 'general' | 'instructions'>(
    (defaultTab as any) || 'openrouter'
  );

  const [openrouterKey, setOpenrouterKey] = useState(settings.openrouterApiKey || '');
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [orTestStatus, setOrTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [orTestMessage, setOrTestMessage] = useState('');

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const [metaKey, setMetaKey] = useState(settings.metaApiKey || '');
  const [showMetaKey, setShowMetaKey] = useState(false);
  const [metaTestStatus, setMetaTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [metaTestMessage, setMetaTestMessage] = useState('');
  const [metaBillingUrl, setMetaBillingUrl] = useState<string | null>(null);

  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [theme, setTheme] = useState(settings.theme);

  if (!isOpen) return null;

  const handleSaveMetaKey = () => {
    onUpdateSettings({ metaApiKey: metaKey.trim() });
    setMetaTestStatus('success');
    setMetaTestMessage('Meta AI key saved!');
  };

  const handleTestMetaKey = async () => {
    const key = metaKey.trim();
    if (!key) {
      setMetaTestStatus('failed');
      setMetaTestMessage('Please enter a Meta key.');
      return;
    }
    setMetaTestStatus('testing');
    setMetaTestMessage('Connecting to Meta AI API...');
    setMetaBillingUrl(null);
    try {
      const res = await fetch('https://api.meta.ai/v1/models', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (res.ok) {
        const data = await res.json();
        const modelCount = data.data?.length || 0;

        const chatRes = await fetch('https://api.meta.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'muse-spark-1.3', messages: [{ role: 'user', content: 'hi' }] })
        });

        if (chatRes.status === 402) {
          const errData = await chatRes.json().catch(() => ({}));
          const billingMatch = errData.error?.message?.match(/https:\/\/dev\.meta\.ai\/billing\S*/);
          const billUrl = billingMatch ? billingMatch[0] : 'https://dev.meta.ai/billing/?team_id=1452826790383727';
          setMetaBillingUrl(billUrl);
          setMetaTestStatus('success');
          setMetaTestMessage(`Key Valid! Connected to Meta AI (${modelCount} models: Muse Spark, Muse Wonder, SAM 3.1). Billing verification required.`);
        } else if (chatRes.ok) {
          setMetaTestStatus('success');
          setMetaTestMessage(`Meta AI is fully active and ready! (${modelCount} models available)`);
        } else {
          setMetaTestStatus('success');
          setMetaTestMessage(`Key Authentic! Connected to Meta AI (${modelCount} models available).`);
        }
        onUpdateSettings({ metaApiKey: key });
      } else {
        const data = await res.json().catch(() => ({}));
        setMetaTestStatus('failed');
        setMetaTestMessage(data.error?.message || 'Invalid Meta API key');
      }
    } catch (e: any) {
      setMetaTestStatus('failed');
      setMetaTestMessage(e.message || 'Connection to Meta AI failed');
    }
  };

  const handleSaveOpenRouterKey = () => {
    onUpdateSettings({ openrouterApiKey: openrouterKey.trim() });
    setOrTestStatus('success');
    setOrTestMessage('OpenRouter key saved!');
  };

  const handleTestOpenRouterKey = async () => {
    const key = openrouterKey.trim();
    if (!key) {
      setOrTestStatus('failed');
      setOrTestMessage('Please enter an OpenRouter key.');
      return;
    }
    setOrTestStatus('testing');
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (res.ok) {
        const data = await res.json();
        setOrTestStatus('success');
        setOrTestMessage(`Connected to OpenRouter! (Label: ${data.data?.label || 'Active'})`);
        onUpdateSettings({ openrouterApiKey: key });
      } else {
        const data = await res.json().catch(() => ({}));
        setOrTestStatus('failed');
        setOrTestMessage(data.error?.message || 'Invalid OpenRouter API key');
      }
    } catch (e: any) {
      setOrTestStatus('failed');
      setOrTestMessage(e.message || 'Connection failed');
    }
  };

  const handleSaveGeminiKey = () => {
    onUpdateSettings({ geminiApiKey: geminiKey.trim() });
    setTestStatus('success');
    setTestMessage('Gemini key saved!');
  };

  const handleTestGeminiKey = async () => {
    const key = geminiKey.trim();
    if (!key) {
      setTestStatus('failed');
      setTestMessage('Please enter an API key first.');
      return;
    }

    if (key.startsWith('sk-or-')) {
      setTestStatus('failed');
      setTestMessage('This is an OpenRouter key (sk-or-v1-...), not a Google Gemini key! Please paste it in the OpenRouter tab.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      if (res.ok) {
        setTestStatus('success');
        setTestMessage('Gemini API key is valid and connected!');
        onUpdateSettings({ geminiApiKey: key });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestStatus('failed');
        setTestMessage(data.error?.message || 'Invalid API key or network error');
      }
    } catch (e: any) {
      setTestStatus('failed');
      setTestMessage(e.message || 'Connection failed');
    }
  };

  const handleDisconnectCopilot = () => {
    onUpdateSettings({
      githubToken: '',
      copilotToken: '',
      copilotExpiresAt: 0,
      copilotUser: null,
      selectedModelId: 'gemini-3.8-flash',
    });
  };

  const handleSaveInstructions = () => {
    onUpdateSettings({
      systemPrompt,
      temperature,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#212121] border border-[#383838] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#303030]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d2d2d] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Layout: Sidebar Tabs + Content */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Tabs Sidebar */}
          <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-[#303030] p-3 space-y-1 bg-[#1a1a1a]">
            <button
              onClick={() => setActiveTab('openrouter')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'openrouter'
                  ? 'bg-[#2b2b2b] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              <Zap size={15} className="text-emerald-400" />
              <span>OpenRouter (Free)</span>
            </button>

            <button
              onClick={() => setActiveTab('gemini')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'gemini'
                  ? 'bg-[#2b2b2b] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              <Key size={15} className="text-blue-400" />
              <span>Google Gemini API</span>
            </button>

            <button
              onClick={() => setActiveTab('meta')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'meta'
                  ? 'bg-[#2b2b2b] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              <Sparkles size={15} className="text-sky-400" />
              <span>Meta AI</span>
            </button>

            <button
              onClick={() => setActiveTab('copilot')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'copilot'
                  ? 'bg-[#2b2b2b] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              <GithubIcon size={15} className="text-purple-400" />
              <span>GitHub Copilot</span>
            </button>

            <button
              onClick={() => setActiveTab('instructions')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'instructions'
                  ? 'bg-[#2b2b2b] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              <Sliders size={15} className="text-emerald-400" />
              <span>Custom Instructions</span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'general'
                  ? 'bg-[#2b2b2b] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              <Sparkles size={15} className="text-gray-400" />
              <span>General & Data</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* OpenRouter Tab */}
            {activeTab === 'openrouter' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <Zap size={16} className="text-emerald-400" />
                    OpenRouter Free API Key
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    OpenRouter gives you 50 free requests per day on models like NVIDIA Nemotron 3.5 Lightning, Liquid LFM 2.5, and Google Gemma.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">
                    OpenRouter API Key (Format: sk-or-v1-...)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showOpenRouterKey ? 'text' : 'password'}
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-[#181818] border border-[#383838] rounded-xl pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                      className="absolute right-3 text-gray-400 hover:text-white"
                    >
                      {showOpenRouterKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Status or test message */}
                {orTestStatus !== 'idle' && (
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                      orTestStatus === 'success'
                        ? 'bg-emerald-900/30 border border-emerald-800 text-emerald-300'
                        : orTestStatus === 'failed'
                        ? 'bg-red-900/30 border border-red-800 text-red-300'
                        : 'bg-blue-900/30 border border-blue-800 text-blue-300'
                    }`}
                  >
                    {orTestStatus === 'success' && <Check size={14} />}
                    {orTestStatus === 'failed' && <AlertCircle size={14} />}
                    <span>{orTestMessage || 'Testing connection...'}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTestOpenRouterKey}
                    disabled={orTestStatus === 'testing' || !openrouterKey.trim()}
                    className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#383838] disabled:opacity-50 text-xs font-medium text-white rounded-xl transition-colors"
                  >
                    {orTestStatus === 'testing' ? 'Testing...' : 'Test & Save'}
                  </button>
                  <button
                    onClick={handleSaveOpenRouterKey}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-xl transition-colors"
                  >
                    Save Key
                  </button>
                </div>

                {/* OpenRouter Key Link Box */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-2">
                  <span className="font-semibold text-emerald-300 block">
                    Your OpenRouter Account
                  </span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Keys are created at openrouter.ai. You can view your usage and remaining requests anytime on their dashboard.
                  </p>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:underline font-medium text-xs pt-1"
                  >
                    <span>Manage Keys at OpenRouter.ai</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Gemini Tab */}
            {activeTab === 'gemini' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <Key size={16} className="text-blue-400" />
                    Google Gemini Free API Key
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Direct access to Google Gemini 2.5 Flash and 3.8 Flash. Requires an API key from Google AI Studio starting with <strong>AIzaSy...</strong>.
                  </p>
                </div>

                {/* Warning if user enters an OpenRouter key */}
                {geminiKey.startsWith('sk-or-') && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-200 flex flex-col gap-2">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                      <AlertCircle size={15} />
                      <span>This is an OpenRouter API key!</span>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Your key starts with <code>sk-or-v1-</code>. Google Gemini API keys start with <code>AIzaSy...</code>.
                    </p>
                    <button
                      onClick={() => {
                        setOpenrouterKey(geminiKey);
                        onUpdateSettings({ openrouterApiKey: geminiKey, geminiApiKey: '' });
                        setGeminiKey('');
                        setActiveTab('openrouter');
                      }}
                      className="w-fit px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-lg text-xs transition-colors"
                    >
                      Move to OpenRouter Tab
                    </button>
                  </div>
                )}

                {/* Warning if user enters a Meta key */}
                {geminiKey.startsWith('LLM_') && (
                  <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800 text-xs text-sky-200 flex flex-col gap-2">
                    <div className="font-semibold flex items-center gap-1.5 text-sky-300">
                      <AlertCircle size={15} />
                      <span>This is a Meta AI key!</span>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Your key starts with <code>LLM_</code>. That is a Meta Developer key, not a Google Gemini key.
                    </p>
                    <button
                      onClick={() => {
                        setMetaKey(geminiKey);
                        onUpdateSettings({ metaApiKey: geminiKey, geminiApiKey: '' });
                        setGeminiKey('');
                        setActiveTab('meta');
                      }}
                      className="w-fit px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition-colors"
                    >
                      Move to Meta AI Tab
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">
                    Your Google AI Studio API Key (Format: AIzaSy...)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#181818] border border-[#383838] rounded-xl pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 text-gray-400 hover:text-white"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Status or test message */}
                {testStatus !== 'idle' && (
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                      testStatus === 'success'
                        ? 'bg-green-900/30 border border-green-800 text-green-300'
                        : testStatus === 'failed'
                        ? 'bg-red-900/30 border border-red-800 text-red-300'
                        : 'bg-blue-900/30 border border-blue-800 text-blue-300'
                    }`}
                  >
                    {testStatus === 'success' && <Check size={14} />}
                    {testStatus === 'failed' && <AlertCircle size={14} />}
                    <span>{testMessage || 'Testing connection...'}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTestGeminiKey}
                    disabled={testStatus === 'testing' || !geminiKey.trim()}
                    className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#383838] disabled:opacity-50 text-xs font-medium text-white rounded-xl transition-colors"
                  >
                    {testStatus === 'testing' ? 'Testing...' : 'Test & Save'}
                  </button>
                  <button
                    onClick={handleSaveGeminiKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white rounded-xl transition-colors"
                  >
                    Save Key
                  </button>
                </div>

                {/* Free Key Link Box */}
                <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs space-y-2">
                  <span className="font-semibold text-blue-300 block">
                    How to get a 100% Free Google Gemini Key
                  </span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    1. Go to Google AI Studio.<br />
                    2. Click "Get API key" (Instant, no credit card required).<br />
                    3. Copy the key starting with <code>AIzaSy...</code> and paste it here!
                  </p>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:underline font-medium text-xs pt-1"
                  >
                    <span>Get Free Key at Google AI Studio</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Meta AI Tab */}
            {activeTab === 'meta' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <Sparkles size={16} className="text-sky-400" />
                    Meta AI Developer API
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Official Meta AI API integration supporting Muse Spark 1.3, Muse Wonder 1.0, and SAM 3.1.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">
                    Meta AI API Key (Format: LLM_...)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showMetaKey ? 'text' : 'password'}
                      value={metaKey}
                      onChange={(e) => setMetaKey(e.target.value)}
                      placeholder="LLM_..."
                      className="w-full bg-[#181818] border border-[#383838] rounded-xl pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-sky-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMetaKey(!showMetaKey)}
                      className="absolute right-3 text-gray-400 hover:text-white"
                    >
                      {showMetaKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Status or test message */}
                {metaTestStatus !== 'idle' && (
                  <div
                    className={`flex flex-col gap-2 p-3 rounded-lg text-xs ${
                      metaTestStatus === 'success'
                        ? 'bg-sky-950/30 border border-sky-800 text-sky-200'
                        : metaTestStatus === 'failed'
                        ? 'bg-red-900/30 border border-red-800 text-red-300'
                        : 'bg-blue-900/30 border border-blue-800 text-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {metaTestStatus === 'success' && <Check size={14} className="text-sky-400 shrink-0" />}
                      {metaTestStatus === 'failed' && <AlertCircle size={14} className="text-red-400 shrink-0" />}
                      <span>{metaTestMessage || 'Testing connection...'}</span>
                    </div>

                    {metaBillingUrl && (
                      <div className="pt-2 border-t border-sky-800/50 flex flex-col gap-1.5">
                        <span className="text-[11px] text-gray-300">
                          To enable chat completion on this key, your Meta team requires billing setup or free credit verification:
                        </span>
                        <a
                          href={metaBillingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg text-xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>Open Meta Developer Billing</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTestMetaKey}
                    disabled={metaTestStatus === 'testing' || !metaKey.trim()}
                    className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#383838] disabled:opacity-50 text-xs font-medium text-white rounded-xl transition-colors"
                  >
                    {metaTestStatus === 'testing' ? 'Testing...' : 'Test & Verify'}
                  </button>
                  <button
                    onClick={handleSaveMetaKey}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white rounded-xl transition-colors"
                  >
                    Save Key
                  </button>
                </div>

                {/* Meta AI Info Card */}
                <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-900/40 text-xs space-y-2">
                  <span className="font-semibold text-sky-300 block">
                    Meta AI Developer Portal
                  </span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Meta AI developer keys start with <code>LLM_</code>. They grant access to Meta's first-party Muse and SAM foundational AI systems.
                  </p>
                  <a
                    href="https://dev.meta.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-400 hover:underline font-medium text-xs pt-1"
                  >
                    <span>Visit dev.meta.ai</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Copilot Tab */}
            {activeTab === 'copilot' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <GithubIcon size={16} className="text-purple-400" />
                    GitHub Copilot Integration
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Sign in with your GitHub account to use Copilot-powered models including GPT-4o, Claude 3.5 Sonnet, and OpenAI o3-mini.
                  </p>
                </div>

                {settings.copilotToken || settings.githubToken ? (
                  <div className="p-4 rounded-xl bg-[#181818] border border-[#333] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                          <UserCheck size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {settings.copilotUser?.name || 'GitHub User'}
                          </div>
                          <div className="text-xs text-gray-400">
                            @{settings.copilotUser?.login || 'user'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800">
                        Active
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-400 border-t border-[#2e2e2e] pt-2">
                      Access to GitHub Copilot chat completions enabled.
                    </div>

                    <button
                      onClick={handleDisconnectCopilot}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30 rounded-lg border border-red-900/40 transition-colors"
                    >
                      <LogOut size={13} />
                      <span>Disconnect Copilot</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs space-y-2">
                      <span className="font-semibold text-purple-300 block">
                        Unlock Advanced Copilot Models
                      </span>
                      <p className="text-gray-400 text-[11px] leading-relaxed">
                        Authorize via standard GitHub Device Flow to chat with GPT-4o, Claude 3.5 Sonnet, and o3-mini directly inside this ChatGPT clone.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenCopilotAuth();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <GithubIcon size={16} />
                      <span>Sign In with GitHub Copilot</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Custom Instructions Tab */}
            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Custom System Instructions
                  </h3>
                  <p className="text-xs text-gray-400">
                    Provide instructions for how the AI should behave and format its answers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    System Prompt
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={5}
                    className="w-full bg-[#181818] border border-[#383838] rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-gray-500 leading-relaxed resize-none"
                    placeholder="E.g., You are a senior software architect..."
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                    <span>Creativity (Temperature): {temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <button
                  onClick={handleSaveInstructions}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded-xl transition-colors"
                >
                  Save Instructions
                </button>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">General Settings</h3>
                  <p className="text-xs text-gray-400">Manage appearance and saved data.</p>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['dark', 'light', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTheme(t);
                          onUpdateSettings({ theme: t });
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs capitalize transition-colors ${
                          theme === t
                            ? 'bg-[#333] border-white text-white font-medium'
                            : 'border-[#383838] text-gray-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear all chats */}
                <div className="pt-4 border-t border-[#303030]">
                  <label className="block text-xs font-medium text-red-400 mb-1">
                    Danger Zone
                  </label>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all chat history?')) {
                        onClearAllChats();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/20 border border-red-900/40 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete All Chats</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
