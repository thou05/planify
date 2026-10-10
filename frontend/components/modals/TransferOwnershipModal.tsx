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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-6 sm:p-7 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Chuyển giao Chủ sở hữu</h2>
            <p className="text-xs text-slate-500">Ủy quyền quản trị cao nhất cho thành viên khác</p>
          </div>
        </div>

        <div className="p-3 mb-5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong>Lưu ý quan trọng:</strong> Sau khi chuyển quyền, bạn sẽ trở thành <strong>Quản trị viên (Admin)</strong>. Chỉ Chủ sở hữu mới mới có quyền xóa Workspace hoặc chuyển quyền tiếp theo.
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {eligibleMembers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500 mb-4">
              Không có thành viên nào khác trong Workspace để chuyển giao quyền. Vui lòng mời thêm thành viên trước.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Chọn thành viên nhận quyền Owner
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all"
              >
                {eligibleMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || 'Thành viên'} ({m.user?.email}) - Hiện tại: {m.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Nhập <span className="text-rose-600 font-mono">chuyen quyen</span> để xác nhận:
              </label>
              <input
                type="text"
                required
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="chuyen quyen"
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
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
                disabled={isLoading || confirmText.trim().toLowerCase() !== 'chuyen quyen'}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-3.5 h-3.5" />
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
