'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, LayoutGrid, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Glow Orbs background effect */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#a6d1fd]/30 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#a000c8]/20 blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md glass-panel-strong p-8 sm:p-10 border border-white/60">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-lg mb-3 shadow-[#2b1572]/20">
            <LayoutGrid className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2b1572]">Đăng nhập Planify</h1>
          <p className="text-sm text-[#2b1572]/70 mt-1">
            Nền tảng quản lý công việc và cộng tác thời gian thực
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
                placeholder="••••••••"
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
              className="w-full py-3.5 px-4 glass-btn-primary flex items-center justify-center gap-2 cursor-pointer font-semibold text-[#2b1572] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#2b1572]/10 text-center">
          <p className="text-sm text-[#2b1572]/70">
            Chưa có tài khoản?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#2b1572] hover:underline"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
