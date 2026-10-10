'use client';

import React, { useState, useEffect } from 'react';
import { X, Archive, RotateCcw, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ArchivedBoardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onRestored: () => void;
}

export default function ArchivedBoardsModal({
  isOpen,
  onClose,
  workspaceId,
  onRestored,
}: ArchivedBoardsModalProps) {
  const [archivedBoards, setArchivedBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchArchived = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<any[]>(`/workspaces/${workspaceId}/boards/archived`);
      if (res.success && res.data) {
        setArchivedBoards(res.data);
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchArchived();
    }
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleRestore = async (boardId: string) => {
    setActionLoadingId(boardId);
    try {
      const res = await apiClient(`/boards/${boardId}/restore`, {
        method: 'POST',
      });
      if (res.success) {
        fetchArchived();
        onRestored();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể khôi phục Bảng');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePermanently = async (boardId: string, boardName: string) => {
    if (!confirm(`Hành động này sẽ XÓA VĨNH VIỄN Bảng "${boardName}" cùng toàn bộ thẻ công việc. Bạn có chắc chắn muốn xóa?`)) {
      return;
    }

    setActionLoadingId(boardId);
    try {
      const res = await apiClient(`/boards/${boardId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        fetchArchived();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa Bảng');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-slate-300 rounded-lg p-6 sm:p-7 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Bảng công việc đã lưu trữ</h2>
            <p className="text-xs text-slate-500">Khôi phục hoặc xóa vĩnh viễn các bảng lưu trữ</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            <span className="text-xs text-slate-500 font-medium">Đang tải danh sách...</span>
          </div>
        ) : archivedBoards.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Không có Bảng nào đang ở trạng thái Lưu trữ trong Không gian này.
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 my-2">
            {archivedBoards.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{b.name}</h4>
                  {b.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{b.description}</p>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {b._count?.lists || 0} danh sách • {b._count?.members || 0} thành viên
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(b.id)}
                    disabled={actionLoadingId === b.id}
                    className="px-3 py-1.5 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    {actionLoadingId === b.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Khôi phục</span>
                  </button>

                  <button
                    onClick={() => handleDeletePermanently(b.id, b.name)}
                    disabled={actionLoadingId === b.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 mt-2 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
