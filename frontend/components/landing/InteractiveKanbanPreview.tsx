'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Smile,
  Zap,
  MoreHorizontal,
  Flame,
  Check,
} from 'lucide-react';

export const InteractiveKanbanPreview: React.FC = () => {
  const [activeCardId, setActiveCardId] = useState<string | null>('card-2');

  return (
    <div className="w-full max-w-4xl mx-auto mt-10 text-left select-none">
      {/* Floating Window Mockup */}
      <div className="relative rounded-2xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:shadow-[0_25px_60px_rgba(242,141,141,0.15)] dark:hover:shadow-[0_25px_60px_rgba(135,206,235,0.1)]">
        {/* Window Topbar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f28d8d] inline-block shadow-2xs" />
            <span className="w-3 h-3 rounded-full bg-[#fcd34d] inline-block shadow-2xs" />
            <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block shadow-2xs" />
            <span className="ml-3 text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-1.5">
              <span>🚀 Planify Sprint Board</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                Live Preview
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Realtime
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 3 Kanban Columns */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/40 dark:bg-slate-900/40">
          {/* Column 1: To Do (San hô #f28d8d) */}
          <div className="rounded-xl p-3 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3">
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f28d8d] ring-2 ring-rose-200 dark:ring-rose-950" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  To Do
                </h4>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                1
              </span>
            </div>

            {/* Card 1: Doodle Icons */}
            <div
              onClick={() => setActiveCardId('card-1')}
              className={`group relative rounded-lg p-3.5 bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer ${
                activeCardId === 'card-1'
                  ? 'border-[#f28d8d] shadow-[0_4px_16px_rgba(242,141,141,0.2)] -translate-y-0.5'
                  : 'border-slate-200/80 dark:border-slate-700/60 hover:border-[#f28d8d]/60 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-[#f28d8d] border border-rose-200/60 dark:border-rose-900/60">
                  <Flame className="w-2.5 h-2.5" />
                  Creative
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Smile className="w-3 h-3 text-[#f28d8d] group-hover:scale-125 transition-transform" />
                  Doodle
                </span>
              </div>

              <h5 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-[#f28d8d] transition-colors">
                Thiết kế Doodle Icons
              </h5>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                Hoàn thiện bộ 12 vector playful SVG bồng bềnh cho Planify UI.
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#f28d8d] to-[#ffc0cb] flex items-center justify-center text-white font-bold text-[9px] shadow-2xs">
                    🎨
                  </div>
                  <span className="font-medium">Designer</span>
                </div>
                <span className="font-mono text-slate-400">2/4 subtasks</span>
              </div>
            </div>

            {/* Subtle Ghost Card Placeholder */}
            <div className="border border-dashed border-slate-300 dark:border-slate-700/60 rounded-lg p-2.5 text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-400 transition-colors cursor-pointer">
              + Thêm nhiệm vụ mới
            </div>
          </div>

          {/* Column 2: In Progress (Xanh trời #87ceeb) */}
          <div className="rounded-xl p-3 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3">
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#87ceeb] ring-2 ring-sky-200 dark:ring-sky-950 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  In Progress
                </h4>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                1
              </span>
            </div>

            {/* Card 2: Supabase Realtime */}
            <div
              onClick={() => setActiveCardId('card-2')}
              className={`group relative rounded-lg p-3.5 bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer ${
                activeCardId === 'card-2'
                  ? 'border-[#87ceeb] shadow-[0_4px_16px_rgba(135,206,235,0.3)] -translate-y-0.5'
                  : 'border-slate-200/80 dark:border-slate-700/60 hover:border-[#87ceeb]/60 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/60">
                  <Zap className="w-2.5 h-2.5" />
                  Engineering
                </span>
                <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                  75%
                </span>
              </div>

              <h5 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                Tích hợp Supabase Realtime
              </h5>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                Đồng bộ trạng thái kéo thả card ngay lập tức đa người dùng.
              </p>

              {/* Progress Bar 75% */}
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-400 via-[#87ceeb] to-emerald-400 rounded-full w-[75%] transition-all duration-500" />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#87ceeb] to-indigo-500 flex items-center justify-center text-white font-bold text-[9px] shadow-2xs">
                    ⚡
                  </div>
                  <span className="font-medium">Engineer</span>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Done (Xanh mint #10b981) */}
          <div className="rounded-xl p-3 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3">
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-emerald-200 dark:ring-emerald-950" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Done
                </h4>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                1
              </span>
            </div>

            {/* Card 3: Sprint Release */}
            <div
              onClick={() => setActiveCardId('card-3')}
              className={`group relative rounded-lg p-3.5 bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer ${
                activeCardId === 'card-3'
                  ? 'border-[#10b981] shadow-[0_4px_16px_rgba(16,185,129,0.25)] -translate-y-0.5'
                  : 'border-slate-200/80 dark:border-slate-700/60 hover:border-[#10b981]/60 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                  <Check className="w-2.5 h-2.5" />
                  Launch
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  v1.0
                </span>
              </div>

              <h5 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                Sprint Release v1.0
              </h5>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                Triển khai trọn vẹn hạ tầng NestJS, Auth và Playful Design.
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#10b981] to-teal-500 flex items-center justify-center text-white font-bold text-[9px] shadow-2xs">
                    🚀
                  </div>
                  <span className="font-medium">DevOps</span>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  100%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Micro-Interaction Interactive Hint Bar */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-rose-50/50 via-sky-50/50 to-emerald-50/50 dark:from-slate-950/80 dark:via-slate-900/80 dark:to-slate-950/80 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#f28d8d]" />
            <span>Kéo thả thẻ nhiệm vụ mượt mà • Tự động hóa tiến độ trực quan</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
            60FPS GPU Accelerated
          </span>
        </div>
      </div>
    </div>
  );
};

