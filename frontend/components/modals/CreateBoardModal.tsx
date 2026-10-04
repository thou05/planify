'use client';

import React, { useState, useEffect } from 'react';
import { X, Kanban, Loader2, Star, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { WorkspaceItem } from '../layout/Sidebar';

interface CreateBoardModalProps {
  isOpen: boolean;
  workspaceId?: string;
  workspaces: WorkspaceItem[];
  onClose: () => void;
  onCreated: (board: any) => void;
  onOpenImport?: (workspaceId?: string) => void;
}

export default function CreateBoardModal({
  isOpen,
  workspaceId,
  workspaces,
  onClose,
  onCreated,
  onOpenImport,
}: CreateBoardModalProps) {
  const [targetWsId, setTargetWsId] = useState<string>(workspaceId || (workspaces[0]?.id ?? ''));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      setTargetWsId(workspaceId);
    } else if (workspaces.length > 0) {
      const savedWs =
        typeof window !== 'undefined'
          ? localStorage.getItem('planify_active_workspace_id')
          : null;
      if (savedWs && workspaces.some((w) => w.id === savedWs)) {
        setTargetWsId(savedWs);
      } else {
        setTargetWsId(workspaces[0].id);
      }
    }
  }, [workspaceId, isOpen, workspaces]);

  if (!isOpen) return null;

  const currentSelectedWsId = targetWsId || workspaceId || workspaces[0]?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentSelectedWsId) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await apiClient(`/workspaces/${currentSelectedWsId}/boards`, {
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          is_favorite: isFavorite,
        },
      });

      if (res.success && res.data) {
        onCreated(res.data);
        setName('');
        setDescription('');
        setIsFavorite(false);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo Board, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-2xs">
            <Kanban className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Tạo Board mới</h3>
            <p className="text-xs text-slate-500">Bảng Kanban quản lý công việc và tiến độ</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn Workspace *
            </label>
            <select
              value={currentSelectedWsId}
              onChange={(e) => setTargetWsId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-medium text-slate-900 focus:outline-none focus:border-slate-800"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên Board *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Dự án Sprint 1"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder:text-slate-400 font-medium text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mô tả (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu của board này..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder:text-slate-400 font-medium text-slate-900 resize-none focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_fav"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
            />
            <label htmlFor="is_fav" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              <span>Đánh dấu là Board yêu thích</span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-between gap-3">
            {onOpenImport ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport(currentSelectedWsId);
                }}
                className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Nhập Bảng từ tệp JSON hoặc Excel"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Nhập từ tệp (Import)</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading || !currentSelectedWsId}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isLoading ? 'Đang tạo...' : 'Tạo Board'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
