'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, Copy } from 'lucide-react';

interface CopyListModalProps {
  list: any;
  isOpen: boolean;
  onClose: () => void;
  onCopied: () => void;
}

export default function CopyListModal({
  list,
  isOpen,
  onClose,
  onCopied,
}: CopyListModalProps) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (list) {
      setTitle(`${list.title} (Bản sao)`);
    }
  }, [list]);

  if (!isOpen || !list) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;

    try {
      setIsLoading(true);
      await apiClient(`/lists/${list.id}/copy`, {
        method: 'POST',
        data: { title: title.trim() },
      });
      onCopied();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể sao chép danh sách');
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
            <h3 className="font-bold text-sm text-[#2b1572]">Sao chép danh sách</h3>
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
              Tên danh sách mới
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên danh sách..."
              autoFocus
              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 focus:border-[#2b1572] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Tất cả {list.cards?.length || 0} thẻ bên trong danh sách{' '}
            <strong className="text-[#2b1572]">{list.title}</strong> sẽ được sao chép
            nguyên vẹn sang danh sách mới.
          </p>

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
              disabled={!title.trim() || isLoading}
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
