'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { User, Mail, Lock, Eye, EyeOff, LayoutGrid, ArrowRight, Loader2 } from 'lucide-react';

function getSafeRedirectUrl(url: string | null): string {
  if (!url) return '/dashboard';
  // Ensure the redirect is a relative path and not a protocol-relative (//) or external URL
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
    return url;
  }
  return '/dashboard';
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'));
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-panel-strong p-8 sm:p-10 border border-white/60">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-lg mb-3 shadow-[#2b1572]/20">
          <LayoutGrid className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2b1572]">Tạo tài khoản Planify</h1>
        <p className="text-sm text-[#2b1572]/70 mt-1">
          Bắt đầu trải nghiệm quản lý công việc thế hệ mới
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
            Họ và tên
          </label>
          <div className="relative">
            <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full pl-11 pr-4 py-3 text-sm glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@example.com"
              className="w-full pl-11 pr-4 py-3 text-sm glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full pl-11 pr-11 py-3 text-sm glass-input placeholder:text-[#2b1572]/30 text-[#2b1572] font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40 hover:text-[#2b1572] transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 btn-primary text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang khởi tạo tài khoản...</span>
              </>
            ) : (
              <>
                <span>Đăng ký tài khoản</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-[#2b1572]/10 text-center">
        <p className="text-sm text-[#2b1572]/70">
          Đã có tài khoản?{' '}
          <Link
            href={`/login${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
            className="font-bold text-[#2b1572] hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Glow Orbs background effect */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-[#a6d1fd]/30 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-[#a000c8]/20 blur-3xl pointer-events-none -z-10" />

      <Suspense fallback={<div className="text-sm font-bold text-[#2b1572]">Đang tải...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
