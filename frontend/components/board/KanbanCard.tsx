'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Link as LinkIcon,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Check,
  Paperclip,
} from 'lucide-react';

interface KanbanCardProps {
  card: any;
  index: number;
  listId: string;
  listTitle: string;
  onOpenDetail: (cardId: string) => void;
  onCardUpdated: () => void;
  onMoveCardRequest: (card: any) => void;
  onCopyCardRequest: (card: any) => void;
  onDeleteCard: (cardId: string) => void;
  onQuickEditTitle: (cardId: string, newTitle: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string, sourceListId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDropOnCard?: (e: React.DragEvent, targetListId: string, targetIndex: number) => void;
  isDropDisabled?: boolean;
  onShakeError?: () => void;
}

export default function KanbanCard({
  card,
  index,
  listId,
  listTitle,
  onOpenDetail,
  onCardUpdated,
  onMoveCardRequest,
  onCopyCardRequest,
  onDeleteCard,
  onQuickEditTitle,
  onDragStart,
  onDragEnd,
  onDropOnCard,
  isDropDisabled = false,
  onShakeError,
}: KanbanCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title || '');
  const [copySuccess, setCopySuccess] = useState(false);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTitleValue(card.title || '');
  }, [card.title]);

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  // Handle outside click & window scroll to close menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isMenuOpen]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMenuOpen) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const menuHeight = 200; // Estimated height for boundary check
        const menuWidth = 180;
        const spaceBelow = window.innerHeight - rect.bottom;

        let placement: 'top' | 'bottom' = 'bottom';
        let top = rect.bottom + 6;

        // If not enough space below and enough space above, pop upwards
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
          placement = 'top';
          top = rect.top - 6; // With translateY(-100%), bottom edge will be exactly 6px above button
        }

        // Align right edge of menu with button
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;
        if (left + menuWidth > window.innerWidth - 10) {
          left = window.innerWidth - menuWidth - 10;
        }

        setMenuCoords({ top, left, placement });
        setIsMenuOpen(true);
      }
    } else {
      setIsMenuOpen(false);
    }
  };

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== card.title) {
      onQuickEditTitle(card.id, trimmed);
    } else {
      setTitleValue(card.title);
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitleValue(card.title);
      setIsEditingTitle(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?cardId=${card.id}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setIsMenuOpen(false);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Due date status styling
  const getDueDateStatus = () => {
    if (!card.due_date) return null;
    if (card.is_due_date_completed) {
      return { label: 'Đã xong', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    const due = new Date(card.due_date).getTime();
    const now = Date.now();
    const diffHours = (due - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { label: 'Quá hạn', className: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
    }
    if (diffHours <= 24) {
      return { label: 'Gần đến hạn', className: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' };
    }
    return { label: null, className: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  const dueDateStatus = getDueDateStatus();

  // Checklist counts
  const totalChecklistItems = card.checklists?.reduce(
    (acc: number, cl: any) => acc + (cl.items?.length || 0),
    0
  ) || 0;
  const completedChecklistItems = card.checklists?.reduce(
    (acc: number, cl: any) =>
      acc + (cl.items?.filter((it: any) => it.is_completed)?.length || 0),
    0
  ) || 0;

  // Handle Drag Over relative to card height (top half vs bottom half)
  const handleCardDragOver = (e: React.DragEvent) => {
    if (isMenuOpen || isEditingTitle) return;
    if (isDropDisabled) {
      e.dataTransfer.dropEffect = 'none';
      onShakeError?.();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      setDropPosition('top');
    } else {
      setDropPosition('bottom');
    }
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleCardDrop = (e: React.DragEvent) => {
    if (isMenuOpen || isEditingTitle) return;
    e.preventDefault();
    e.stopPropagation();
    setDropPosition(null);

    if (isDropDisabled) {
      onShakeError?.();
      return;
    }

    const targetIdx = dropPosition === 'bottom' ? index + 1 : index;
    if (onDropOnCard) {
      onDropOnCard(e, listId, targetIdx);
    }
  };

  return (
    <div className="relative">
      {/* Top drop insertion indicator line */}
      {dropPosition === 'top' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#87ceeb] rounded-xs z-20" />
      )}

      <div
        ref={cardRef}
        draggable={!isEditingTitle && !isMenuOpen}
        onDragStart={(e) => {
          if (isMenuOpen) {
            e.preventDefault();
            return;
          }
          onDragStart(e, card.id, listId);
        }}
        onDragEnd={(e) => {
          setDropPosition(null);
          onDragEnd(e);
        }}
        onDragOver={handleCardDragOver}
        onDragLeave={handleCardDragLeave}
        onDrop={handleCardDrop}
        onClick={() => {
          if (!isEditingTitle && !isMenuOpen) onOpenDetail(card.id);
        }}
        className={`kanban-card group relative p-3 bg-white rounded-md border border-slate-200 hover:border-slate-400 transition-colors duration-150 cursor-pointer select-none active:cursor-grabbing ${
          dropPosition ? 'ring-1 ring-[#87ceeb]' : ''
        } ${isMenuOpen ? '!z-30 ring-1 ring-slate-400' : ''}`}
      >
        {/* Labels preview */}
        {card.card_labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.card_labels.map((cl: any) => (
              <span
                key={cl.label?.id || Math.random()}
                className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold text-white tracking-wide"
                style={{ backgroundColor: cl.label?.color || '#3b82f6' }}
              >
                {cl.label?.name}
              </span>
            ))}
          </div>
        )}

        {/* Card Header & Title */}
        <div className="flex items-start justify-between gap-2">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs font-semibold text-slate-900 bg-white border border-[#87ceeb] rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#87ceeb]/40"
            />
          ) : (
            <h4 className="text-xs font-semibold text-slate-900 leading-snug break-words flex-1 group-hover:text-[#d86969] transition-colors">
              {card.title}
            </h4>
          )}

          {/* Quick Menu Trigger Button */}
          <div
            className="relative shrink-0"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              ref={buttonRef}
              onClick={handleToggleMenu}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'opacity-100 bg-slate-100 text-slate-900'
                  : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Tùy chọn thẻ"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description Snippet */}
        {card.description && !isEditingTitle && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}

        {/* Card Footer Badges */}
        <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            {/* Due date badge */}
            {card.due_date && (
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border font-medium ${
                  dueDateStatus?.className || 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
                title={`Hạn chót: ${new Date(card.due_date).toLocaleString('vi-VN')}`}
              >
                <Calendar className="w-3 h-3 shrink-0" />
                <span>
                  {new Date(card.due_date).toLocaleDateString('vi-VN', {
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </span>
                {dueDateStatus?.label && (
                  <span className="font-semibold text-[9px] uppercase tracking-wider">
                    ({dueDateStatus.label})
                  </span>
                )}
              </span>
            )}

            {/* Checklist badge */}
            {totalChecklistItems > 0 && (
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border font-medium ${
                  completedChecklistItems === totalChecklistItems
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <CheckSquare className="w-3 h-3 shrink-0" />
                <span>
                  {completedChecklistItems}/{totalChecklistItems}
                </span>
              </span>
            )}

            {/* Comments count */}
            {(card.comments?.length > 0 || card._count?.comments > 0) && (
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span>{card.comments?.length || card._count?.comments}</span>
              </span>
            )}

            {/* Attachments count */}
            {(card.attachments?.length > 0 || card._count?.attachments > 0) && (
              <span className="flex items-center gap-1 text-slate-500 font-medium" title="Tệp đính kèm">
                <Paperclip className="w-3 h-3 shrink-0" />
                <span>{card.attachments?.length || card._count?.attachments}</span>
              </span>
            )}
          </div>

          {/* Card Assignee avatar */}
          {card.card_assignees?.length > 0 && (
            <div className="flex items-center -space-x-1.5 ml-auto">
              {card.card_assignees.slice(0, 3).map((ca: any) => {
                const uName = ca.board_member?.user?.name || 'Thành viên';
                const uAvatar = ca.board_member?.user?.avatar;
                const firstLetter = uName.charAt(0).toUpperCase();

                return uAvatar ? (
                  <img
                    key={ca.id || Math.random()}
                    src={uAvatar}
                    alt={uName}
                    className="w-5 h-5 rounded-full object-cover border border-white shrink-0"
                    title={uName}
                  />
                ) : (
                  <div
                    key={ca.id || Math.random()}
                    className="w-5 h-5 rounded-full bg-[#f28d8d] border border-white text-white flex items-center justify-center text-[9px] font-bold shrink-0"
                    title={uName}
                  >
                    {firstLetter}
                  </div>
                );
              })}

              {card.card_assignees.length > 3 && (
                <div
                  className="w-5 h-5 rounded-full bg-slate-200 border border-white text-slate-700 flex items-center justify-center text-[8px] font-bold shrink-0"
                  title={`+${card.card_assignees.length - 3} thành viên khác`}
                >
                  +{card.card_assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copy link feedback toast overlay */}
        {copySuccess && (
          <div className="absolute inset-0 bg-[#f28d8d] rounded-md flex items-center justify-center gap-1.5 text-white text-xs font-semibold z-20 animate-in fade-in duration-150 shadow-md">
            <Check className="w-4 h-4 text-white" />
            <span>Đã sao chép liên kết thẻ!</span>
          </div>
        )}
      </div>

      {/* Bottom drop insertion indicator line */}
      {dropPosition === 'bottom' && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#87ceeb] rounded-xs z-20" />
      )}

      {/* PORTAL FLOATING MENU: Perfectly aligned whether popping above or below */}
      {mounted &&
        isMenuOpen &&
        menuCoords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              transform: menuCoords.placement === 'top' ? 'translateY(-100%)' : 'none',
              width: '180px',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-white rounded-md shadow-md border border-slate-200 py-1 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                setIsEditingTitle(true);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Sửa tiêu đề nhanh</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onMoveCardRequest(card);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Di chuyển thẻ...</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onCopyCardRequest(card);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Sao chép thẻ...</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Sao chép liên kết</span>
            </button>

            <div className="h-[1px] bg-slate-100 my-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onDeleteCard(card.id);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Xóa thẻ</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
