'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  FolderKanban,
  LayoutGrid,
  CreditCard,
  ArrowRight,
  CornerDownLeft,
  Command,
  FileQuestion,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export interface GlobalSearchResult {
  workspaces: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  boards: Array<{
    id: string;
    name: string;
    description: string | null;
    workspace_id: string;
    workspace_name?: string;
  }>;
  cards: Array<{
    id: string;
    title: string;
    description: string | null;
    board_id: string;
    board_name?: string;
    list_name?: string;
  }>;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FlattenedItem =
  | { type: 'workspace'; id: string; title: string; subtitle?: string; url: string }
  | { type: 'board'; id: string; title: string; subtitle?: string; url: string }
  | { type: 'card'; id: string; title: string; subtitle?: string; url: string };

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult>({
    workspaces: [],
    boards: [],
    cards: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Flattened results for keyboard navigation
  const flattenedItems: FlattenedItem[] = [
    ...results.workspaces.map((w) => ({
      type: 'workspace' as const,
      id: w.id,
      title: w.name,
      subtitle: w.description || 'Không gian làm việc',
      url: `/workspaces/${w.id}`,
    })),
    ...results.boards.map((b) => ({
      type: 'board' as const,
      id: b.id,
      title: b.name,
      subtitle: b.workspace_name ? `Bảng trong ${b.workspace_name}` : 'Bảng công việc',
      url: `/boards/${b.id}`,
    })),
    ...results.cards.map((c) => ({
      type: 'card' as const,
      id: c.id,
      title: c.title,
      subtitle: [c.board_name, c.list_name].filter(Boolean).join(' • ') || 'Thẻ công việc',
      url: `/boards/${c.board_id}?cardId=${c.id}`,
    })),
  ];

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults({ workspaces: [], boards: [], cards: [] });
    }
  }, [isOpen]);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ workspaces: [], boards: [], cards: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient<GlobalSearchResult>(
          `/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.success && res.data) {
          setResults(res.data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (flattenedItems.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % flattenedItems.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (flattenedItems.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + flattenedItems.length) % flattenedItems.length);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flattenedItems.length > 0 && flattenedItems[selectedIndex]) {
          handleSelect(flattenedItems[selectedIndex].url);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flattenedItems, selectedIndex, onClose]);

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  if (!isOpen) return null;

  const totalResults =
    results.workspaces.length + results.boards.length + results.cards.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 gap-3 bg-white">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm không gian, bảng, thẻ công việc... (gõ để tìm)"
            className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-slate-600 animate-spin shrink-0" />}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 text-[10px] font-semibold border border-slate-200">
            <span>ESC</span>
          </div>
        </div>

        {/* Results / Empty / Initial States */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Initial State when query is empty */}
          {!query.trim() && (
            <div className="py-6 px-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Tìm kiếm thông minh trên Planify
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Nhập từ khóa để tìm nhanh không gian làm việc, bảng công việc hoặc thẻ tác vụ của bạn.
              </p>
              <div className="inline-flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
                  <strong className="text-slate-800">Ctrl + K</strong> Mở tìm kiếm toàn cục
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
                  <strong className="text-slate-800">↑ / ↓</strong> Di chuyển
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
                  <strong className="text-slate-800">Enter</strong> Chọn xem
                </span>
              </div>
            </div>
          )}

          {/* No results found */}
          {query.trim() && !isLoading && totalResults === 0 && (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-md bg-amber-50 text-amber-700 flex items-center justify-center mb-3 border border-amber-200">
                <FileQuestion className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Không tìm thấy kết quả nào cho &ldquo;{query}&rdquo;
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy kiểm tra lại chính tả hoặc thử tìm kiếm với từ khóa ngắn hơn.
              </p>
            </div>
          )}

          {/* Workspaces Group */}
          {results.workspaces.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <FolderKanban className="w-3.5 h-3.5 text-slate-600" />
                <span>Không gian làm việc ({results.workspaces.length})</span>
              </div>
              <div className="mt-1 space-y-1">
                {results.workspaces.map((workspace) => {
                  const itemIndex = flattenedItems.findIndex(
                    (it) => it.type === 'workspace' && it.id === workspace.id
                  );
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <div
                      key={workspace.id}
                      onClick={() => handleSelect(`/workspaces/${workspace.id}`)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <FolderKanban className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {workspace.name}
                          </p>
                          {workspace.description && (
                            <p
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {workspace.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-white translate-x-1'
                            : 'text-slate-300 group-hover:text-slate-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Boards Group */}
          {results.boards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
                <span>Bảng công việc ({results.boards.length})</span>
              </div>
              <div className="mt-1 space-y-1">
                {results.boards.map((board) => {
                  const itemIndex = flattenedItems.findIndex(
                    (it) => it.type === 'board' && it.id === board.id
                  );
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <div
                      key={board.id}
                      onClick={() => handleSelect(`/boards/${board.id}`)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isSelected ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {board.name}
                            </p>
                            {board.workspace_name && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded-xs font-medium ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {board.workspace_name}
                              </span>
                            )}
                          </div>
                          {board.description && (
                            <p
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {board.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-white translate-x-1'
                            : 'text-slate-300 group-hover:text-slate-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cards Group */}
          {results.cards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                <span>Thẻ công việc ({results.cards.length})</span>
              </div>
              <div className="mt-1 space-y-1">
                {results.cards.map((card) => {
                  const itemIndex = flattenedItems.findIndex(
                    (it) => it.type === 'card' && it.id === card.id
                  );
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <div
                      key={card.id}
                      onClick={() =>
                        handleSelect(`/boards/${card.board_id}?cardId=${card.id}`)
                      }
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {card.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {card.board_name && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-xs font-medium truncate ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                Bảng: {card.board_name}
                              </span>
                            )}
                            {card.list_name && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-xs font-medium truncate ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                Cột: {card.list_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-medium">
                            <CornerDownLeft className="w-3 h-3" /> Mở thẻ
                          </span>
                        )}
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected
                              ? 'text-white translate-x-1'
                              : 'text-slate-300 group-hover:text-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with hints */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-[10px]">
                ↑↓
              </kbd>{' '}
              Điều hướng
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-[10px]">
                ↵
              </kbd>{' '}
              Truy cập
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-[10px]">
                ESC
              </kbd>{' '}
              Đóng
            </span>
          </div>
          {totalResults > 0 && (
            <span className="font-semibold text-slate-800">
              Tìm thấy {totalResults} kết quả
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
