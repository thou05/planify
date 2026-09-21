'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (workspace: any) => void;
  workspace: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
}

export default function EditWorkspaceModal({
  isOpen,
  onClose,
  onUpdated,
  workspace,
}: EditWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setDescription(workspace.description || '');
      setError('');
    }
  }, [workspace]);

  if (!isOpen || !workspace) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await apiClient(`/workspaces/${workspace.id}`, {
        method: 'PATCH',
        data: {
          name: name.trim(),
          description: description.trim() || '',
        },
      });

      if (res.success && res.data) {
        onUpdated(res.data);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật Không gian làm việc, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/20 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-strong p-6 sm:p-8 border border-white/60 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Chỉnh sửa Không gian</h2>
            <p className="text-xs text-[#2b1572]/70">Cập nhật thông tin nhận diện Workspace</p>
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
              Tên Workspace <span className="text-[#c40000]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Dự án Planify Team..."
              className="w-full px-3.5 py-2.5 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
              Mô tả Workspace
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu, dự án hoặc phòng ban của Workspace này..."
              className="w-full px-3.5 py-2.5 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-medium resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 btn-secondary text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-5 py-2.5 btn-primary text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu thay đổi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
