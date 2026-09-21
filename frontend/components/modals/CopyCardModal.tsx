'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, Copy } from 'lucide-react';

interface CopyCardModalProps {
  card: any;
  boardLists: any[];
  isOpen: boolean;
  onClose: () => void;
  onCopied: () => void;
}

export default function CopyCardModal({
  card,
  boardLists,
  isOpen,
  onClose,
  onCopied,
}: CopyCardModalProps) {
  const [title, setTitle] = useState('');
  const [targetListId, setTargetListId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(`${card.title} (Bản sao)`);
      setTargetListId(card.list_id || '');
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const selectedList = (boardLists || []).find((l) => l.id === targetListId);
  const cardCountInSelectedList = selectedList?.cards?.length || 0;
  const isTargetLimitReached = Boolean(selectedList?.limit && cardCountInSelectedList >= selectedList.limit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetListId || isLoading || isTargetLimitReached) return;

    try {
      setIsLoading(true);
      await apiClient(`/cards/${card.id}/copy`, {
        method: 'POST',
        data: {
          title: title.trim(),
          targetListId,
        },
      });
      onCopied();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể sao chép thẻ');
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
              <Copy className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#2b1572]">Sao chép thẻ</h3>
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
            <label className="block text-xs font-semibold text-[#2b1572] mb-1.5">
              Tiêu đề thẻ mới
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề thẻ..."
              autoFocus
              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 focus:border-[#2b1572] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2b1572] mb-1.5">
              Danh sách đích
            </label>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 focus:border-[#2b1572] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15"
            >
              {(boardLists || []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} {l.id === card.list_id ? '(Hiện tại)' : ''} {l.limit ? `(${l.cards?.length || 0}/${l.limit})` : ''}
                </option>
              ))}
            </select>
            {isTargetLimitReached && (
              <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                ⚠️ Danh sách này đã đạt giới hạn tối đa ({selectedList?.limit} thẻ). Vui lòng chọn danh sách khác.
              </p>
            )}
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
              disabled={!title.trim() || !targetListId || isLoading || isTargetLimitReached}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang sao chép...' : 'Tạo bản sao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
