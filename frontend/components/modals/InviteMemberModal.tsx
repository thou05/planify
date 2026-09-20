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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/20 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-strong p-6 sm:p-8 border border-white/60 relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Mời thành viên</h2>
            <p className="text-xs text-[#2b1572]/70">
              Thêm cộng tác viên vào {workspaceName ? <strong>{workspaceName}</strong> : 'Workspace'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium">
            {error}
          </div>
        )}

        {successInfo ? (
          <div className="space-y-4 my-2">
            <div className="p-4 rounded-xl bg-[#358200]/10 border border-[#358200]/20 text-[#358200] text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successInfo.message}</span>
            </div>

            {successInfo.inviteLink && (
              <div className="p-4 rounded-xl bg-white/50 border border-white/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2b1572]/70 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#2b1572]" />
                    Đường dẫn mời tham gia:
                  </span>
                  <span className="text-[10px] text-[#2b1572]/60">Hiệu lực 7 ngày</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={successInfo.inviteLink}
                    className="w-full px-3 py-2 text-xs glass-input text-[#2b1572] font-mono bg-white/60 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 btn-primary text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
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

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="px-4 py-2.5 btn-secondary text-xs font-semibold cursor-pointer"
              >
                Mời thêm người khác
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 btn-primary text-xs font-semibold cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
                Địa chỉ Email <span className="text-[#c40000]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhanvien@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-medium"
                />
              </div>
              <p className="text-[11px] text-[#2b1572]/60 mt-1">
                Nếu người dùng đã có tài khoản, họ sẽ được thêm ngay. Nếu chưa, hệ thống sẽ tạo link mời.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
                Vai trò phân quyền
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('MEMBER')}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    role === 'MEMBER'
                      ? 'bg-white/80 border-[#2b1572] shadow-sm'
                      : 'bg-white/40 border-white/60 hover:bg-white/60'
                  }`}
                >
                  <div className="text-xs font-bold text-[#2b1572] mb-0.5">Thành viên (Member)</div>
                  <div className="text-[11px] text-[#2b1572]/70 leading-tight">
                    Có thể xem, tạo và chỉnh sửa Board, List, Card được giao.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    role === 'ADMIN'
                      ? 'bg-white/80 border-[#2b1572] shadow-sm'
                      : 'bg-white/40 border-white/60 hover:bg-white/60'
                  }`}
                >
                  <div className="text-xs font-bold text-[#2b1572] mb-0.5 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Quản trị (Admin)
                  </div>
                  <div className="text-[11px] text-[#2b1572]/70 leading-tight">
                    Quản lý thành viên, cài đặt Workspace và toàn bộ Board.
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2.5 btn-secondary text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="px-5 py-2.5 btn-primary text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
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
