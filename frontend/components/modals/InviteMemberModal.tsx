'use client';

import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, Copy, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
  onSuccess: () => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    type: 'ADDED_DIRECTLY' | 'INVITE_CREATED' | 'INVITE_EXISTS';
    message: string;
    inviteLink?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      const res = await apiClient<any>(`/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        data: {
          email: email.trim().toLowerCase(),
          role,
          directAdd: true,
        },
      });

      if (res.success && res.data) {
        const data = res.data;
        let inviteLink: string | undefined;

        if (data.invite?.token) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          inviteLink = `${origin}/invite/${data.invite.token}`;
        }

        setSuccessInfo({
          type: data.type,
          message: data.message || 'Thao tác thành công!',
          inviteLink,
        });

        setEmail('');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể mời thành viên, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successInfo?.inviteLink) {
      navigator.clipboard.writeText(successInfo.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccessInfo(null);
    setEmail('');
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-slate-300 rounded-lg p-6 sm:p-7 relative shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-2xs">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Mời thành viên</h2>
            <p className="text-xs text-slate-500">
              Thêm cộng tác viên vào {workspaceName ? <strong>{workspaceName}</strong> : 'Workspace'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {successInfo ? (
          <div className="space-y-4 my-2">
            <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successInfo.message}</span>
            </div>

            {successInfo.inviteLink && (
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                    Đường dẫn mời tham gia:
                  </span>
                  <span className="text-[10px] text-slate-500">Hiệu lực 7 ngày</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={successInfo.inviteLink}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Mời thêm người khác
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Địa chỉ Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhanvien@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Nếu người dùng đã có tài khoản, họ sẽ được thêm ngay. Nếu chưa, hệ thống sẽ tạo link mời.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vai trò phân quyền
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('MEMBER')}
                  className={`p-3 rounded-md text-left border transition-all cursor-pointer ${
                    role === 'MEMBER'
                      ? 'bg-slate-100 border-slate-900 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 mb-0.5">Thành viên (Member)</div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    Có thể xem, tạo và chỉnh sửa Board, List, Card được giao.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`p-3 rounded-md text-left border transition-all cursor-pointer ${
                    role === 'ADMIN'
                      ? 'bg-slate-100 border-slate-900 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 mb-0.5 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Quản trị (Admin)
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    Quản lý thành viên, cài đặt Workspace và toàn bộ Board.
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Gửi lời mời</span>
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
