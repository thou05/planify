'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading && !internalLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, internalLoading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const loading = isLoading || internalLoading;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2b1572]/35 backdrop-blur-md transition-all duration-300">
      {/* Click outside backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-[#2b1572]/20 text-center transform transition-all duration-200 scale-100 animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 rounded-full text-[#2b1572]/50 hover:text-[#2b1572] hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Badge */}
        <div className="flex justify-center mb-4">
          {variant === 'danger' && (
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>
          )}
          {variant === 'warning' && (
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>
          )}
          {variant === 'primary' && (
            <div className="w-14 h-14 rounded-2xl bg-[#2b1572]/10 border border-[#2b1572]/20 text-[#2b1572] flex items-center justify-center shadow-inner">
              <HelpCircle className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-[#2b1572] mb-2 tracking-tight">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-[#2b1572]/70 leading-relaxed mb-6 font-normal">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-[#2b1572]/75 hover:bg-[#2b1572]/5 hover:text-[#2b1572] transition-colors border border-transparent cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 min-w-[110px] ${
              variant === 'danger'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-500/25'
                : variant === 'warning'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/25'
                : 'bg-[#2b1572] hover:bg-[#200d59] text-[#a6d1fd] shadow-[#2b1572]/25'
            } disabled:opacity-50`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
