'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Settings,
  Plus,
  Star,
  ChevronDown,
  Layers,
  Sparkles,
  History,
} from 'lucide-react';
import MyActivityModal from '@/components/modals/MyActivityModal';

export interface WorkspaceItem {
  id: string;
  name: string;
  description?: string | null;
  boards?: Array<{ id: string; name: string; is_favorite?: boolean }>;
}

interface SidebarProps {
  workspaces: WorkspaceItem[];
  currentWorkspaceId?: string;
  onSelectWorkspace?: (id: string) => void;
  onOpenCreateWorkspace: () => void;
  onOpenCreateBoard?: () => void;
}

export default function Sidebar({
  workspaces,
  currentWorkspaceId,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  onOpenCreateBoard,
}: SidebarProps) {
  const pathname = usePathname();
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isMyActivityOpen, setIsMyActivityOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  return (
    <>
      <aside className="w-64 h-full flex flex-col glass-surface !rounded-r-2xl !rounded-l-none border-r border-white/40 p-4 shrink-0 select-none">
        {/* Workspace Switcher */}
        <div className="relative mb-6">
          <button
            onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/40 hover:bg-white/60 border border-white/50 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shrink-0 font-bold text-sm shadow-sm">
                {currentWorkspace ? currentWorkspace.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-[#2b1572]/60 font-medium">Workspace</div>
                <div className="text-sm font-bold text-[#2b1572] truncate">
                  {currentWorkspace ? currentWorkspace.name : 'Chọn Workspace'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#2b1572]/60 group-hover:text-[#2b1572] shrink-0 transition-transform" />
          </button>

          {/* Dropdown Menu */}
          {isWsDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 glass-strong z-50 shadow-xl border border-white/70">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#2b1572]/60 px-2 py-1">
                Danh sách Không gian làm việc
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 my-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace?.(ws.id);
                      setIsWsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                      ws.id === currentWorkspace?.id
                        ? 'bg-[#a6d1fd]/50 text-[#2b1572]'
                        : 'hover:bg-white/50 text-[#2b1572]/80'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setIsWsDropdownOpen(false);
                  onOpenCreateWorkspace();
                }}
                className="w-full mt-1 pt-2 border-t border-[#2b1572]/10 flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#2b1572] hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#2b1572]" />
                <span>Tạo Workspace mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <div className="space-y-1 mb-6">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              pathname === '/dashboard'
                ? 'bg-[#a6d1fd]/40 text-[#2b1572] shadow-sm border border-white/40'
                : 'text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng quan</span>
          </Link>

          {currentWorkspace && (
            <Link
              href={`/workspaces/${currentWorkspace.id}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                pathname === `/workspaces/${currentWorkspace.id}`
                  ? 'bg-[#a6d1fd]/40 text-[#2b1572] shadow-sm border border-white/40'
                  : 'text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Thành viên & Cài đặt</span>
            </Link>
          )}

          <button
            onClick={() => setIsMyActivityOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572] transition-all cursor-pointer text-left"
          >
            <History className="w-4 h-4" />
            <span>Hoạt động của tôi</span>
          </button>
        </div>

      {/* Boards Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2b1572]/60">
            Các Bảng (Boards)
          </span>
          {onOpenCreateBoard && (
            <button
              onClick={onOpenCreateBoard}
              className="p-1 hover:bg-white/50 rounded-md text-[#2b1572]/70 hover:text-[#2b1572] transition-colors cursor-pointer"
              title="Tạo Board mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {currentWorkspace?.boards && currentWorkspace.boards.length > 0 ? (
            currentWorkspace.boards.map((board) => {
              const isActive = pathname === `/boards/${board.id}`;
              return (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-white/70 text-[#2b1572] font-semibold shadow-sm border border-white/60'
                      : 'text-[#2b1572]/75 hover:bg-white/40 hover:text-[#2b1572]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Kanban className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    <span className="truncate">{board.name}</span>
                  </div>
                  {board.is_favorite && (
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                </Link>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center rounded-xl bg-white/20 border border-dashed border-white/40 text-xs text-[#2b1572]/50">
              Chưa có Board nào
            </div>
          )}
        </div>
      </div>

      {/* Bottom Promo / Info Badge */}
      <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-[#a6d1fd]/20 via-white/30 to-[#a000c8]/10 border border-white/50 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#2b1572] mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#a000c8]" />
          <span>Planify AI Ready</span>
        </div>
        <p className="text-[11px] text-[#2b1572]/70 leading-tight">
          Hỗ trợ sinh tự động checklist và phân rã công việc thông minh.
        </p>
      </div>
    </aside>

    <MyActivityModal
      isOpen={isMyActivityOpen}
      onClose={() => setIsMyActivityOpen(false)}
    />
  </>
  );
}
