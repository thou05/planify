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
    <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-8 sm:p-10 relative">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-2xs mb-3">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Tạo tài khoản Planify</h1>
        <p className="text-xs text-slate-500 mt-1 text-center">
          Bắt đầu trải nghiệm quản lý công việc thế hệ mới
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Họ và tên
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@example.com"
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full pl-10 pr-10 py-2.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-slate-800 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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

      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-500">
          Đã có tài khoản?{' '}
          <Link
            href={`/login${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
            className="font-semibold text-slate-900 hover:underline"
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
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-grid-pattern">
      <Suspense fallback={<div className="text-xs font-semibold text-slate-700">Đang tải...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
