'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, Layers } from 'lucide-react';

interface MoveCardsModalProps {
  sourceList: any;
  boardLists: any[];
  isOpen: boolean;
  onClose: () => void;
  onMoved: () => void;
}

export default function MoveCardsModal({
  sourceList,
  boardLists,
  isOpen,
  onClose,
  onMoved,
}: MoveCardsModalProps) {
  const [targetListId, setTargetListId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter out source list
  const availableLists = (boardLists || []).filter((l) => l.id !== sourceList?.id);

  if (!isOpen || !sourceList) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetListId || isLoading) return;

    try {
      setIsLoading(true);
      await apiClient(`/lists/${sourceList.id}/move-all-cards`, {
        method: 'POST',
        data: { targetListId },
      });
      onMoved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể di chuyển các thẻ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#87ceeb] text-slate-900 flex items-center justify-center shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              Chuyển tất cả thẻ trong danh sách
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Chọn danh sách đích để chuyển {sourceList.cards?.length || 0} thẻ tới:
            </label>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md px-3 py-2 focus:outline-none transition-all font-medium cursor-pointer"
            >
              <option value="">-- Chọn danh sách đích --</option>
              {availableLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.cards?.length || 0} thẻ)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!targetListId || isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang chuyển...' : 'Chuyển toàn bộ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
