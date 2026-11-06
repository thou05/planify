'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon, Palette } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, setThemeMode, setIsCustomizerOpen } = useTheme();

  const toggleMode = () => {
    setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center gap-1">
      {/* Nút chuyển nhanh Light / Dark */}
      <button
        type="button"
        onClick={toggleMode}
        title={resolvedTheme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Chuyển chế độ giao diện"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600" />
        )}
      </button>

      {/* Nút mở Modal tùy biến màu sắc */}
      <button
        type="button"
        onClick={() => setIsCustomizerOpen(true)}
        title="Tùy biến màu sắc Dashboard"
        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Tùy biến màu sắc giao diện"
      >
        <Palette className="w-4 h-4" />
      </button>
    </div>
  );
}

