'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { PlayfulBackground } from '@/components/playful/PlayfulBackground';
import { HeroStatsBadge, InteractiveKanbanPreview } from '@/components/landing';
import {
  LayoutGrid,
  Kanban,
  Zap,
  Sparkles,
  ArrowRight,
  LogOut,
  User as UserIcon,
  ExternalLink,
  CheckCircle2,
  Server,
  Layers,
  Heart,
} from 'lucide-react';

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/auth/me`)
      .then((res) => {
        if (res.status === 401 || res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('online');
        }
      })
      .catch(() => {
        setBackendStatus('offline');
      });
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-200">
      {/* Playful Ambient Background (Zero-Jank 60FPS) */}
      <PlayfulBackground variant="landing" />

      {/* Main Foreground Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="w-full px-6 py-3.5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f28d8d] to-[#ffc0cb] flex items-center justify-center text-white shadow-xs">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Planify</span>
            <span className="px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60 text-[#f28d8d]">
              v1.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#f28d8d] animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-200/40 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shadow-2xs"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white text-xs font-semibold transition-all shadow-sm shadow-rose-200/50 dark:shadow-none active:scale-[0.98]"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 sm:py-16 flex flex-col items-center text-center">
          {/* Top Pill Badge */}
          <HeroStatsBadge className="mb-6" />

          {/* Hero Headline with Colorful Gradient */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] max-w-4xl">
            Tổ chức công việc khoa học,
            cộng tác thông minh với Planify
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Nền tảng quản lý dự án phong cách Kanban chuyên nghiệp với giao diện tối ưu hóa cho kỹ sư, đồng bộ đa người dùng thời gian thực và tự động hóa mạnh mẽ.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full">
            {user ? (
              <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 max-w-md w-full text-left shadow-lg shadow-slate-200/30 dark:shadow-none backdrop-blur-md">
                <div className="flex items-center gap-2.5 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Chào mừng, {user.name}!</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Phiên làm việc của bạn đang hoạt động. Bạn có thể truy cập ngay vào không gian làm việc và các bảng Kanban.
                </p>
                <Link
                  href="/dashboard"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-200/50 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  <span>Mở Bảng điều khiển (Dashboard)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-6 py-3 bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-rose-200/50 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Bắt đầu ngay miễn phí</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs backdrop-blur-md"
                >
                  Đăng nhập tài khoản
                </Link>
              </>
            )}
          </div>

          {/* Interactive Kanban Preview Card */}
          <InteractiveKanbanPreview />

          {/* System Architecture & Status Card (Preserved 100%) */}
          <div className="mt-12 w-full bg-white/90 dark:bg-slate-900/90 rounded-2xl p-6 text-left border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Trạng thái Hệ thống</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Backend NestJS + Workspaces + Boards + Lists + Auth</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendStatus === 'online'
                        ? 'bg-emerald-500'
                        : backendStatus === 'checking'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-rose-500'
                    }`}
                  />
                  Backend {backendStatus === 'online' ? 'Online (Cổng 4000)' : backendStatus === 'checking' ? 'Đang kiểm tra...' : 'Offline'}
                </span>

                <a
                  href="http://localhost:4000/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                >
                  <span>Swagger Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-0.5">Quản lý Workspace</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Workspaces & Members</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Phân quyền OWNER, ADMIN, MEMBER theo BR05</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-0.5">Quản lý Board & List</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Boards & Kanban Lists</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Cột trạng thái, WIP Limit, yêu thích</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-0.5">Tiêu chuẩn Kỹ thuật</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Engineering Design System</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Chuẩn hóa theo DESIGN_SYSTEM.md</p>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 w-full text-left">
            <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md hover:-translate-y-1 transition-transform duration-200">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60 flex items-center justify-center text-[#f28d8d] mb-3">
                <Kanban className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Kanban & Workspaces</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tổ chức công việc đa cấp: Workspace → Board → List → Card. Hỗ trợ WIP Limit, nhãn màu và deadline.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md hover:-translate-y-1 transition-transform duration-200">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-900/60 flex items-center justify-center text-sky-500 mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Đồng bộ Thời gian thực</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Cập nhật tức thì với Supabase Realtime khi đồng đội kéo thả thẻ, thêm bình luận hay cập nhật tiến độ công việc.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md hover:-translate-y-1 transition-transform duration-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center text-emerald-500 mb-3">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Tự động hóa & Trợ lý AI</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tự động phân rã công việc thành checklist, tóm tắt thảo luận và thiết lập luật tự động hóa linh hoạt.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md mt-auto">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span>Xây dựng với niềm đam mê</span>
            <Heart className="w-3.5 h-3.5 text-[#f28d8d] fill-[#f28d8d]" />
            <span>cho kỹ sư & nhà sáng tạo</span>
          </div>
          <div>Planify — Hệ thống Quản lý Công việc Kỹ thuật © 2026. Xây dựng theo tài liệu kiến trúc & design system.</div>
        </footer>
      </div>
    </div>
  );
}
