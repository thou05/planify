'use client';

import { alertDialog } from '@/components/ui/AppDialog';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, ArrowRightLeft } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

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
      void alertDialog({ message: err.message || 'Không thể di chuyển danh sách', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const currentListIndex = (boardLists || []).findIndex((l) => l.id === list.id);
  const positionOptions = (boardLists || []).map((_, idx) => ({
    value: idx,
    label: `Vị trí ${idx + 1}`,
    badge: idx === currentListIndex ? 'Hiện tại' : undefined,
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#87ceeb] text-slate-900 rounded-md shadow-2xs">
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
            <div className="text-xs font-bold text-slate-900 p-2.5 bg-slate-50 rounded-md border border-slate-200">
              {list.title}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Vị trí thứ tự mới trên bảng (Bắt đầu từ 1)
            </label>
            <CustomSelect
              value={position}
              onChange={(val) => setPosition(Number(val))}
              options={positionOptions}
            />
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
              className="px-4 py-2 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              {isLoading ? 'Đang di chuyển...' : 'Di chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
