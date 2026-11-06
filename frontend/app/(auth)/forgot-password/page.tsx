'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, KeyRound, ArrowRight, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';

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

  // Focus on first OTP input when transitioning to Step 2
  useEffect(() => {
    if (step === 2) {
      setTimer(60);
      const timeout = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  // Countdown timer for step 2
  useEffect(() => {
    if (step !== 2 || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle Step 1: Request password reset OTP
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

  // Handle Step 2: Resend OTP
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

  // Handle OTP digit changes
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

  // Handle Step 2: Reset password
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
    <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-8 sm:p-10 relative">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#f28d8d] flex items-center justify-center text-white shadow-xs mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Quên mật khẩu</h1>
        <p className="text-xs text-slate-500 mt-1 text-center">
          {step === 1
            ? 'Nhập địa chỉ email của bạn để nhận mã xác thực đặt lại mật khẩu'
            : 'Nhập mã xác thực 6 số và thiết lập mật khẩu mới của bạn'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email tài khoản
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenban@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
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
          <div className="text-center p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Mã xác thực đã gửi tới</p>
            <p className="text-xs font-semibold text-slate-800">{email}</p>
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

          {/* 6 OTP Boxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
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
                  className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-bold rounded-lg border transition-all outline-none ${
                    digit
                      ? 'border-[#f28d8d] bg-rose-50/40 text-slate-900 ring-2 ring-[#f28d8d]/25'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#f28d8d] focus:ring-2 focus:ring-[#f28d8d]/30'
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Resend button */}
            <div className="text-center mt-2 text-xs">
              {timer > 0 ? (
                <p className="text-slate-500">
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || otpDigits.some((d) => !d) || !newPassword || !confirmPassword}
              className="w-full py-2.5 px-4 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
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

      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
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
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-grid-pattern">
      <Suspense fallback={<div className="text-xs font-semibold text-slate-700">Đang tải...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

