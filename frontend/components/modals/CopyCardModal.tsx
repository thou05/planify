'use client';

import { useModalAccessibility } from '@/lib/use-modal-accessibility';
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
  const dialogRef = useModalAccessibility(isOpen, () => { if (!isLoading) onClose(); });

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
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Sao chép thẻ" tabIndex={-1} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#87ceeb] flex items-center justify-center text-slate-900 shadow-2xs">
              <Copy className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Sao chép thẻ</h3>
          </div>
          <button
            disabled={isLoading} onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Tiêu đề thẻ mới
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề thẻ..."
              autoFocus
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Danh sách đích
            </label>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium cursor-pointer"
            >
              {(boardLists || []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} {l.id === card.list_id ? '(Hiện tại)' : ''} {l.limit ? `(${l.cards?.length || 0}/${l.limit})` : ''}
                </option>
              ))}
            </select>
            {isTargetLimitReached && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                ⚠️ Danh sách này đã đạt giới hạn tối đa ({selectedList?.limit} thẻ). Vui lòng chọn danh sách khác.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isLoading} onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !targetListId || isLoading || isTargetLimitReached}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 rounded-md shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang sao chép...' : 'Tạo bản sao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
