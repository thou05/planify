'use client';

import React, { useState } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (workspace: any) => void;
}

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await apiClient('/workspaces', {
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });

      if (res.success && res.data) {
        onCreated(res.data);
        setName('');
        setDescription('');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo Workspace, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/20 backdrop-blur-sm">
      <div className="w-full max-w-md glass-strong p-6 sm:p-8 border border-white/60 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#2b1572]">Tạo Workspace mới</h3>
            <p className="text-xs text-[#2b1572]/60">Không gian làm việc chung cho dự án</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
              Tên Workspace *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhóm Phát Triển Sản Phẩm"
              className="w-full px-3.5 py-2.5 text-sm glass-input placeholder:text-[#2b1572]/30 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
              Mô tả (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu của không gian làm việc này..."
              className="w-full px-3.5 py-2.5 text-sm glass-input placeholder:text-[#2b1572]/30 font-medium resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#2b1572]/70 hover:text-[#2b1572] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 btn-primary text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isLoading ? 'Đang tạo...' : 'Tạo Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
