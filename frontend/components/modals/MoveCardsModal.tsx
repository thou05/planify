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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/15 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-[#2b1572]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#2b1572]/10 text-[#2b1572] rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#2b1572]">
              Chuyển tất cả thẻ trong danh sách
            </h3>
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
              Chọn danh sách đích để chuyển {sourceList.cards?.length || 0} thẻ tới:
            </label>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 focus:border-[#2b1572] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15"
            >
              <option value="">-- Chọn danh sách đích --</option>
              {availableLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.cards?.length || 0} thẻ)
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
              disabled={!targetListId || isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang chuyển...' : 'Chuyển toàn bộ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
