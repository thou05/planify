'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
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
} from 'lucide-react';

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    fetch('http://localhost:4000/api/v1/auth/me')
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
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-white/40 glass-surface !rounded-none !border-x-0 !border-t-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#2b1572]">Planify</span>
          <span className="badge-info text-xs px-2.5 py-0.5 rounded-full font-semibold">v1.0</span>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full border-2 border-[#2b1572]/20 border-t-[#2b1572] animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 glass-surface rounded-full text-xs font-semibold text-[#2b1572]">
                <UserIcon className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-[#2b1572]/70 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-xl transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 btn-secondary text-xs font-semibold"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 btn-primary text-xs font-semibold shadow-sm"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 flex flex-col items-center text-center">
        {/* Top Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-surface border border-[#a6d1fd]/60 text-xs font-semibold text-[#2b1572] shadow-sm">
          <Sparkles className="w-4 h-4 text-[#a000c8]" />
          <span>Hệ thống Quản lý Công việc & Kanban Thời gian thực</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#2b1572] tracking-tight leading-[1.15] max-w-4xl">
          Tổ chức công việc khoa học, <br className="hidden sm:inline" />
          cộng tác thông minh với <span className="underline decoration-[#a6d1fd] decoration-wavy">Planify</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#2b1572]/75 max-w-2xl leading-relaxed">
          Nền tảng quản lý dự án phong cách Kanban hiện đại với giao diện Glassmorphism trực quan, đồng bộ đa người dùng thời gian thực và tự động hóa mạnh mẽ.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <div className="glass-strong p-6 max-w-md w-full text-left">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#358200]" />
                <h3 className="font-bold text-[#2b1572] text-lg">Chào mừng, {user.name}!</h3>
              </div>
              <p className="text-xs text-[#2b1572]/70 mb-4">
                Phiên làm việc của bạn đang hoạt động. Bạn có thể truy cập ngay vào không gian làm việc và các bảng Kanban.
              </p>
              <Link
                href="/dashboard"
                className="w-full py-2.5 btn-primary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Mở Bảng điều khiển (Dashboard)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/register"
                className="px-6 py-3.5 btn-primary text-sm font-semibold flex items-center gap-2 shadow-lg"
              >
                Bắt đầu ngay miễn phí
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3.5 btn-secondary text-sm font-semibold"
              >
                Đăng nhập tài khoản
              </Link>
            </>
          )}
        </div>

        {/* System Architecture & Status Card */}
        <div className="mt-14 w-full glass-strong p-6 sm:p-8 text-left border border-white/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2b1572]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2b1572]/10 flex items-center justify-center text-[#2b1572]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2b1572]">Trạng thái Hệ thống (Phase 2)</h3>
                <p className="text-xs text-[#2b1572]/60">Backend NestJS + Workspaces + Boards + Lists + Auth</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-white/60 border border-white/80">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    backendStatus === 'online'
                      ? 'bg-[#358200]'
                      : backendStatus === 'checking'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-[#c40000]'
                  }`}
                />
                Backend {backendStatus === 'online' ? 'Online (Cổng 4000)' : backendStatus === 'checking' ? 'Đang kiểm tra...' : 'Offline'}
              </span>

              <a
                href="http://localhost:4000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#2b1572] bg-[#a6d1fd]/40 hover:bg-[#a6d1fd]/70 transition-colors"
              >
                Swagger API Docs
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-white/40 border border-white/60">
              <div className="text-xs font-semibold uppercase text-[#2b1572]/60 mb-1">Quản lý Workspace</div>
              <div className="text-sm font-bold text-[#2b1572]">Workspaces & Members</div>
              <p className="text-xs text-[#2b1572]/70 mt-1">Phân quyền OWNER, ADMIN, MEMBER theo BR05</p>
            </div>

            <div className="p-4 rounded-xl bg-white/40 border border-white/60">
              <div className="text-xs font-semibold uppercase text-[#2b1572]/60 mb-1">Quản lý Board & List</div>
              <div className="text-sm font-bold text-[#2b1572]">Boards & Kanban Lists</div>
              <p className="text-xs text-[#2b1572]/70 mt-1">Cột trạng thái, WIP Limit, yêu thích</p>
            </div>

            <div className="p-4 rounded-xl bg-white/40 border border-white/60">
              <div className="text-xs font-semibold uppercase text-[#2b1572]/60 mb-1">Thiết kế Chuẩn</div>
              <div className="text-sm font-bold text-[#2b1572]">Design System Glassmorphism</div>
              <p className="text-xs text-[#2b1572]/70 mt-1">Chuẩn hóa theo DESIGN_SYSTEM.md</p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full text-left">
          <div className="glass-surface p-6">
            <div className="w-12 h-12 rounded-xl bg-[#a6d1fd]/30 flex items-center justify-center text-[#2b1572] mb-4">
              <Kanban className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-[#2b1572] text-lg mb-2">Kanban & Workspaces</h4>
            <p className="text-xs text-[#2b1572]/70 leading-relaxed">
              Tổ chức công việc đa cấp: Workspace → Board → List → Card. Hỗ trợ WIP Limit, nhãn màu và deadline.
            </p>
          </div>

          <div className="glass-surface p-6">
            <div className="w-12 h-12 rounded-xl bg-[#a6d1fd]/30 flex items-center justify-center text-[#2b1572] mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-[#2b1572] text-lg mb-2">Đồng bộ Thời gian thực</h4>
            <p className="text-xs text-[#2b1572]/70 leading-relaxed">
              Cập nhật tức thì với Socket.IO khi đồng đội kéo thả thẻ, thêm bình luận hay cập nhật tiến độ công việc.
            </p>
          </div>

          <div className="glass-surface p-6">
            <div className="w-12 h-12 rounded-xl bg-[#a000c8]/20 flex items-center justify-center text-[#a000c8] mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-[#2b1572] text-lg mb-2">Tự động hóa & Trợ lý AI</h4>
            <p className="text-xs text-[#2b1572]/70 leading-relaxed">
              Tự động phân rã công việc thành checklist, tóm tắt thảo luận và thiết lập luật tự động hóa linh hoạt.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-[#2b1572]/60 border-t border-white/40 mt-auto">
        Planify — Hệ thống Quản lý Công việc Trực quan © 2026. Xây dựng theo tài liệu kiến trúc & design system.
      </footer>
    </div>
  );
}
