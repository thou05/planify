'use client';

import React, { useState } from 'react';
import { X, Crown, AlertTriangle, Loader2, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
  members: any[];
  currentUserId: string;
  onTransferred: () => void;
}

export default function TransferOwnershipModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  members,
  currentUserId,
  onTransferred,
}: TransferOwnershipModalProps) {
  const eligibleMembers = members.filter((m) => m.user_id !== currentUserId);
  const [selectedUserId, setSelectedUserId] = useState(eligibleMembers[0]?.user_id || '');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Vui lòng chọn một thành viên để chuyển giao quyền');
      return;
    }

    if (confirmText.trim().toLowerCase() !== 'chuyen quyen') {
      setError('Vui lòng nhập chính xác cụm từ "chuyen quyen" để xác nhận');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await apiClient(`/workspaces/${workspaceId}/transfer-ownership`, {
        method: 'POST',
        data: {
          newOwnerId: selectedUserId,
        },
      });

      if (res.success) {
        onTransferred();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể chuyển quyền Chủ sở hữu');
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

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shadow-md">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Chuyển giao Chủ sở hữu</h2>
            <p className="text-xs text-[#2b1572]/70">Ủy quyền quản trị cao nhất cho thành viên khác</p>
          </div>
        </div>

        <div className="p-3.5 mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong>Lưu ý quan trọng:</strong> Sau khi chuyển quyền, bạn sẽ trở thành <strong>Quản trị viên (Admin)</strong>. Chỉ Chủ sở hữu mới mới có quyền xóa Workspace hoặc chuyển quyền tiếp theo.
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium">
            {error}
          </div>
        )}

        {eligibleMembers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-[#2b1572]/70 mb-4">
              Không có thành viên nào khác trong Workspace để chuyển giao quyền. Vui lòng mời thêm thành viên trước.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 btn-secondary text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
                Chọn thành viên nhận quyền Owner
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572] font-semibold"
              >
                {eligibleMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || 'Thành viên'} ({m.user?.email}) - Hiện tại: {m.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
                Nhập <span className="text-[#c40000] font-mono">chuyen quyen</span> để xác nhận:
              </label>
              <input
                type="text"
                required
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="chuyen quyen"
                className="w-full px-3.5 py-2.5 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-mono"
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
                disabled={isLoading || confirmText.trim().toLowerCase() !== 'chuyen quyen'}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Xác nhận chuyển quyền</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
