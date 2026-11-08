import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronRight,
  Brain,
  Edit2,
  Sparkles,
  User as UserIcon,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Message } from '../types/chat';
import { CodeBlock } from './CodeBlock';

interface MessageItemProps {
  message: Message;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(({
  message,
  isLastAssistant,
  onRegenerate,
  onEdit,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showThought, setShowThought] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  // Auto-expand thought if it is streaming and content hasn't started yet
  useEffect(() => {
    if (message.isStreaming && message.thought && !message.content) {
      setShowThought(true);
    }
  }, [message.isStreaming, !!message.thought, !!message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const isErrorMessage = !isUser && message.content && message.content.startsWith('⚠️');

  return (
    <div className={`w-full py-4 px-4 md:px-6 transition-colors ${isUser ? '' : 'bg-transparent'}`}>
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-purple-600/80 text-white flex items-center justify-center font-medium shadow-sm">
              <UserIcon size={16} />
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-sm ${
              isErrorMessage ? 'bg-amber-600' : 'bg-[#10a37f]'
            }`}>
              {isErrorMessage ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
            </div>
          )}
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0">
          {/* Header info for assistant */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-gray-200">
                {message.model ? message.model : 'ChatGPT'}
              </span>
              {message.isStreaming && (
                <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  Generating...
                </span>
              )}
            </div>
          )}

          {/* User message edit state */}
          {isUser && isEditing ? (
            <div className="w-full bg-[#2f2f2f] rounded-2xl p-3 border border-gray-600">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent text-white resize-none outline-none text-sm min-h-[60px]"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs rounded-full text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs rounded-full bg-white text-black font-medium hover:bg-gray-200"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Attachments Preview */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {message.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 p-1.5 bg-[#2f2f2f] rounded-lg border border-[#3e3e3e] max-w-[200px]"
                    >
                      {att.type.startsWith('image/') ? (
                        <img
                          src={att.url || att.base64}
                          alt={att.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                          FILE
                        </div>
                      )}
                      <span className="text-xs truncate text-gray-300">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reasoning / Thinking Accordion */}
              {message.thought && (
                <div className="mb-3 rounded-xl border border-purple-900/40 bg-[#191522] overflow-hidden text-sm">
                  <button
                    onClick={() => setShowThought(!showThought)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-purple-300 hover:bg-purple-950/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Brain size={14} className={message.isStreaming && !message.content ? 'animate-spin text-purple-400' : 'text-purple-400'} />
                      <span className="font-medium">
                        {message.isStreaming && !message.content
                          ? 'Thinking process in progress...'
                          : showThought
                          ? 'Hide Thinking Process'
                          : 'Thought Process (Reasoning)'}
                      </span>
                    </div>
                    {showThought ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {showThought && (
                    <div className="px-4 py-3 border-t border-purple-900/30 bg-[#13101b] text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                      {message.thought}
                    </div>
                  )}
                </div>
              )}

              {/* Live Loading / Waiting Indicator before first token */}
              {!isUser && message.isStreaming && !message.content && !message.thought && (
                <div className="flex flex-col gap-1 py-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2.5">
                    <Loader2 size={15} className="animate-spin text-green-400" />
                    <span>Connecting to {message.model || 'model'} and starting stream...</span>
                  </div>
                </div>
              )}

              {/* Message Content */}
              {isUser ? (
                <div className="inline-block bg-[#2f2f2f] text-[#ececec] rounded-2xl px-4 py-2.5 max-w-full whitespace-pre-wrap text-[15px] leading-relaxed">
                  {message.content}
                </div>
              ) : isErrorMessage ? (
                <div className="p-3.5 my-2 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 leading-relaxed flex flex-col gap-2">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle size={15} />
                    <span>Connection Notice</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans">{message.content.replace(/^⚠️\s*\*?/, '')}</div>
                  <div className="text-[11px] text-gray-400 border-t border-amber-900/40 pt-2">
                    💡 Check that your Gemini API key in <strong>Settings</strong> is valid, or sign in with <strong>GitHub Copilot</strong>.
                  </div>
                </div>
              ) : message.content ? (
                <div className="prose-chatgpt text-[15px] leading-relaxed text-[#ececec]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');

                        if (isInline) {
                          return (
                            <code className="bg-[#2f2f2f] text-[#ececec] px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                              {children}
                            </code>
                          );
                        }

                        return (
                          <CodeBlock
                            language={match ? match[1] : 'text'}
                            value={String(children).replace(/\n$/, '')}
                          />
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>

                  {/* Blinking streaming cursor */}
                  {message.isStreaming && <span className="streaming-cursor" />}
                </div>
              ) : null}
            </>
          )}

          {/* Action Toolbar */}
          {!message.isStreaming && (
            <div className="flex items-center gap-2 mt-2 text-gray-400">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors"
                title="Copy"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>

              {/* Read aloud */}
              {!isUser && message.content && !isErrorMessage && (
                <button
                  onClick={handleSpeech}
                  className={`p-1 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors ${
                    isSpeaking ? 'text-green-400' : ''
                  }`}
                  title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              )}

              {/* Thumbs up / down */}
              {!isUser && message.content && !isErrorMessage && (
                <>
                  <button
                    onClick={() => setLiked(liked === true ? null : true)}
                    className={`p-1 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors ${
                      liked === true ? 'text-green-400' : ''
                    }`}
                    title="Good response"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    onClick={() => setLiked(liked === false ? null : false)}
                    className={`p-1 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors ${
                      liked === false ? 'text-red-400' : ''
                    }`}
                    title="Bad response"
                  >
                    <ThumbsDown size={14} />
                  </button>
                </>
              )}

              {/* Regenerate for last assistant message */}
              {!isUser && isLastAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors"
                  title="Regenerate"
                >
                  <RotateCw size={14} />
                </button>
              )}

              {/* Edit button for user message */}
              {isUser && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors"
                  title="Edit message"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
