'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Loader2, ArrowRight, RotateCcw } from 'lucide-react';

export interface OtpModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export default function OtpModal({
  isOpen,
  email,
  onClose,
  onVerify,
  onResendOtp,
  isLoading = false,
  title = 'Xác thực tài khoản',
  description = 'Nhập mã OTP gồm 6 chữ số vừa được gửi đến email của bạn để tiếp tục',
}: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset and focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setTimer(60);
      setError('');
      const timeout = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timer]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    setError('');
    const cleanVal = val.replace(/\D/g, '');

    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    if (cleanVal.length > 1) {
      handlePastedString(cleanVal, index);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal[0];
    setDigits(newDigits);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedString = (pasted: string, startIndex: number = 0) => {
    const clean = pasted.replace(/\D/g, '');
    if (!clean) return;

    const newDigits = [...digits];
    for (let i = 0; i < clean.length && startIndex + i < 6; i++) {
      newDigits[startIndex + i] = clean[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(startIndex + clean.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePastedString(pasted, 0);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setError('');
    try {
      await onVerify(otp);
    } catch (err: any) {
      setError(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn');
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;

    setError('');
    setIsResending(true);
    try {
      await onResendOtp();
      setTimer(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại mã OTP, vui lòng thử lại sau');
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 sm:p-8 relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#f28d8d] flex items-center justify-center mx-auto mb-3 shadow-xs border border-rose-100">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{description}</p>
          <div className="mt-2 text-xs font-semibold text-slate-800 bg-slate-50 py-1.5 px-3 rounded-md border border-slate-200 inline-block">
            {email}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 6 OTP Boxes */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-6">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                autoComplete="one-time-code"
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg border transition-all outline-none ${
                  digit
                    ? 'border-[#f28d8d] bg-rose-50/40 text-slate-900 ring-2 ring-[#f28d8d]/25'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-[#f28d8d] focus:ring-2 focus:ring-[#f28d8d]/30'
                } disabled:opacity-50`}
              />
            ))}
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={!isComplete || isLoading}
            className="w-full py-2.5 px-4 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Xác nhận & Hoàn tất</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Resend Countdown */}
        <div className="mt-6 text-center text-xs">
          {timer > 0 ? (
            <p className="text-slate-500">
              Chưa nhận được mã? Gửi lại sau{' '}
              <span className="font-semibold text-[#d86969]">{timer}s</span>
            </p>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-slate-500">Chưa nhận được mã?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || isLoading}
                className="font-semibold text-[#d86969] hover:text-[#f28d8d] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

