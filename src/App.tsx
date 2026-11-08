import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { CopilotAuthModal } from './components/CopilotAuthModal';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { geminiService } from './services/geminiService';
import { copilotService } from './services/copilotService';
import { openrouterService } from './services/openrouterService';
import { metaService } from './services/metaService';
import {
  Conversation,
  Message,
  UserSettings,
  AVAILABLE_MODELS,
  Attachment,
} from './types/chat';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(() => storageService.getSettings());
  const [conversations, setConversations] = useState<Conversation[]>(() => storageService.getConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() =>
    storageService.getActiveConversationId()
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState('gemini');
  const [copilotAuthModalOpen, setCopilotAuthModalOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Save settings
  const handleUpdateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      storageService.saveSettings(next);
      return next;
    });
  };

  // Save conversations
  const updateConversations = (newConvs: Conversation[]) => {
    setConversations(newConvs);
    storageService.saveConversations(newConvs);
  };

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const selectedModel = useMemo(() => {
    return AVAILABLE_MODELS.find((m) => m.id === settings.selectedModelId) || AVAILABLE_MODELS[0];
  }, [settings.selectedModelId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(null);
    storageService.saveActiveConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(id);
    storageService.saveActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    updateConversations(updated);
    if (activeConversationId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveConversationId(nextId);
      storageService.saveActiveConversationId(nextId);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    );
    updateConversations(updated);
  };

  const handleClearAllChats = () => {
    updateConversations([]);
    setActiveConversationId(null);
    storageService.saveActiveConversationId(null);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    // Turn off isStreaming flag on active message
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          const updatedMessages = c.messages.map((m) => ({ ...m, isStreaming: false }));
          return { ...c, messages: updatedMessages };
        })
      );
    }
  };

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (isStreaming) return;

    // Check prerequisites for current model
    if (selectedModel.provider === 'openrouter' && !settings.openrouterApiKey) {
      setSettingsDefaultTab('openrouter');
      setSettingsModalOpen(true);
      return;
    }

    if (selectedModel.provider === 'gemini' && !settings.geminiApiKey) {
      setSettingsDefaultTab('gemini');
      setSettingsModalOpen(true);
      return;
    }

    if (
      selectedModel.provider === 'copilot' &&
      !settings.copilotToken &&
      !settings.githubToken
    ) {
      setCopilotAuthModalOpen(true);
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text,
      attachments,
      createdAt: Date.now(),
    };

    let convId = activeConversationId;
    let currentConv = conversations.find((c) => c.id === convId);

    // If starting a fresh conversation
    if (!convId || !currentConv) {
      convId = Math.random().toString(36).substring(2, 9);
      // Auto-generate title from first 6 words of user message
      const title = text.split(' ').slice(0, 6).join(' ') || 'New Chat';
      currentConv = {
        id: convId,
        title: title.length > 30 ? title.substring(0, 30) + '...' : title,
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: selectedModel.id,
      };
      setActiveConversationId(convId);
      storageService.saveActiveConversationId(convId);
      updateConversations([currentConv, ...conversations]);
    } else {
      currentConv = {
        ...currentConv,
        messages: [...currentConv.messages, userMessage],
        updatedAt: Date.now(),
      };
      updateConversations(
        conversations.map((c) => (c.id === convId ? currentConv! : c))
      );
    }

    // Prepare assistant message
    const assistantMessageId = Math.random().toString(36).substring(2, 9);
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      thought: '',
      model: selectedModel.name,
      createdAt: Date.now(),
      isStreaming: true,
    };

    const messagesWithAssistant = [...currentConv.messages, initialAssistantMessage];
    const targetConvId = convId;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetConvId ? { ...c, messages: messagesWithAssistant } : c
      )
    );

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedContent = '';
    let accumulatedThought = '';
    let rafId: number | null = null;

    const flushUI = (isDone = false) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const updated = c.messages.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: accumulatedContent,
                  thought: accumulatedThought || undefined,
                  isStreaming: !isDone,
                }
              : m
          );
          return { ...c, messages: updated };
        })
      );
    };

    const scheduleUIUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        flushUI(false);
      });
    };

    // Clean previous error notifications from context
    const cleanHistory = currentConv.messages.filter(
      (m) => m.content && !m.content.startsWith('⚠️')
    );

    try {
      if (selectedModel.provider === 'openrouter') {
        await openrouterService.streamChat({
          apiKey: settings.openrouterApiKey,
          model: selectedModel.id,
          messages: cleanHistory,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          signal: controller.signal,
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            scheduleUIUpdate();
          },
          onThought: (thoughtChunk) => {
            accumulatedThought += thoughtChunk;
            scheduleUIUpdate();
          },
        });
      } else if (selectedModel.provider === 'gemini') {
        await geminiService.streamChat({
          apiKey: settings.geminiApiKey,
          model: selectedModel.id,
          messages: cleanHistory,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          signal: controller.signal,
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            scheduleUIUpdate();
          },
          onThought: (thoughtChunk) => {
            accumulatedThought += thoughtChunk;
            scheduleUIUpdate();
          },
        });
      } else if (selectedModel.provider === 'meta') {
        await metaService.streamChat({
          apiKey: settings.metaApiKey,
          model: selectedModel.id,
          messages: cleanHistory,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          signal: controller.signal,
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            scheduleUIUpdate();
          },
        });
      } else {
        // GitHub Copilot
        await copilotService.streamChat({
          copilotToken: settings.copilotToken,
          githubToken: settings.githubToken,
          model: selectedModel.id,
          messages: cleanHistory,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          signal: controller.signal,
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            scheduleUIUpdate();
          },
          onThought: (thoughtChunk) => {
            accumulatedThought += thoughtChunk;
            scheduleUIUpdate();
          },
        });
      }
    } catch (error: any) {
      if (!controller.signal.aborted) {
        console.error('Generation error:', error);
        const errMsg = error.message || 'An error occurred during generation.';
        accumulatedContent = accumulatedContent
          ? `${accumulatedContent}\n\n⚠️ *Generation interrupted: ${errMsg}*`
          : `⚠️ **Error:** ${errMsg}`;
      }
    } finally {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsStreaming(false);
      abortControllerRef.current = null;

      // Finalize message state & persist to storage
      setConversations((prev) => {
        const finalized = prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const updated = c.messages.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    accumulatedContent ||
                    '⚠️ No response received from model. Please verify your Gemini API key in Settings.',
                  thought: accumulatedThought || undefined,
                  isStreaming: false,
                }
              : m
          );
          return { ...c, messages: updated, updatedAt: Date.now() };
        });
        storageService.saveConversations(finalized);
        return finalized;
      });
    }
  };

  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0 || isStreaming) return;
    const messages = [...activeConversation.messages];
    // Remove last assistant message
    if (messages[messages.length - 1].role === 'assistant') {
      messages.pop();
    }
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const content = lastUserMessage.content;
      const attachments = lastUserMessage.attachments || [];
      // Remove last user message as well because handleSendMessage re-adds it
      const remaining = messages.slice(0, -1);
      const updatedConv = { ...activeConversation, messages: remaining };
      updateConversations(
        conversations.map((c) => (c.id === activeConversation.id ? updatedConv : c))
      );
      handleSendMessage(content, attachments);
    }
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversation || isStreaming) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Truncate to this message
    const previousMessages = activeConversation.messages.slice(0, msgIndex);
    const targetMsg = activeConversation.messages[msgIndex];

    const updatedConv = { ...activeConversation, messages: previousMessages };
    updateConversations(
      conversations.map((c) => (c.id === activeConversation.id ? updatedConv : c))
    );

    handleSendMessage(newContent, targetMsg.attachments || []);
  };

  const handleShareChat = async () => {
    if (!activeConversation || activeConversation.messages.length === 0) {
      alert('Cannot share an empty chat.');
      return;
    }

    // Format chat into markdown
    const md = activeConversation.messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? 'User' : m.model || 'Assistant'}\n\n${m.content}\n\n---\n`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(md);
      alert('Chat transcript copied to clipboard as Markdown!');
    } catch {
      alert('Could not copy to clipboard.');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#212121] text-[#ececec]">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        settings={settings}
        onOpenSettings={(tab) => {
          setSettingsDefaultTab(tab || 'general');
          setSettingsModalOpen(true);
        }}
        onOpenCopilotAuth={() => setCopilotAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          selectedModelId={settings.selectedModelId}
          onSelectModel={(modelId) => handleUpdateSettings({ selectedModelId: modelId })}
          settings={settings}
          onOpenSettings={(tab) => {
            setSettingsDefaultTab(tab || 'gemini');
            setSettingsModalOpen(true);
          }}
          onOpenCopilotAuth={() => setCopilotAuthModalOpen(true)}
          onShareChat={handleShareChat}
        />

        {/* Chat Message Scroll Area */}
        <ChatArea
          conversation={activeConversation}
          onSendMessage={(text) => handleSendMessage(text)}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          selectedModelName={selectedModel.name}
        />

        {/* Floating Bottom Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          selectedModelId={settings.selectedModelId}
          onModelSelect={(modelId) => handleUpdateSettings({ selectedModelId: modelId })}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClearAllChats={handleClearAllChats}
        onOpenCopilotAuth={() => {
          setSettingsModalOpen(false);
          setCopilotAuthModalOpen(true);
        }}
        defaultTab={settingsDefaultTab}
      />

      {/* GitHub Copilot Device Auth Modal */}
      <CopilotAuthModal
        isOpen={copilotAuthModalOpen}
        onClose={() => setCopilotAuthModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
};

export default App;
