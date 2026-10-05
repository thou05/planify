'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, ArrowRightLeft } from 'lucide-react';

interface MoveListModalProps {
  list: any;
  boardId: string;
  boardLists: any[];
  isOpen: boolean;
  onClose: () => void;
  onMoved: () => void;
}

export default function MoveListModal({
  list,
  boardId,
  boardLists,
  isOpen,
  onClose,
  onMoved,
}: MoveListModalProps) {
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (list && boardLists) {
      const currentIndex = boardLists.findIndex((l) => l.id === list.id);
      setPosition(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [list, boardLists]);

  if (!isOpen || !list) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Re-order list array
      const currentLists = [...(boardLists || [])];
      const currentIndex = currentLists.findIndex((l) => l.id === list.id);
      if (currentIndex !== -1 && currentIndex !== position) {
        const [moved] = currentLists.splice(currentIndex, 1);
        currentLists.splice(position, 0, moved);

        const listIds = currentLists.map((l) => l.id);

        await apiClient(`/boards/${boardId}/lists/reorder`, {
          method: 'PATCH',
          data: { listIds },
        });
      }

      onMoved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể di chuyển danh sách');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-900 text-white rounded-md">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Di chuyển danh sách</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Danh sách:</div>
            <div className="text-xs font-bold text-slate-900 p-2 bg-slate-50 rounded-md border border-slate-200">
              {list.title}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Vị trí thứ tự mới trên bảng (Bắt đầu từ 1)
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md p-2.5 focus:outline-none focus:border-slate-800 font-medium"
            >
              {(boardLists || []).map((_, idx) => (
                <option key={idx} value={idx}>
                  Vị trí {idx + 1} {idx === boardLists.findIndex((l) => l.id === list.id) ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
            >
              {isLoading ? 'Đang di chuyển...' : 'Di chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
