'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, Users, Lock, Globe, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface EditBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: any;
  onUpdated: () => void;
  onOpenAppearance?: () => void;
}

export default function EditBoardModal({
  isOpen,
  onClose,
  board,
  onUpdated,
  onOpenAppearance,
}: EditBoardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'WORKSPACE' | 'PRIVATE' | 'PUBLIC'>('WORKSPACE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isGuest = Boolean(
    board?.isGuest ||
      (board && !board?.isWorkspaceOwner && !board?.isWorkspaceMember && board?.currentUserBoardRole !== 'ADMIN')
  );

  const canChangeVisibility = Boolean(
    !isGuest &&
      (board?.canChangeVisibility ??
        (board?.currentUserBoardRole === 'ADMIN' || board?.isWorkspaceOwner || board?.canManageMembers))
  );

  useEffect(() => {
    if (board) {
      setName(board.name || '');
      setDescription(board.description || '');
      setVisibility(board.visibility || 'WORKSPACE');
      setError('');
    }
  }, [board]);

  if (!isOpen || !board) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    const payload: any = {
      name: name.trim(),
      description: description.trim() || '',
    };
    if (canChangeVisibility) {
      payload.visibility = visibility;
    }

    try {
      const res = await apiClient(`/boards/${board.id}`, {
        method: 'PATCH',
        data: payload,
      });

      if (res.success) {
        onUpdated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật Bảng công việc');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-300 shadow-xl p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-md bg-[#f28d8d] flex items-center justify-center text-white shadow-2xs">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Cài đặt Bảng công việc</h2>
            <p className="text-xs text-slate-500">Cập nhật thông tin và quyền hiển thị của Board</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên Bảng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sprint 1 - Phát triển MVP..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mô tả Bảng
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu của Bảng này..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-medium text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
            />
          </div>

          {/* Quick Appearance link */}
          {onOpenAppearance && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-[#87ceeb]/25 border border-[#87ceeb]/40 flex items-center justify-center text-slate-800 text-base shrink-0 overflow-hidden">
                  {board?.icon &&
                  (board.icon.startsWith('http') ||
                    board.icon.startsWith('data:image') ||
                    board.icon.startsWith('blob:')) ? (
                    <img src={board.icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    board?.icon || '🎨'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Hình nền & Biểu tượng (Favicon)
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {board?.icon
                      ? board.icon.startsWith('http') ||
                        board.icon.startsWith('data:image') ||
                        board.icon.startsWith('blob:')
                        ? 'Biểu tượng: Ảnh tải lên'
                        : `Biểu tượng: ${board.icon}`
                      : 'Chưa đặt biểu tượng'}
                    {board?.background ? ' • Có hình nền riêng' : ' • Nền mặc định'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAppearance();
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#d86969] bg-[#ffc0cb]/25 hover:bg-[#ffc0cb]/40 transition-colors cursor-pointer shrink-0"
              >
                Đổi giao diện →
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quyền hiển thị (Visibility)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!canChangeVisibility}
                onClick={() => setVisibility('WORKSPACE')}
                className={`p-2.5 rounded-md text-left border transition-all ${
                  !canChangeVisibility
                    ? 'opacity-65 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500'
                    : visibility === 'WORKSPACE'
                    ? 'bg-[#ffc0cb]/20 border-[#f28d8d] text-[#d86969] ring-1 ring-[#f28d8d]/30 font-semibold cursor-pointer'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Không gian</span>
                  </div>
                  {visibility === 'WORKSPACE' && <Check className="w-3.5 h-3.5 text-[#d86969]" />}
                </div>
                <div className="text-[10px] text-slate-500">Thành viên WS</div>
              </button>

              <button
                type="button"
                disabled={!canChangeVisibility}
                onClick={() => setVisibility('PRIVATE')}
                className={`p-2.5 rounded-md text-left border transition-all ${
                  !canChangeVisibility
                    ? 'opacity-65 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500'
                    : visibility === 'PRIVATE'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-200 font-semibold cursor-pointer'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Riêng tư</span>
                  </div>
                  {visibility === 'PRIVATE' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                </div>
                <div className="text-[10px] text-slate-500">Thành viên Board</div>
              </button>

              <button
                type="button"
                disabled={!canChangeVisibility}
                onClick={() => setVisibility('PUBLIC')}
                className={`p-2.5 rounded-md text-left border transition-all ${
                  !canChangeVisibility
                    ? 'opacity-65 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500'
                    : visibility === 'PUBLIC'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-200 font-semibold cursor-pointer'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Công khai</span>
                  </div>
                  {visibility === 'PUBLIC' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-slate-500">Bất kỳ ai có link</div>
              </button>
            </div>

            {!canChangeVisibility && (
              <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Chỉ Quản trị viên (Admin) hoặc Chủ sở hữu Workspace mới có quyền thay đổi quyền hiển thị của Board.</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
