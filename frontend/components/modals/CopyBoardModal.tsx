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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-6 sm:p-7 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-[#87ceeb] flex items-center justify-center text-slate-900 shadow-2xs">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Nhân bản Bảng (Copy Board)</h2>
            <p className="text-xs text-slate-500">Tạo một bản sao mới với toàn bộ cấu trúc bảng</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên Bảng mới <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Bản sao - Sprint 1..."
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Không gian làm việc đích
            </label>
            <select
              value={targetWorkspaceId}
              onChange={(e) => setTargetWorkspaceId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} {ws.id === board.workspace_id ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCards}
                onChange={(e) => setIncludeCards(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] accent-[#f28d8d] cursor-pointer"
              />
              <span>Sao chép cả các Thẻ công việc (Cards), Checklists và Nhãn</span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              Nếu bỏ chọn, bảng mới sẽ chỉ giữ nguyên danh sách các cột (Lists) và nhãn trống.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang sao chép...</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
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
