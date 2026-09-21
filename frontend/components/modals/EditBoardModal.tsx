'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, Users, Lock, Globe } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface EditBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: any;
  onUpdated: () => void;
}

export default function EditBoardModal({
  isOpen,
  onClose,
  board,
  onUpdated,
}: EditBoardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'WORKSPACE' | 'PRIVATE' | 'PUBLIC'>('WORKSPACE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

    try {
      const res = await apiClient(`/boards/${board.id}`, {
        method: 'PATCH',
        data: {
          name: name.trim(),
          description: description.trim() || '',
          visibility,
        },
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
            <h2 className="text-xl font-bold text-[#2b1572]">Cài đặt Bảng công việc</h2>
            <p className="text-xs text-[#2b1572]/70">Cập nhật thông tin và quyền hiển thị của Board</p>
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
              Tên Bảng <span className="text-[#c40000]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sprint 1 - Phát triển MVP..."
              className="w-full px-3.5 py-2.5 text-xs glass-input font-bold text-[#2b1572]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
              Mô tả Bảng
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu của Bảng này..."
              className="w-full px-3.5 py-2.5 text-xs glass-input font-medium text-[#2b1572] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
              Quyền hiển thị (Visibility)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('WORKSPACE')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  visibility === 'WORKSPACE'
                    ? 'bg-white/90 border-[#2b1572] shadow-xs'
                    : 'bg-white/40 border-white/60 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#2b1572] mb-0.5">
                  <Users className="w-3 h-3" />
                  <span>Không gian</span>
                </div>
                <div className="text-[10px] text-[#2b1572]/65">Thành viên WS</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  visibility === 'PRIVATE'
                    ? 'bg-white/90 border-[#2b1572] shadow-xs'
                    : 'bg-white/40 border-white/60 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#2b1572] mb-0.5">
                  <Lock className="w-3 h-3" />
                  <span>Riêng tư</span>
                </div>
                <div className="text-[10px] text-[#2b1572]/65">Thành viên Board</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  visibility === 'PUBLIC'
                    ? 'bg-white/90 border-[#2b1572] shadow-xs'
                    : 'bg-white/40 border-white/60 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#2b1572] mb-0.5">
                  <Globe className="w-3 h-3" />
                  <span>Công khai</span>
                </div>
                <div className="text-[10px] text-[#2b1572]/65">Bất kỳ ai có link</div>
              </button>
            </div>
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
