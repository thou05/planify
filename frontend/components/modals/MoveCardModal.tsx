'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, ArrowRightLeft } from 'lucide-react';

interface MoveCardModalProps {
  card: any;
  boardLists: any[];
  isOpen: boolean;
  onClose: () => void;
  onMoved: () => void;
}

export default function MoveCardModal({
  card,
  boardLists,
  isOpen,
  onClose,
  onMoved,
}: MoveCardModalProps) {
  const [targetListId, setTargetListId] = useState('');
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setTargetListId(card.list_id || '');
      setPosition(card.position || 0);
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const selectedList = (boardLists || []).find((l) => l.id === targetListId);
  const cardCountInSelectedList = selectedList?.cards?.length || 0;
  const isSameList = card.list_id === targetListId;
  const maxPosition = isSameList ? cardCountInSelectedList - 1 : cardCountInSelectedList;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetListId || isLoading) return;

    try {
      setIsLoading(true);
      await apiClient(`/cards/${card.id}/move`, {
        method: 'PATCH',
        data: {
          targetListId,
          position: Number(position),
        },
      });
      onMoved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể di chuyển thẻ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/15 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-[#2b1572]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#2b1572]/10 text-[#2b1572] rounded-lg">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#2b1572]">Di chuyển thẻ</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#2b1572]/40 hover:text-[#2b1572] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Thẻ được chọn:</div>
            <div className="text-xs font-bold text-[#2b1572] p-2 bg-slate-50 rounded-lg border border-slate-200 truncate">
              {card.title}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2b1572] mb-1.5">
              Danh sách đích
            </label>
            <select
              value={targetListId}
              onChange={(e) => {
                setTargetListId(e.target.value);
                setPosition(0);
              }}
              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 focus:border-[#2b1572] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15"
            >
              {(boardLists || []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} {l.id === card.list_id ? '(Hiện tại)' : ''} {l.limit ? `(${l.cards?.length || 0}/${l.limit})` : ''}
                </option>
              ))}
            </select>
            {!isSameList && selectedList?.limit && cardCountInSelectedList >= selectedList.limit && (
              <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                ⚠️ Danh sách này đã đạt giới hạn tối đa ({selectedList.limit} thẻ). Vui lòng chọn danh sách khác.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2b1572] mb-1.5">
              Vị trí thứ tự trong danh sách (Bắt đầu từ 1)
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              disabled={!isSameList && selectedList?.limit && cardCountInSelectedList >= selectedList.limit}
              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 focus:border-[#2b1572] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15 disabled:opacity-50"
            >
              {Array.from({ length: Math.max(1, maxPosition + 1) }).map((_, idx) => (
                <option key={idx} value={idx}>
                  Vị trí {idx + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || (!isSameList && Boolean(selectedList?.limit && cardCountInSelectedList >= selectedList.limit))}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang di chuyển...' : 'Di chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
