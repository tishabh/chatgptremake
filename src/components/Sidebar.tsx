import React, { useState, useMemo } from 'react';
import {
  PenSquare,
  PanelLeftClose,
  Search,
  MoreHorizontal,
  Trash2,
  Edit3,
  Check,
  X,
  Compass,
  Settings as SettingsIcon,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import type { Conversation, UserSettings } from '../types/chat';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  settings: UserSettings;
  onOpenSettings: (tab?: string) => void;
  onOpenCopilotAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  settings,
  onOpenSettings,
  onOpenCopilotAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Group by date
  const groupedConversations = useMemo(() => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const past7Days: Conversation[] = [];
    const older: Conversation[] = [];

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    filteredConversations.forEach((conv) => {
      const diff = now - conv.updatedAt;
      if (diff < oneDay) {
        today.push(conv);
      } else if (diff < 2 * oneDay) {
        yesterday.push(conv);
      } else if (diff < 7 * oneDay) {
        past7Days.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, past7Days, older };
  }, [filteredConversations]);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setMenuOpenId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar container */}
      <aside className="fixed md:static inset-y-0 left-0 w-64 md:w-64 bg-[#171717] flex flex-col z-40 border-r border-[#242424] select-none transition-all">
        {/* Top Header */}
        <div className="p-3 flex items-center justify-between border-b border-[#242424]">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-200 hover:bg-[#212121] transition-colors"
          >
            <PenSquare size={16} />
            <span>New chat</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#212121] transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#212121] text-xs text-gray-400 border border-[#2e2e2e] focus-within:border-gray-500">
            <Search size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="bg-transparent text-gray-200 outline-none w-full text-xs placeholder-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Explore GPTs Shortcut */}
        <div className="px-3 py-1">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-[#212121] transition-colors"
          >
            <Compass size={15} className="text-gray-400" />
            <span>Explore GPTs</span>
          </button>
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              {searchQuery ? 'No chats found' : 'No chats yet. Start a new one!'}
            </div>
          ) : (
            <>
              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-gray-500">Today</div>
                  <div className="space-y-0.5">
                    {groupedConversations.today.map((conv) => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {/* Yesterday */}
              {groupedConversations.yesterday.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-gray-500">Yesterday</div>
                  <div className="space-y-0.5">
                    {groupedConversations.yesterday.map((conv) => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {/* Past 7 Days */}
              {groupedConversations.past7Days.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-gray-500">Previous 7 Days</div>
                  <div className="space-y-0.5">
                    {groupedConversations.past7Days.map((conv) => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {/* Older */}
              {groupedConversations.older.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-gray-500">Older</div>
                  <div className="space-y-0.5">
                    {groupedConversations.older.map((conv) => renderConvItem(conv))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Profile / Account Area */}
        <div className="p-3 border-t border-[#242424] space-y-1">
          {/* GitHub Copilot status banner */}
          {settings.copilotToken || settings.githubToken ? (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs text-purple-300">
              <GithubIcon size={16} />
              <div className="flex-1 truncate">
                <span className="font-semibold block truncate">
                  {settings.copilotUser?.login ? `@${settings.copilotUser.login}` : 'Copilot Active'}
                </span>
                <span className="text-[10px] text-gray-400">GPT-4o & Claude ready</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenCopilotAuth}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#212121] hover:bg-[#282828] border border-[#2e2e2e] text-xs text-gray-200 transition-colors text-left"
            >
              <GithubIcon size={16} className="text-purple-400" />
              <div className="flex-1">
                <span className="font-medium block">Connect Copilot</span>
                <span className="text-[10px] text-gray-400">Unlock GPT-4o & Claude</span>
              </div>
            </button>
          )}

          {/* User profile & Settings */}
          <button
            onClick={() => onOpenSettings()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-[#212121] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                {settings.copilotUser?.login ? settings.copilotUser.login.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <span className="font-medium truncate max-w-[120px]">
                {settings.copilotUser?.name || settings.copilotUser?.login || 'Settings'}
              </span>
            </div>
            <SettingsIcon size={16} className="text-gray-400" />
          </button>
        </div>
      </aside>
    </>
  );

  function renderConvItem(conv: Conversation) {
    const isActive = conv.id === activeConversationId;
    const isEditing = conv.id === editingId;
    const isMenuOpen = conv.id === menuOpenId;

    if (isEditing) {
      return (
        <div key={conv.id} className="flex items-center gap-1 px-2 py-1.5 bg-[#212121] rounded-lg">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename(conv.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
            autoFocus
            className="flex-1 bg-transparent text-xs text-white outline-none"
          />
          <button
            onClick={() => saveRename(conv.id)}
            className="p-1 text-green-400 hover:text-green-300"
          >
            <Check size={13} />
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      );
    }

    return (
      <div
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
          isActive
            ? 'bg-[#212121] text-white font-medium'
            : 'text-gray-300 hover:bg-[#212121] hover:text-white'
        }`}
      >
        <span className="truncate flex-1 pr-2">{conv.title || 'New chat'}</span>

        {/* Hover / Active action menu */}
        <div className={`relative ${isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenId(isMenuOpen ? null : conv.id);
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#303030]"
          >
            <MoreHorizontal size={14} />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-6 w-32 rounded-xl bg-[#282828] border border-[#383838] shadow-xl py-1 z-50 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => startRename(conv, e)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:bg-[#343434] hover:text-white"
              >
                <Edit3 size={13} />
                <span>Rename</span>
              </button>
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-[#343434] hover:text-red-300"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
};
