'use client';

import { alertDialog } from '@/components/ui/AppDialog';
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
      void alertDialog({ message: err.message || 'Không thể sao chép danh sách', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#87ceeb] flex items-center justify-center text-slate-900 shadow-2xs">
              <Copy className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Sao chép danh sách</h3>
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
              Tên danh sách mới
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên danh sách..."
              autoFocus
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Tất cả {list.cards?.length || 0} thẻ bên trong danh sách{' '}
            <strong className="text-slate-900 font-semibold">{list.title}</strong> sẽ được sao chép
            nguyên vẹn sang danh sách mới.
          </p>

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
              disabled={!title.trim() || isLoading}
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
