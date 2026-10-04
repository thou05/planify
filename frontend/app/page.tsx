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
    <div className="min-h-screen flex flex-col bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
      {/* Navigation */}
      <header className="w-full px-6 py-3 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-2xs">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">Planify</span>
          <span className="px-1.5 py-0.2 rounded-xs font-mono text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-600">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-14 flex flex-col items-center text-center">
        {/* Top Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-slate-600" />
          <span>Hệ thống Quản lý Công việc & Kanban Thời gian thực</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.2] max-w-3xl">
          Tổ chức công việc khoa học, <br className="hidden sm:inline" />
          cộng tác thông minh với Planify
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Nền tảng quản lý dự án phong cách Kanban chuyên nghiệp với giao diện tối ưu hóa cho kỹ sư, đồng bộ đa người dùng thời gian thực và tự động hóa mạnh mẽ.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <div className="bg-white rounded-lg border border-slate-300 p-6 max-w-md w-full text-left shadow-2xs">
              <div className="flex items-center gap-2.5 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Chào mừng, {user.name}!</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Phiên làm việc của bạn đang hoạt động. Bạn có thể truy cập ngay vào không gian làm việc và các bảng Kanban.
              </p>
              <Link
                href="/dashboard"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <span>Mở Bảng điều khiển (Dashboard)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/register"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <span>Bắt đầu ngay miễn phí</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
              >
                Đăng nhập tài khoản
              </Link>
            </>
          )}
        </div>

        {/* System Architecture & Status Card */}
        <div className="mt-12 w-full bg-white rounded-lg p-6 text-left border border-slate-300 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Trạng thái Hệ thống</h3>
                <p className="text-xs text-slate-500">Backend NestJS + Workspaces + Boards + Lists + Auth</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <span>Swagger Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono uppercase text-slate-500 mb-0.5">Quản lý Workspace</div>
              <div className="text-xs font-semibold text-slate-900">Workspaces & Members</div>
              <p className="text-xs text-slate-500 mt-0.5">Phân quyền OWNER, ADMIN, MEMBER theo BR05</p>
            </div>

            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono uppercase text-slate-500 mb-0.5">Quản lý Board & List</div>
              <div className="text-xs font-semibold text-slate-900">Boards & Kanban Lists</div>
              <p className="text-xs text-slate-500 mt-0.5">Cột trạng thái, WIP Limit, yêu thích</p>
            </div>

            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono uppercase text-slate-500 mb-0.5">Tiêu chuẩn Kỹ thuật</div>
              <div className="text-xs font-semibold text-slate-900">Engineering Design System</div>
              <p className="text-xs text-slate-500 mt-0.5">Chuẩn hóa theo DESIGN_SYSTEM.md</p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 w-full text-left">
          <div className="bg-white rounded-lg p-5 border border-slate-300 shadow-2xs">
            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-3">
              <Kanban className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">Kanban & Workspaces</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tổ chức công việc đa cấp: Workspace → Board → List → Card. Hỗ trợ WIP Limit, nhãn màu và deadline.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-300 shadow-2xs">
            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">Đồng bộ Thời gian thực</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cập nhật tức thì với Supabase Realtime khi đồng đội kéo thả thẻ, thêm bình luận hay cập nhật tiến độ công việc.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-300 shadow-2xs">
            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">Tự động hóa & Trợ lý AI</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tự động phân rã công việc thành checklist, tóm tắt thảo luận và thiết lập luật tự động hóa linh hoạt.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white mt-auto">
        Planify — Hệ thống Quản lý Công việc Kỹ thuật © 2026. Xây dựng theo tài liệu kiến trúc & design system.
      </footer>
    </div>
  );
}
