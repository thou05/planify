'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { DoodleIdeaBulb } from '@/components/playful/DoodleIcons';

function ForgotPasswordForm() {
  const router = useRouter();
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus vào ô OTP đầu tiên khi chuyển sang bước 2
  useEffect(() => {
    if (step === 2) {
      setTimer(60);
      const timeout = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  // Bộ đếm ngược 60 giây ở bước 2
  useEffect(() => {
    if (step !== 2 || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step, timer]);

  // Bước 1: Yêu cầu gửi OTP đặt lại mật khẩu
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(cleanEmail);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;

    setError('');
    setIsResending(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setTimer(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại mã xác thực. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  // Xử lý nhập từng ô OTP và tự động chuyển ô tiếp theo
  const handleDigitChange = (index: number, val: string) => {
    setError('');
    const clean = val.replace(/\D/g, '');

    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    if (clean.length > 1) {
      handlePastedOtp(clean, index);
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean[0];
    setOtpDigits(updated);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Xử lý paste chuỗi OTP (hỗ trợ paste nhanh 6 số)
  const handlePastedOtp = (pasted: string, startIndex: number = 0) => {
    const clean = pasted.replace(/\D/g, '');
    if (!clean) return;

    const updated = [...otpDigits];
    for (let i = 0; i < clean.length && startIndex + i < 6; i++) {
      updated[startIndex + i] = clean[i];
    }
    setOtpDigits(updated);

    const nextIndex = Math.min(startIndex + clean.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Hỗ trợ phím Backspace, ArrowLeft, ArrowRight
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const updated = [...otpDigits];
        updated[index - 1] = '';
        setOtpDigits(updated);
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const updated = [...otpDigits];
        updated[index] = '';
        setOtpDigits(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Bước 2: Xác thực OTP và đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực OTP');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), otp, newPassword);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu không thành công. Vui lòng kiểm tra lại mã OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/60 dark:border-slate-700/60 p-8 sm:p-10 relative transition-all duration-300">
      {/* Idea Bulb Badge Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f28d8d] to-[#ffc0cb] flex items-center justify-center shadow-md shadow-rose-200/50 dark:shadow-rose-950/30 mb-3 animate-doodle-bob-gentle">
          <DoodleIdeaBulb className="w-10 h-10" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Quên mật khẩu</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center max-w-xs">
          {step === 1
            ? 'Nhập địa chỉ email của bạn để nhận mã xác thực đặt lại mật khẩu'
            : 'Nhập mã xác thực 6 số và thiết lập mật khẩu mới của bạn'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email tài khoản
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-rose-200/50 dark:shadow-none active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi mã...</span>
                </>
              ) : (
                <>
                  <span>Gửi mã xác thực</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-center p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Mã xác thực đã gửi tới</p>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{email}</p>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              className="mt-1 text-[11px] font-semibold text-[#d86969] hover:underline cursor-pointer"
            >
              Thay đổi email
            </button>
          </div>

          {/* 6 Ô Nhập OTP */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              Mã xác thực OTP (6 chữ số)
            </label>
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    handlePastedOtp(e.clipboardData.getData('text'), 0);
                  }}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-bold rounded-xl border transition-all outline-none ${
                    digit
                      ? 'border-[#f28d8d] bg-rose-50/40 dark:bg-rose-950/30 text-slate-900 dark:text-white ring-2 ring-[#f28d8d]/25'
                      : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:border-[#f28d8d] focus:ring-2 focus:ring-[#f28d8d]/30'
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Nút gửi lại mã */}
            <div className="text-center mt-2 text-xs">
              {timer > 0 ? (
                <p className="text-slate-500 dark:text-slate-400">
                  Gửi lại mã sau <span className="font-semibold text-[#d86969]">{timer}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending || isLoading}
                  className="font-semibold text-[#d86969] hover:text-[#f28d8d] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi lại...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Gửi lại mã xác thực</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-2 focus:ring-[#87ceeb]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-2 focus:ring-[#87ceeb]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || otpDigits.some((d) => !d) || !newPassword || !confirmPassword}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-rose-200/50 dark:shadow-none active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang cập nhật mật khẩu...</span>
                </>
              ) : (
                <>
                  <span>Đặt lại mật khẩu & Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đang tải...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
