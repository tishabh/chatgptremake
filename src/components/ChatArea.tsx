import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  Code2,
  Lightbulb,
  FileText,
  Compass,
  ArrowDown,
} from 'lucide-react';
import { Message, Conversation } from '../types/chat';
import { MessageItem } from './MessageItem';

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  selectedModelName: string;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: Code2,
    title: 'Code a project',
    subtitle: 'Write a full-stack web application in React & Node.js',
    prompt: 'Write a full-stack web application in React and Node.js with complete code and explanations.',
  },
  {
    icon: Lightbulb,
    title: 'Brainstorm ideas',
    subtitle: 'Innovative startup concepts for AI workflows',
    prompt: 'Brainstorm 5 innovative startup concepts for developer AI workflows with monetization strategies.',
  },
  {
    icon: FileText,
    title: 'Summarize or explain',
    subtitle: 'Explain quantum computing in simple terms',
    prompt: 'Explain quantum computing and quantum superposition in simple terms that anyone can understand.',
  },
  {
    icon: Compass,
    title: 'Plan & Design',
    subtitle: 'Create a 30-day learning roadmap for machine learning',
    prompt: 'Create a comprehensive 30-day learning roadmap to master machine learning and LLM engineering.',
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onSendMessage,
  onRegenerate,
  onEditMessage,
  selectedModelName,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messages = conversation?.messages || [];

  // Handle auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messages[messages.length - 1]?.content, messages[messages.length - 1]?.thought]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  if (!conversation || messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col justify-center items-center px-4 py-8">
        <div className="max-w-2xl w-full flex flex-col items-center text-center">
          {/* ChatGPT Icon */}
          <div className="w-14 h-14 rounded-full bg-[#10a37f] text-white flex items-center justify-center mb-5 shadow-lg">
            <Sparkles size={28} />
          </div>

          <h1 className="text-3xl font-semibold text-gray-100 mb-2">
            What can I help with today?
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Select a prompt below or start typing. Powered by {selectedModelName}.
          </p>

          {/* Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {PROMPT_SUGGESTIONS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSendMessage(item.prompt)}
                  className="p-4 rounded-2xl bg-[#282828] hover:bg-[#303030] border border-[#383838] text-left transition-all hover:scale-[1.01] flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2 text-gray-300 font-medium text-sm">
                    <Icon size={16} className="text-gray-400" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{item.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const lastAssistantIndex = [...messages]
    .map((m, i) => (m.role === 'assistant' ? i : -1))
    .filter((i) => i !== -1)
    .pop();

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto relative scroll-smooth"
    >
      <div className="pb-8 pt-4">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            isLastAssistant={index === lastAssistantIndex}
            onRegenerate={onRegenerate}
            onEdit={(newContent) => onEditMessage(message.id, newContent)}
          />
        ))}
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 right-8 z-30 p-2.5 rounded-full bg-[#2f2f2f] hover:bg-[#3e3e3e] border border-[#444] text-white shadow-xl transition-all"
          title="Scroll to bottom"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
};
