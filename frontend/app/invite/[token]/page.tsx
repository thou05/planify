'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Users,
  Loader2,
  Calendar,
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

  const [inviteData, setInviteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await apiClient<any>(`/workspaces/invites/${token}`);
        if (res.success && res.data) {
          setInviteData(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Lời mời không tồn tại hoặc đã hết hạn');
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
      const res = await apiClient<any>(`/workspaces/invites/${token}/accept`, {
        method: 'POST',
      });

      if (res.success && res.data) {
        const workspaceId = res.data.workspaceId || inviteData?.workspace?.id;
        router.push(`/workspaces/${workspaceId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể chấp nhận lời mời');
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-[#a6d1fd]/30 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#a000c8]/20 blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md glass-strong p-8 sm:p-10 border border-white/60 relative text-center">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-lg shadow-[#2b1572]/20">
            <Layers className="w-8 h-8" />
          </div>
        </div>

        {isLoading || authLoading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2b1572]" />
            <span className="text-xs font-semibold text-[#2b1572]/70">Đang xác thực lời mời...</span>
          </div>
        ) : error ? (
          <div className="space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#c40000]/10 text-[#c40000] flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2b1572]">Lời mời không khả dụng</h2>
              <p className="text-xs text-[#c40000] mt-1 font-medium">{error}</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary text-xs font-semibold"
            >
              <span>Về Bảng điều khiển</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : inviteData ? (
          <div className="space-y-6">
            <div>
              <span className="badge-info text-xs px-3 py-1 rounded-full font-semibold inline-block mb-2">
                Lời mời tham gia Không gian làm việc
              </span>
              <h1 className="text-2xl font-extrabold text-[#2b1572] tracking-tight">
                {inviteData.workspace?.name}
              </h1>
              {inviteData.workspace?.description && (
                <p className="text-xs text-[#2b1572]/70 mt-1 max-w-sm mx-auto line-clamp-2">
                  {inviteData.workspace.description}
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white/50 border border-white/70 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2b1572]/60 font-medium">Chủ sở hữu:</span>
                <span className="font-bold text-[#2b1572]">
                  {inviteData.workspace?.owner?.name || 'Admin'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2b1572]/60 font-medium">Vai trò được giao:</span>
                <span className="font-bold text-[#2b1572] flex items-center gap-1">
                  {inviteData.role === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-[#2b1572]" />}
                  {inviteData.role === 'ADMIN' ? 'Quản trị viên (Admin)' : 'Thành viên (Member)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2b1572]/60 font-medium">Hạn hiệu lực:</span>
                <span className="text-[#2b1572]/80 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(inviteData.expired_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {user ? (
              <div className="space-y-3">
                <div className="text-xs text-[#2b1572]/70">
                  Bạn đang đăng nhập với tư cách: <strong>{user.name}</strong> ({user.email})
                </div>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full py-3 px-4 btn-primary text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tham gia...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Chấp nhận & Gia nhập Workspace</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#2b1572]/70">
                  Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục tham gia Không gian làm việc này.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/login?redirect=/invite/${token}`}
                    className="w-full py-3 btn-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Đăng nhập ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/register?redirect=/invite/${token}`}
                    className="w-full py-2.5 btn-secondary text-xs font-semibold flex items-center justify-center"
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
