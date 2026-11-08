import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Square,
  Mic,
  MicOff,
  Globe,
  Brain,
  X,
  Image,
  FileText,
} from 'lucide-react';
import { Attachment } from '../types/chat';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  selectedModelId,
  onModelSelect,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useReasoning, setUseReasoning] = useState(selectedModelId.includes('thinking') || selectedModelId.includes('o3') || selectedModelId.includes('o1'));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync reasoning toggle with selected model
  useEffect(() => {
    setUseReasoning(selectedModelId.includes('thinking') || selectedModelId.includes('o3') || selectedModelId.includes('o1'));
  }, [selectedModelId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [text]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => prev + ' ' + transcript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: file.type || 'text/plain',
          url: URL.createObjectURL(file),
          base64,
          size: file.size,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    let finalPrompt = trimmed;
    if (useSearch) {
      finalPrompt = `[Web Search Requested] ${finalPrompt}`;
    }

    onSendMessage(finalPrompt, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleReasoning = () => {
    if (!useReasoning) {
      setUseReasoning(true);
      // Switch to Copilot reasoning if Copilot is active, otherwise Gemini 3.8 Flash handles reasoning
      if (selectedModelId.startsWith('gpt-4o')) {
        onModelSelect('o3-mini');
      }
    } else {
      setUseReasoning(false);
      if (selectedModelId === 'o3-mini' || selectedModelId === 'o1') {
        onModelSelect('gpt-4o');
      } else {
        onModelSelect('gemini-3.8-flash');
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Container Box */}
      <div className="relative rounded-3xl bg-[#2f2f2f] border border-[#3e3e3e] shadow-lg transition-all focus-within:border-gray-500">
        {/* Attachment preview pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1 border-b border-[#3e3e3e]">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-[#212121] rounded-lg border border-[#444] text-xs text-gray-200"
              >
                {att.type.startsWith('image/') ? (
                  <Image size={14} className="text-blue-400" />
                ) : (
                  <FileText size={14} className="text-amber-400" />
                )}
                <span className="max-w-[120px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Input */}
        <div className="px-4 pt-3.5 pb-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="w-full bg-transparent text-[#ececec] placeholder-gray-400 resize-none outline-none text-[15px] leading-relaxed max-h-[200px]"
          />
        </div>

        {/* Bottom Toolbar inside input */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left tools (Attachment, Web search pill, Reason pill) */}
          <div className="flex items-center gap-1.5">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
              accept="image/*,text/*,.pdf,.py,.js,.ts,.tsx,.json,.csv,.md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#3e3e3e] transition-colors"
              title="Attach files or images"
            >
              <Paperclip size={18} />
            </button>

            {/* Web Search Toggle Pill */}
            <button
              type="button"
              onClick={() => setUseSearch(!useSearch)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                useSearch
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                  : 'text-gray-400 border-[#444] hover:text-gray-200 hover:border-gray-500'
              }`}
              title="Search the web"
            >
              <Globe size={13} />
              <span>Search</span>
            </button>

            {/* Reason / Deep Think Toggle Pill */}
            <button
              type="button"
              onClick={toggleReasoning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                useReasoning
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'text-gray-400 border-[#444] hover:text-gray-200 hover:border-gray-500'
              }`}
              title="Reasoning / Deep Thinking"
            >
              <Brain size={13} />
              <span>Reason</span>
            </button>
          </div>

          {/* Right tools (Voice Mic, Send/Stop) */}
          <div className="flex items-center gap-2">
            {/* Voice Dictation */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-400 hover:text-white hover:bg-[#3e3e3e]'
              }`}
              title={isRecording ? 'Stop listening' : 'Voice input'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Send or Stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:opacity-90 transition-opacity"
                title="Stop generating"
              >
                <Square size={14} className="fill-black" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!text.trim() && attachments.length === 0}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  text.trim() || attachments.length > 0
                    ? 'bg-white text-black hover:opacity-90 shadow'
                    : 'bg-[#424242] text-gray-500 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center mt-2 text-[11px] text-gray-400">
        ChatGPT can make mistakes. Verify important information. Powered by Gemini Free API & GitHub Copilot.
      </div>
    </div>
  );
};
