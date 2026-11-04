'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Pipette,
  Check,
  Hash,
  AlertCircle,
  Copy,
  CheckCheck,
} from 'lucide-react';
import {
  CURATED_PALETTES,
  isValidHex,
  normalizeHex,
  getContrastTextColor,
} from '@/lib/color-utils';

export interface ColorPickerProps {
  /** Giá trị màu hiện tại (#hex) */
  value: string;
  /** Callback khi màu thay đổi */
  onChange: (color: string) => void;
  /** Tiêu đề hiển thị bên trên */
  label?: string;
  /** Cho phép chọn tabs danh mục màu (Mặc định: true) */
  showCategories?: boolean;
  /** Hiển thị ô gõ mã HEX (Mặc định: true) */
  showHexInput?: boolean;
  /** Hiển thị nút gọi native color wheel <input type="color"> (Mặc định: true) */
  showNativePicker?: boolean;
  /** Hiển thị công cụ hút màu EyeDropper nếu trình duyệt hỗ trợ (Mặc định: true) */
  showEyeDropper?: boolean;
  /** Hiển thị thanh xem trước (Preview Swatch) (Mặc định: true) */
  showPreview?: boolean;
  /** Text mô phỏng bên trong swatch (dành cho Label: vd 'Backend', 'Bug'...) */
  previewText?: string;
  /** Lớp CSS ngoài cùng */
  className?: string;
  /** Vô hiệu hóa */
  disabled?: boolean;
}

export default function ColorPicker({
  value,
  onChange,
  label = 'Bảng màu sắc',
  showCategories = true,
  showHexInput = true,
  showNativePicker = true,
  showEyeDropper = true,
  showPreview = true,
  previewText,
  className = '',
  disabled = false,
}: ColorPickerProps) {
  const [activeCategoryId, setActiveCategoryId] = useState('brand-status');
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [supportsEyeDropper, setSupportsEyeDropper] = useState(false);

  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Chuẩn hóa màu hiện tại
  const normalizedCurrent = isValidHex(value) ? normalizeHex(value) : '#f28d8d';
  const contrastText = getContrastTextColor(normalizedCurrent);

  useEffect(() => {
    setHexInput(normalizedCurrent.toUpperCase().replace('#', ''));
    setHexError(false);
  }, [normalizedCurrent]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      setSupportsEyeDropper(true);
    }
  }, []);

  const handleSelectColor = (hex: string) => {
    if (disabled) return;
    const clean = normalizeHex(hex);
    onChange(clean);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    setHexInput(raw);

    if (raw.length === 3 || raw.length === 6) {
      const fullHex = normalizeHex(raw);
      if (isValidHex(fullHex)) {
        setHexError(false);
        onChange(fullHex);
        return;
      }
    }
    setHexError(raw.length > 0 && raw.length !== 3 && raw.length !== 6);
  };

  const handleHexInputBlur = () => {
    if (hexInput.length === 3 || hexInput.length === 6) {
      const fullHex = normalizeHex(hexInput);
      if (isValidHex(fullHex)) {
        setHexError(false);
        onChange(fullHex);
        return;
      }
    }
    // Khôi phục giá trị hợp lệ nếu nhập dở dang
    setHexInput(normalizedCurrent.toUpperCase().replace('#', ''));
    setHexError(false);
  };

  const handleEyeDropper = async () => {
    if (disabled || typeof window === 'undefined') return;
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        handleSelectColor(result.sRGBHex);
      }
    } catch {
      // Người dùng bấm ESC hoặc hủy hút màu
    }
  };

  const handleCopyHex = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(normalizedCurrent.toUpperCase());
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1500);
    }
  };

  const activeCategory =
    CURATED_PALETTES.find((c) => c.id === activeCategoryId) || CURATED_PALETTES[0];

  return (
    <div className={`space-y-2.5 ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}>
      {/* Label and Header Actions */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#f28d8d]" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">
          {normalizedCurrent}
        </span>
      </div>

      {/* Live Preview Swatch */}
      {showPreview && (
        <div
          className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between transition-colors shadow-2xs"
          style={{ backgroundColor: normalizedCurrent }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider truncate shadow-2xs border border-white/20"
              style={{
                backgroundColor: normalizedCurrent,
                color: contrastText,
              }}
            >
              {previewText || normalizedCurrent.toUpperCase()}
            </div>
            <span
              className="text-[11px] font-medium opacity-90 hidden sm:inline"
              style={{ color: contrastText }}
            >
              Màu hiển thị thực tế
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyHex}
            className="p-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer border border-white/25 hover:bg-white/20"
            style={{ color: contrastText }}
            title="Sao chép mã màu HEX"
          >
            {hasCopied ? (
              <>
                <CheckCheck className="w-3 h-3 text-emerald-300" />
                <span className="text-[10px]">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px] font-mono">{normalizedCurrent.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Category Tabs */}
      {showCategories && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar border-b border-slate-200">
          {CURATED_PALETTES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-t-md whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                activeCategoryId === cat.id
                  ? 'border-[#f28d8d] text-[#d86969] bg-rose-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Preset Swatches Grid */}
      <div className="grid grid-cols-8 gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg">
        {activeCategory.colors.map((c) => {
          const isSelected = normalizedCurrent.toLowerCase() === c.value.toLowerCase();
          const itemContrast = getContrastTextColor(c.value);
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => handleSelectColor(c.value)}
              title={`${c.name} (${c.value})`}
              className={`h-7 rounded-md border transition-all cursor-pointer relative flex items-center justify-center hover:scale-105 ${
                isSelected
                  ? 'border-slate-800 ring-2 ring-offset-1 ring-[#f28d8d] z-10'
                  : 'border-slate-300/80 hover:border-slate-400'
              }`}
              style={{ backgroundColor: c.value }}
            >
              {isSelected && (
                <Check
                  className="w-3.5 h-3.5 stroke-[3]"
                  style={{ color: itemContrast }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Picker Bar: Hex Input + Native Color Wheel + Eyedropper */}
      <div className="pt-1 flex items-center gap-2">
        {showHexInput && (
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Hash className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              placeholder="RRGGBB"
              maxLength={6}
              className={`w-full pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 bg-white border rounded-md focus:outline-none transition-colors ${
                hexError
                  ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200'
                  : 'border-slate-300 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40'
              }`}
            />
          </div>
        )}

        {/* Native HTML5 Color Picker (<input type="color">) */}
        {showNativePicker && (
          <div className="relative">
            <input
              ref={nativeInputRef}
              type="color"
              value={normalizedCurrent}
              onChange={(e) => handleSelectColor(e.target.value)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => nativeInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0"
              title="Mở bảng chọn 16 triệu màu hệ thống (Color Wheel)"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                style={{ backgroundColor: normalizedCurrent }}
              />
              <span className="hidden sm:inline">Phổ màu</span>
            </button>
          </div>
        )}

        {/* Eyedropper (Pipette tool) */}
        {showEyeDropper && supportsEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="p-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors shadow-2xs shrink-0"
            title="Hút màu trực tiếp trên màn hình (EyeDropper)"
          >
            <Pipette className="w-3.5 h-3.5 text-slate-600" />
          </button>
        )}
      </div>

      {hexError && (
        <div className="flex items-center gap-1 text-[11px] text-rose-500 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Vui lòng nhập mã màu hợp lệ gồm 3 hoặc 6 ký tự hex (ví dụ: F00 hoặc FF5500).</span>
        </div>
      )}
    </div>
  );
}

