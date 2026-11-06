'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import OtpModal from '@/components/auth/OtpModal';
import { DoodleRocket } from '@/components/playful/DoodleIcons';

function getSafeRedirectUrl(url: string | null): string {
  if (!url) return '/dashboard';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
    return url;
  }
  return '/dashboard';
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect'));
  const { sendRegisterOtp, verifyRegisterOtp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);

    try {
      await sendRegisterOtp(email.trim().toLowerCase(), name.trim());
      setIsOtpModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsVerifying(true);
    try {
      await verifyRegisterOtp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        otp,
      });
      setIsOtpModalOpen(false);
      router.push(redirectUrl);
    } catch (err: any) {
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    await sendRegisterOtp(email.trim().toLowerCase(), name.trim());
  };

  return (
    <>
      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/60 dark:border-slate-700/60 p-8 sm:p-10 relative transition-all duration-300">
        {/* Rocket Badge Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f28d8d] to-[#ffc0cb] flex items-center justify-center shadow-md shadow-rose-200/50 dark:shadow-rose-950/30 mb-3 animate-doodle-bob-gentle">
            <DoodleRocket className="w-10 h-10" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tạo tài khoản Planify</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center max-w-xs">
            Bắt đầu trải nghiệm quản lý công việc thế hệ mới đầy cảm hứng
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In */}
        <div className="mb-6">
          <GoogleSignInButton text="Đăng ký với Google" />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/85 dark:bg-slate-900/80 px-3 text-slate-400 dark:text-slate-500 font-medium">
                hoặc đăng ký bằng email
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Họ và tên
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-2 focus:ring-[#87ceeb]/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenban@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-2 focus:ring-[#87ceeb]/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-2 focus:ring-[#87ceeb]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-rose-200/50 dark:shadow-none active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi mã xác thực...</span>
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

        <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Đã có tài khoản?{' '}
            <Link
              href={`/login${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="font-semibold text-[#d86969] hover:text-[#f28d8d] hover:underline transition-colors"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={isOtpModalOpen}
        email={email}
        onClose={() => setIsOtpModalOpen(false)}
        onVerify={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        isLoading={isVerifying}
        title="Xác thực đăng ký tài khoản"
        description="Vui lòng nhập mã OTP 6 chữ số đã được gửi tới email để hoàn tất đăng ký"
      />
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đang tải...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
