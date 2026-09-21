'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  ArrowRightLeft,
  ArrowUpDown,
  Edit2,
  X,
  Calendar,
  Layers,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  GripVertical,
} from 'lucide-react';
import KanbanCard from './KanbanCard';

interface ListColumnProps {
  list: any;
  boardLists: any[];
  onOpenCardDetail: (cardId: string) => void;
  onRefreshBoard: () => void;
  onRenameList: (listId: string, newTitle: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onCopyListRequest: (list: any) => void;
  onMoveListRequest: (list: any) => void;
  onMoveAllCardsRequest: (list: any) => void;
  onSortCards: (listId: string, sortBy: 'due_date' | 'title' | 'created_at', order?: 'asc' | 'desc') => Promise<void>;
  onQuickAddCard: (listId: string, title: string) => Promise<void>;
  onQuickEditCardTitle: (cardId: string, newTitle: string) => Promise<void>;
  onMoveCardRequest: (card: any) => void;
  onCopyCardRequest: (card: any) => void;
  onDeleteCard: (cardId: string) => Promise<void>;
  onCardDragStart: (e: React.DragEvent, cardId: string, sourceListId: string) => void;
  onCardDragEnd: (e: React.DragEvent) => void;
  onCardDrop: (e: React.DragEvent, targetListId: string, targetPosition?: number) => void;
  onListDragStart: (e: React.DragEvent, listId: string) => void;
  onListDragEnd: (e: React.DragEvent) => void;
  onListDrop: (e: React.DragEvent, targetListId: string) => void;
  draggedSourceListId?: string | null;
}

export default function ListColumn({
  list,
  boardLists,
  onOpenCardDetail,
  onRefreshBoard,
  onRenameList,
  onDeleteList,
  onCopyListRequest,
  onMoveListRequest,
  onMoveAllCardsRequest,
  onSortCards,
  onQuickAddCard,
  onQuickEditCardTitle,
  onMoveCardRequest,
  onCopyCardRequest,
  onDeleteCard,
  onCardDragStart,
  onCardDragEnd,
  onCardDrop,
  onListDragStart,
  onListDragEnd,
  onListDrop,
  draggedSourceListId = null,
}: ListColumnProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title || '');

  // Quick Add Card state
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  // Drag over & Shake error styling state
  const [isDragOverList, setIsDragOverList] = useState(false);
  const [isShakeError, setIsShakeError] = useState(false);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerShake = () => {
    setIsShakeError(true);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => {
      setIsShakeError(false);
    }, 550);
  };

  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitleValue(list.title || '');
  }, [list.title]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isAddingCard) {
      cardInputRef.current?.focus();
    }
  }, [isAddingCard]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsSortMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSaveTitle = async () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== list.title) {
      await onRenameList(list.id, trimmed);
    } else {
      setTitleValue(list.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitleValue(list.title);
      setIsEditingTitle(false);
    }
  };

  const handleCreateCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;

    setNewCardTitle('');
    // Gọi thêm thẻ tức thì (Optimistic UI đã render ngay 0ms)
    onQuickAddCard(list.id, trimmed);
    setTimeout(() => cardInputRef.current?.focus(), 10);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateCard();
    } else if (e.key === 'Escape') {
      setIsAddingCard(false);
      setNewCardTitle('');
    }
  };

  const cardCount = list.cards?.length || 0;
  const isLimitReached = Boolean(list.limit && list.limit > 0 && cardCount >= list.limit);
  const isDropDisabled = Boolean(isLimitReached && draggedSourceListId !== null && draggedSourceListId !== list.id);

  return (
    <div
      draggable={!isEditingTitle && !isAddingCard}
      onDragStart={(e) => {
        onListDragStart(e, list.id);
      }}
      onDragEnd={onListDragEnd}
      onDragOver={(e) => {
        if (isDropDisabled) {
          e.dataTransfer.dropEffect = 'none';
          if (!isShakeError) {
            triggerShake();
          }
          return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOverList(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverList(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverList(false);
        if (isDropDisabled) {
          triggerShake();
          return;
        }
        // List drop or card drop to the end of list
        onListDrop(e, list.id);
        onCardDrop(e, list.id, list.cards?.length || 0);
      }}
      className={`w-72 max-h-full kanban-list flex flex-col shrink-0 p-3.5 transition-all duration-200 cursor-default ${
        isShakeError
          ? '!border-rose-500 !ring-2 !ring-rose-500/80 !bg-rose-50/25 animate-shake shadow-lg shadow-rose-500/25'
          : isDragOverList
          ? 'ring-2 ring-[#2b1572] bg-white/80 shadow-xl scale-[1.01]'
          : ''
      }`}
    >
      {/* List Header */}
      <div className="flex items-center justify-between pb-2 mb-2 px-1 border-b border-white/40 group/header">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          {/* List Drag handle icon */}
          <div
            className="text-[#2b1572]/30 group-hover/header:text-[#2b1572]/70 cursor-grab active:cursor-grabbing p-0.5"
            title="Kéo để đổi vị trí danh sách"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="w-full text-sm font-bold text-[#2b1572] bg-white border border-[#2b1572]/40 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/20"
            />
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              className="font-bold text-sm text-[#2b1572] truncate cursor-pointer hover:bg-white/40 px-1 py-0.5 rounded-md transition-colors"
              title="Click để sửa tên danh sách"
            >
              {list.title}
            </h3>
          )}

          {/* WIP badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs transition-colors ${
              isLimitReached
                ? 'badge-error bg-rose-500 text-white'
                : 'bg-white/80 text-[#2b1572]/80 border border-white'
            }`}
            title={list.limit ? `Giới hạn WIP: ${list.limit} thẻ` : 'Số lượng thẻ'}
          >
            {cardCount}
            {list.limit ? ` / ${list.limit}` : ''}
          </span>
        </div>

        {/* List Actions Menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsSortMenuOpen(false);
            }}
            className="p-1 text-[#2b1572]/50 hover:text-[#2b1572] hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
            title="Tùy chọn danh sách"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* List Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-[#2b1572]/15 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[11px] font-bold text-[#2b1572]/60 uppercase tracking-wider">
                Thao tác danh sách
              </div>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsAddingCard(true);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#2b1572] hover:bg-[#2b1572]/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Thêm thẻ mới</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEditingTitle(true);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#2b1572] hover:bg-[#2b1572]/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Sửa tên danh sách</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onMoveListRequest(list);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#2b1572] hover:bg-[#2b1572]/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Di chuyển danh sách...</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onCopyListRequest(list);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#2b1572] hover:bg-[#2b1572]/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Sao chép danh sách...</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onMoveAllCardsRequest(list);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#2b1572] hover:bg-[#2b1572]/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Chuyển tất cả thẻ...</span>
              </button>

              {/* Sort Submenu Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#2b1572] hover:bg-[#2b1572]/10 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#2b1572]/70" />
                    <span>Sắp xếp thẻ theo...</span>
                  </span>
                  <span className="text-[10px] text-[#2b1572]/50">▸</span>
                </button>

                {isSortMenuOpen && (
                  <div className="pl-6 pr-2 py-1 space-y-0.5 bg-[#2b1572]/5 border-y border-[#2b1572]/10">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSortCards(list.id, 'due_date', 'asc');
                      }}
                      className="w-full px-2 py-1 text-left text-[11px] text-[#2b1572] hover:bg-[#2b1572]/10 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>Ngày hết hạn (Sớm nhất)</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSortCards(list.id, 'title', 'asc');
                      }}
                      className="w-full px-2 py-1 text-left text-[11px] text-[#2b1572] hover:bg-[#2b1572]/10 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowDownAZ className="w-3 h-3 text-blue-600" />
                      <span>Tên thẻ (A → Z)</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSortCards(list.id, 'title', 'desc');
                      }}
                      className="w-full px-2 py-1 text-left text-[11px] text-[#2b1572] hover:bg-[#2b1572]/10 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowUpAZ className="w-3 h-3 text-blue-600" />
                      <span>Tên thẻ (Z → A)</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSortCards(list.id, 'created_at', 'desc');
                      }}
                      className="w-full px-2 py-1 text-left text-[11px] text-[#2b1572] hover:bg-[#2b1572]/10 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-purple-600" />
                      <span>Mới nhất trước</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-[#2b1572]/10 my-1" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onDeleteList(list.id);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Xóa danh sách</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-[30px]">
        {list.cards?.length > 0 ? (
          list.cards.map((card: any, idx: number) => (
            <KanbanCard
              key={card.id}
              card={card}
              index={idx}
              listId={list.id}
              listTitle={list.title}
              onOpenDetail={onOpenCardDetail}
              onCardUpdated={onRefreshBoard}
              onMoveCardRequest={onMoveCardRequest}
              onCopyCardRequest={onCopyCardRequest}
              onDeleteCard={onDeleteCard}
              onQuickEditTitle={onQuickEditCardTitle}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onDropOnCard={onCardDrop}
              isDropDisabled={isDropDisabled}
              onShakeError={triggerShake}
            />
          ))
        ) : (
          !isAddingCard && (
            <div className="py-6 px-3 text-center text-[11px] text-[#2b1572]/40 bg-white/20 rounded-xl border border-dashed border-white/40">
              Kéo thẻ vào đây hoặc bấm thêm thẻ
            </div>
          )
        )}
      </div>

      {/* Bottom Inline Add Card Section (Hidden if limit reached) */}
      {!isLimitReached && (
        <div className="mt-2 pt-2 border-t border-white/40">
          {isAddingCard ? (
            <div className="space-y-2 animate-in fade-in duration-100">
              <textarea
                ref={cardInputRef}
                rows={2}
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleCardKeyDown}
                placeholder="Nhập tiêu đề cho thẻ này..."
                className="w-full text-xs text-[#2b1572] bg-white border border-[#2b1572]/30 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/20 shadow-xs resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateCard()}
                  disabled={!newCardTitle.trim() || isSubmittingCard}
                  className="px-3 py-1.5 bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingCard ? 'Đang thêm...' : 'Thêm thẻ'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }}
                  className="p-1.5 text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
                  title="Hủy"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCard(true)}
              className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-[#2b1572]/70 hover:text-[#2b1572] hover:bg-white/50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm thẻ</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
