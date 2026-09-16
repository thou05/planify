'use client';

import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CreateListModalProps {
  isOpen: boolean;
  boardId: string;
  onClose: () => void;
  onCreated: (list: any) => void;
}

export default function CreateListModal({
  isOpen,
  boardId,
  onClose,
  onCreated,
}: CreateListModalProps) {
  const [title, setTitle] = useState('');
  const [limit, setLimit] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await apiClient(`/boards/${boardId}/lists`, {
        data: {
          title: title.trim(),
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      });

      if (res.success && res.data) {
        onCreated(res.data);
        setTitle('');
        setLimit('');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo danh sách, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/20 backdrop-blur-sm">
      <div className="w-full max-w-sm glass-strong p-6 border border-white/60 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-bold text-[#2b1572] mb-1">Thêm Danh sách mới</h3>
        <p className="text-xs text-[#2b1572]/60 mb-4">Tạo cột trạng thái mới cho Kanban Board</p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1">
              Tên Danh sách *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kiểm thử (Testing)"
              className="w-full px-3 py-2 text-sm glass-input font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1">
              Giới hạn WIP (Số thẻ tối đa)
            </label>
            <input
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Để trống nếu không giới hạn"
              className="w-full px-3 py-2 text-sm glass-input font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[#2b1572]/70 hover:text-[#2b1572] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isLoading ? 'Đang tạo...' : 'Thêm Danh sách'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
