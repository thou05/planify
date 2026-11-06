'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export interface HeroStatsBadgeProps {
  className?: string;
  text?: string;
}

export const HeroStatsBadge: React.FC<HeroStatsBadgeProps> = ({
  className = '',
  text = '✨ Nền tảng Quản lý Công việc & Kanban Thời gian thực',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full 
        bg-white/80 dark:bg-slate-900/80 
        backdrop-blur-md 
        border border-rose-200/70 dark:border-rose-900/40 
        shadow-[0_4px_16px_rgba(242,141,141,0.15)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]
        hover:border-[#f28d8d] dark:hover:border-[#87ceeb]
        hover:shadow-[0_6px_24px_rgba(242,141,141,0.25)]
        transition-all duration-300 group cursor-default select-none ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f28d8d] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f28d8d]" />
      </span>
      <Sparkles className="w-3.5 h-3.5 text-[#f28d8d] dark:text-[#ff9ebb] group-hover:rotate-12 transition-transform duration-300" />
      <span className="text-xs font-semibold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-slate-100 dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent">
        {text}
      </span>
    </div>
  );
};

