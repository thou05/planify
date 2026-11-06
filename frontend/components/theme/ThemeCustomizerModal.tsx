'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import { THEME_PRESETS, DEFAULT_PRIMARY_COLOR, isValidHexColor } from '@/lib/theme-utils';
import {
  X,
  Sun,
  Moon,
  Laptop,
  Check,
  Palette,
  RotateCcw,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

export default function ThemeCustomizerModal() {
  const {
    themeMode,
    resolvedTheme,
    primaryColor,
    palette,
    setThemeMode,
    setPrimaryColor,
    resetToDefault,
    isCustomizerOpen,
    setIsCustomizerOpen,
  } = useTheme();

  const [customHex, setCustomHex] = useState(primaryColor);
  const [hexError, setHexError] = useState(false);

  useEffect(() => {
    setCustomHex(primaryColor);
    setHexError(false);
  }, [primaryColor, isCustomizerOpen]);

  // Close modal via ESC key
  useEffect(() => {
    if (!isCustomizerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomizerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomizerOpen, setIsCustomizerOpen]);

  if (!isCustomizerOpen) return null;

  const handleCustomHexChange = (val: string) => {
    setCustomHex(val);
    if (isValidHexColor(val)) {
      setHexError(false);
      setPrimaryColor(val);
    } else {
      setHexError(true);
    }
  };

  const handlePresetSelect = (color: string) => {
    setCustomHex(color);
    setHexError(false);
    setPrimaryColor(color);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCustomizerOpen(false);
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsCustomizerOpen(false)}
          className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-colors shrink-0"
            style={{
              backgroundColor: palette.primary,
              color: palette.contrastText,
            }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Tùy biến giao diện (Theme Settings)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Điều chỉnh chế độ hiển thị và màu sắc nhận diện thương hiệu của Dashboard
            </p>
          </div>
        </div>

        {/* SECTION 1: Chế độ hiển thị (Theme Mode) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
            Chế độ hiển thị
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Sáng */}
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`p-3.5 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                themeMode === 'light'
                  ? 'border-2 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              style={{
                borderColor: themeMode === 'light' ? palette.primary : undefined,
              }}
            >
              <Sun
                className="w-5 h-5"
                style={{
                  color: themeMode === 'light' ? palette.primary : '#64748b',
                }}
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Sáng (Light)
              </span>
            </button>

            {/* Tối */}
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`p-3.5 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                themeMode === 'dark'
                  ? 'border-2 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              style={{
                borderColor: themeMode === 'dark' ? palette.primary : undefined,
              }}
            >
              <Moon
                className="w-5 h-5"
                style={{
                  color: themeMode === 'dark' ? palette.primary : '#64748b',
                }}
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Tối (Dark)
              </span>
            </button>

            {/* Hệ thống */}
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className={`p-3.5 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                themeMode === 'system'
                  ? 'border-2 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              style={{
                borderColor: themeMode === 'system' ? palette.primary : undefined,
              }}
            >
              <Laptop
                className="w-5 h-5"
                style={{
                  color: themeMode === 'system' ? palette.primary : '#64748b',
                }}
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Hệ thống ({resolvedTheme === 'dark' ? 'Tối' : 'Sáng'})
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 2: Bảng màu Presets */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
            Bảng màu chủ đạo (Preset Palettes)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {THEME_PRESETS.map((preset) => {
              const isSelected =
                primaryColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.color)}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-2 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  style={{
                    borderColor: isSelected ? preset.color : undefined,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: preset.color }}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {preset.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Tự chọn mã HEX tùy biến */}
        <div className="mb-6 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Tự chọn màu tùy ý (Custom HEX Code)
          </label>
          <div className="flex items-center gap-3">
            {/* Color Input Swatch */}
            <div className="relative w-9 h-9 rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0 cursor-pointer">
              <input
                type="color"
                value={isValidHexColor(customHex) ? customHex : DEFAULT_PRIMARY_COLOR}
                onChange={(e) => handlePresetSelect(e.target.value)}
                className="absolute -inset-2 w-14 h-14 cursor-pointer"
              />
            </div>

            {/* Text Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={customHex}
                onChange={(e) => handleCustomHexChange(e.target.value)}
                placeholder="#f28d8d"
                maxLength={7}
                className={`w-full px-3 py-2 text-xs font-mono font-semibold rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-colors ${
                  hexError
                    ? 'border-rose-400 focus:ring-1 focus:ring-rose-400'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#87ceeb]'
                }`}
              />
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Tương phản WCAG: <strong style={{ color: palette.contrastText === '#ffffff' ? '#3b82f6' : '#f59e0b' }}>{palette.contrastText}</strong>
            </span>
          </div>
          {hexError && (
            <p className="text-[11px] text-rose-500 mt-1 font-medium">
              Vui lòng nhập mã HEX hợp lệ (ví dụ: #3b82f6)
            </p>
          )}
        </div>

        {/* SECTION 4: Live Interactive Preview (Xem trước trực tiếp) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Xem trước trực tiếp (Live Preview)</span>
          </label>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            {/* Thanh tiêu đề mẫu */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                  style={{ backgroundColor: palette.primary }}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Planify Workspace
                </span>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: palette.primaryLight,
                  color: palette.primaryDark,
                }}
              >
                Active Project
              </span>
            </div>

            {/* Các thành phần giao diện mẫu */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Nút Primary */}
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-default"
                style={{
                  backgroundColor: palette.primary,
                  color: palette.contrastText,
                  borderColor: palette.primaryDark,
                }}
              >
                <span>Nút Primary</span>
              </button>

              {/* Nút Secondary */}
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-default"
              >
                Nút Phụ
              </button>

              {/* Badge */}
              <div
                className="px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{
                  backgroundColor: `rgba(${palette.primaryRgb}, 0.15)`,
                  color: palette.primary,
                }}
              >
                Badge Tag
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={resetToDefault}
            className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            style={{
              backgroundColor: palette.primary,
              color: palette.contrastText,
            }}
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

