'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Layers,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Users,
  Loader2,
  Calendar,
  XCircle,
  Sparkles,
} from 'lucide-react';

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [inviteType, setInviteType] = useState<'BOARD' | 'WORKSPACE' | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectedSuccess, setRejectedSuccess] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      setIsLoading(true);
      setError('');

      // 1. Thử kiểm tra xem có phải lời mời Board không
      try {
        const boardRes = await apiClient<any>(`/boards/invites/${token}`);
        if (boardRes.success && boardRes.data) {
          setInviteType('BOARD');
          setInviteData(boardRes.data);
          setIsLoading(false);
          return;
        }
      } catch {
        // Không phải Board invite hoặc lỗi
      }

      // 2. Thử kiểm tra xem có phải lời mời Workspace không
      try {
        const wsRes = await apiClient<any>(`/workspaces/invites/${token}`);
        if (wsRes.success && wsRes.data) {
          setInviteType('WORKSPACE');
          setInviteData(wsRes.data);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Lời mời không tồn tại, đã hết hạn hoặc không còn khả dụng');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setIsAccepting(true);
    setError('');

    try {
      if (inviteType === 'BOARD') {
        const res = await apiClient<any>(`/boards/invites/${token}/accept`, {
          method: 'POST',
        });
        if (res.success && res.data) {
          const boardId = res.data.boardId || inviteData?.board_id || inviteData?.board?.id;
          router.push(`/boards/${boardId}`);
        }
      } else {
        const res = await apiClient<any>(`/workspaces/invites/${token}/accept`, {
          method: 'POST',
        });
        if (res.success && res.data) {
          const workspaceId = res.data.workspaceId || inviteData?.workspace?.id;
          router.push(`/workspaces/${workspaceId}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể chấp nhận lời mời');
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn từ chối lời mời này?')) return;

    setIsRejecting(true);
    setError('');

    try {
      if (inviteType === 'BOARD') {
        await apiClient<any>(`/boards/invites/${token}/reject`, {
          method: 'POST',
        });
      } else {
        await apiClient<any>(`/workspaces/invites/${token}/reject`, {
          method: 'POST',
        });
      }
      setRejectedSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Không thể từ chối lời mời');
    } finally {
      setIsRejecting(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên (Admin)';
      case 'EDITOR':
        return 'Biên tập viên (Editor)';
      case 'VIEWER':
        return 'Chỉ xem (Viewer)';
      case 'MEMBER':
        return 'Thành viên (Member)';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-8 sm:p-10 relative text-center">
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-2xs">
            {inviteType === 'BOARD' ? (
              <LayoutGrid className="w-6 h-6" />
            ) : (
              <Layers className="w-6 h-6" />
            )}
          </div>
        </div>

        {isLoading || authLoading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
            <span className="text-xs font-medium text-slate-500">
              Đang xác thực thông tin lời mời...
            </span>
          </div>
        ) : rejectedSuccess ? (
          <div className="space-y-5">
            <div className="w-10 h-10 mx-auto rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Đã từ chối lời mời</h2>
              <p className="text-xs text-slate-500 mt-1">
                Bạn đã từ chối tham gia dự án này. Lời mời đã được đóng.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <span>Về Bảng điều khiển</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : error ? (
          <div className="space-y-5">
            <div className="w-10 h-10 mx-auto rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Lời mời không khả dụng</h2>
              <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <span>Về Bảng điều khiển</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : inviteData ? (
          <div className="space-y-6">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-2">
                {inviteType === 'BOARD'
                  ? 'Lời mời tham gia Bảng công việc'
                  : 'Lời mời tham gia Không gian làm việc'}
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {inviteType === 'BOARD' ? inviteData.board?.name : inviteData.workspace?.name}
              </h1>
              {inviteType === 'BOARD' && inviteData.board?.workspace?.name && (
                <p className="text-xs text-slate-500 mt-0.5 font-normal">
                  Thuộc Không gian: <strong className="text-slate-800 font-semibold">{inviteData.board.workspace.name}</strong>
                </p>
              )}
              {((inviteType === 'BOARD' ? inviteData.board?.description : inviteData.workspace?.description)) && (
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto line-clamp-2">
                  {inviteType === 'BOARD'
                    ? inviteData.board?.description
                    : inviteData.workspace?.description}
                </p>
              )}
            </div>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Người gửi lời mời:</span>
                <span className="font-semibold text-slate-800">
                  {inviteType === 'BOARD'
                    ? inviteData.inviter?.name || 'Thành viên'
                    : inviteData.workspace?.owner?.name || 'Admin'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Vai trò được giao:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  {getRoleDisplayName(inviteData.role)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Hạn hiệu lực:</span>
                <span className="text-slate-700 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(inviteData.expired_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {user ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  Đang đăng nhập: <strong className="text-slate-800 font-semibold">{user.name}</strong> ({user.email})
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isRejecting || isAccepting}
                    className="w-full py-2.5 px-3 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isRejecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>Từ chối</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isAccepting || isRejecting}
                    className="w-full py-2.5 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tham gia...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Chấp nhận</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục tham gia.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/login?redirect=/invite/${token}`}
                    className="w-full py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Đăng nhập ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/register?redirect=/invite/${token}`}
                    className="w-full py-2.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    Đăng ký tài khoản mới
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
