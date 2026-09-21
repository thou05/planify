'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Copy, Loader2, Layers, CheckSquare } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CopyBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: any;
  workspaces?: any[];
}

export default function CopyBoardModal({
  isOpen,
  onClose,
  board,
  workspaces = [],
}: CopyBoardModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [includeCards, setIncludeCards] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (board) {
      setName(`Bản sao của ${board.name}`);
      setTargetWorkspaceId(board.workspace_id || workspaces[0]?.id || '');
      setIncludeCards(true);
      setError('');
    }
  }, [board, workspaces]);

  if (!isOpen || !board) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await apiClient<any>(`/boards/${board.id}/copy`, {
        method: 'POST',
        data: {
          name: name.trim(),
          targetWorkspaceId: targetWorkspaceId || board.workspace_id,
          includeCards,
        },
      });

      if (res.success && res.data) {
        onClose();
        router.push(`/boards/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể nhân bản Bảng công việc');
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
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Nhân bản Bảng (Copy Board)</h2>
            <p className="text-xs text-[#2b1572]/70">Tạo một bản sao mới với toàn bộ cấu trúc bảng</p>
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
              Tên Bảng mới <span className="text-[#c40000]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Bản sao - Sprint 1..."
              className="w-full px-3.5 py-2.5 text-xs glass-input font-bold text-[#2b1572]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
              Không gian làm việc đích
            </label>
            <select
              value={targetWorkspaceId}
              onChange={(e) => setTargetWorkspaceId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs glass-input font-semibold text-[#2b1572]"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} {ws.id === board.workspace_id ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#2b1572] cursor-pointer">
              <input
                type="checkbox"
                checked={includeCards}
                onChange={(e) => setIncludeCards(e.target.checked)}
                className="w-4 h-4 rounded text-[#2b1572] focus:ring-[#2b1572] cursor-pointer"
              />
              <span>Sao chép cả các Thẻ công việc (Cards), Checklists và Nhãn</span>
            </label>
            <p className="text-[11px] text-[#2b1572]/60 mt-0.5 pl-6">
              Nếu bỏ chọn, bảng mới sẽ chỉ giữ nguyên danh sách các cột (Lists) và nhãn trống.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
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
                  <span>Đang sao chép...</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Tạo bản sao</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
