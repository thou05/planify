'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Users,
  ShieldAlert,
  ListTodo,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BoardCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle?: string;
  onOpenCard?: (cardId: string) => void;
}

const QUICK_PROMPTS = [
  {
    icon: <Clock className="w-3.5 h-3.5 text-rose-500" />,
    label: 'Thẻ nào sắp trễ hoặc quá hạn?',
    prompt: 'Những thẻ nào đang bị quá hạn hoặc sắp đến hạn trong 48 giờ tới?',
  },
  {
    icon: <Users className="w-3.5 h-3.5 text-indigo-500" />,
    label: 'Ai đang nhận nhiều việc nhất?',
    prompt: 'Phân tích xem thành viên nào đang gánh nhiều đầu việc nhất trên bảng?',
  },
  {
    icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />,
    label: 'Có việc nào bị chặn không?',
    prompt: 'Có công việc nào đang bị phụ thuộc hoặc bị chặn bởi các thẻ khác không?',
  },
  {
    icon: <ListTodo className="w-3.5 h-3.5 text-emerald-500" />,
    label: 'Tóm tắt tình hình các cột',
    prompt: 'Tóm tắt nhanh số lượng và tình trạng công việc theo từng cột danh sách trên bảng.',
  },
];

export const BoardCopilotDrawer: React.FC<BoardCopilotDrawerProps> = ({
  isOpen,
  onClose,
  boardId,
  boardTitle,
  onOpenCard,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await apiClient<{ reply: string }>(`/ai/boards/${boardId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8), // Send last 8 context messages
        }),
      });

      if (res.success && res.data?.reply) {
        setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `⚠️ ${res.error || res.message || 'Không thể nhận phản hồi từ AI Copilot. Vui lòng thử lại sau.'}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ Lỗi kết nối: ${err.message || 'Không thể liên lạc với máy chủ AI.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#2b1572] to-[#1e1050] text-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight">AI Board Copilot</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    REALTIME
                  </span>
                </div>
                <p className="text-[11px] text-white/70 truncate">
                  Trợ lý thông minh cho {boardTitle ? `"${boardTitle}"` : 'Bảng này'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Xóa đoạn chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="py-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#2b1572]/10 text-[#2b1572] flex items-center justify-center mx-auto shadow-sm">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Xin chào! Tôi có thể giúp gì cho bạn?</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Tôi nắm bắt toàn bộ trạng thái thẻ, tiến độ, người phụ trách và liên kết trên bảng này.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Gợi ý câu hỏi nhanh:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {QUICK_PROMPTS.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(qp.prompt)}
                        className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 hover:border-[#a6d1fd] text-slate-700 hover:text-[#2b1572] transition-all flex items-center justify-between text-xs font-semibold shadow-2xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {qp.icon}
                          <span className="truncate">{qp.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-[#2b1572] text-[#a6d1fd] flex items-center justify-center shrink-0 shadow-2xs mt-1">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                        isUser
                          ? 'bg-[#2b1572] text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-[13px] leading-relaxed break-words">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} onOpenCard={onOpenCard} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#2b1572] text-[#a6d1fd] flex items-center justify-center shrink-0 shadow-2xs mt-1">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#2b1572] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#2b1572] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#2b1572] animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-slate-400 font-medium ml-2">Copilot đang phân tích bảng...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar if has messages */}
          {messages.length > 0 && !isLoading && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Gợi ý:</span>
              {QUICK_PROMPTS.slice(0, 3).map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 shrink-0 transition-colors cursor-pointer"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi về tiến độ, thẻ quá hạn, người phụ trách..."
                  disabled={isLoading}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2b1572] focus:bg-white transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#2b1572] to-[#1e1050] text-white flex items-center justify-center hover:opacity-95 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Bấm vào tên thẻ màu tím trong câu trả lời để mở chi tiết thẻ tức thì.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
