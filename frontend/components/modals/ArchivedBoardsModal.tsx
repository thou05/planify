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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/20 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-strong p-6 sm:p-8 border border-white/60 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shadow-md">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Bảng công việc đã lưu trữ</h2>
            <p className="text-xs text-[#2b1572]/70">Khôi phục hoặc xóa vĩnh viễn các bảng lưu trữ</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#2b1572]" />
            <span className="text-xs text-[#2b1572]/60 font-semibold">Đang tải danh sách...</span>
          </div>
        ) : archivedBoards.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-[#2b1572]/40 mx-auto" />
            <p className="text-xs text-[#2b1572]/60 font-medium">
              Không có Bảng nào đang ở trạng thái Lưu trữ trong Không gian này.
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-[#2b1572]/10 my-2">
            {archivedBoards.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-[#2b1572] line-clamp-1">{b.name}</h4>
                  {b.description && (
                    <p className="text-[11px] text-[#2b1572]/60 line-clamp-1 mt-0.5">{b.description}</p>
                  )}
                  <div className="text-[10px] text-[#2b1572]/50 mt-1">
                    {b._count?.lists || 0} danh sách • {b._count?.members || 0} thành viên
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(b.id)}
                    disabled={actionLoadingId === b.id}
                    className="px-3 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                    className="p-1.5 text-[#2b1572]/40 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-lg transition-colors cursor-pointer"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 mt-2 border-t border-[#2b1572]/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 btn-secondary text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
