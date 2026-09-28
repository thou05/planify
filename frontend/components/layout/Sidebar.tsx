'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  LayoutTemplate,
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
  const [hasMounted, setHasMounted] = useState(false);

  // References to DOM elements for smooth sliding indicator tracking
  const navItemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const boardItemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Active indicator sliding positions (Thanh màu & nền active trượt khi click)
  const [activeNavStyle, setActiveNavStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({
    top: 0,
    height: 0,
    opacity: 0,
  });

  const [activeBoardStyle, setActiveBoardStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({
    top: 0,
    height: 0,
    opacity: 0,
  });

  // Floating hover pill states (Vệt sáng lướt khi hover con trỏ)
  const [navHover, setNavHover] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0,
  });

  const [boardHover, setBoardHover] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0,
  });

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  const getActiveNavKey = useCallback(() => {
    if (pathname === '/dashboard') return 'dashboard';
    if (currentWorkspace && pathname === `/workspaces/${currentWorkspace.id}`) return 'workspace';
    if (pathname.startsWith('/templates')) return 'templates';
    return null;
  }, [pathname, currentWorkspace]);

  const getActiveBoardId = useCallback(() => {
    if (pathname.startsWith('/boards/')) {
      return pathname.split('/')[2]?.split('?')[0];
    }
    return null;
  }, [pathname]);

  const updateActiveRects = useCallback(() => {
    const activeKey = getActiveNavKey();
    if (activeKey && navItemRefs.current[activeKey]) {
      const el = navItemRefs.current[activeKey]!;
      setActiveNavStyle({
        top: el.offsetTop,
        height: el.offsetHeight,
        opacity: 1,
      });
    } else {
      setActiveNavStyle((prev) => ({ ...prev, opacity: 0 }));
    }

    const activeId = getActiveBoardId();
    if (activeId && boardItemRefs.current[activeId]) {
      const el = boardItemRefs.current[activeId]!;
      setActiveBoardStyle({
        top: el.offsetTop,
        height: el.offsetHeight,
        opacity: 1,
      });
    } else {
      setActiveBoardStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [getActiveNavKey, getActiveBoardId]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    updateActiveRects();

    const handleResize = () => {
      updateActiveRects();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname, currentWorkspace?.id, currentWorkspace?.boards, updateActiveRects]);

  // Click handlers to instantly trigger glide animation with 0ms delay
  const handleNavClick = (key: string) => {
    const el = navItemRefs.current[key];
    if (el) {
      setActiveNavStyle({
        top: el.offsetTop,
        height: el.offsetHeight,
        opacity: 1,
      });
    }
    setNavHover((prev) => ({ ...prev, opacity: 0 }));
  };

  const handleBoardClick = (boardId: string) => {
    const el = boardItemRefs.current[boardId];
    if (el) {
      setActiveBoardStyle({
        top: el.offsetTop,
        height: el.offsetHeight,
        opacity: 1,
      });
    }
    setBoardHover((prev) => ({ ...prev, opacity: 0 }));
  };

  const activeNavKey = getActiveNavKey();
  const activeBoardId = getActiveBoardId();

  return (
    <>
      <aside className="w-64 h-full flex flex-col glass-surface !rounded-r-2xl !rounded-l-none border-r border-white/40 p-4 shrink-0 select-none">
        {/* Workspace Switcher */}
        <div className="relative mb-6">
          <button
            onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/40 hover:bg-white/65 hover:shadow-xs border border-white/50 hover:border-white/80 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shrink-0 font-bold text-sm shadow-sm group-hover:scale-105 transition-transform duration-200">
                {currentWorkspace ? currentWorkspace.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-[#2b1572]/60 font-medium">Workspace</div>
                <div className="text-sm font-bold text-[#2b1572] truncate">
                  {currentWorkspace ? currentWorkspace.name : 'Chọn Workspace'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#2b1572]/60 group-hover:text-[#2b1572] shrink-0 transition-transform duration-200 ${
                isWsDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu - 100% Solid White */}
          {isWsDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white rounded-2xl z-50 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
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
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      ws.id === currentWorkspace?.id
                        ? 'bg-[#a6d1fd]/40 text-[#2b1572] font-bold'
                        : 'hover:bg-slate-100 text-[#2b1572]/80'
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
                className="w-full mt-1 pt-2 border-t border-slate-100 flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#2b1572] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#2b1572]" />
                <span>Tạo Workspace mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <div
          className="relative space-y-1 mb-6"
          onMouseLeave={() => setNavHover((prev) => ({ ...prev, opacity: 0 }))}
        >
          {/* 1. Thanh màu Active di chuyển mượt mà (Gliding Active Bar & Pill) */}
          <div
            className={`absolute left-0 right-0 rounded-xl pointer-events-none z-0 bg-white/90 border border-white/90 shadow-xs ${
              hasMounted ? 'transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]' : ''
            }`}
            style={{
              top: `${activeNavStyle.top}px`,
              height: `${activeNavStyle.height}px`,
              opacity: activeNavStyle.opacity,
              transform: activeNavStyle.opacity ? 'scale(1)' : 'scale(0.96)',
            }}
          >
            {/* Thanh màu tím thương hiệu trượt theo */}
            <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#2b1572] shadow-xs" />
          </div>

          {/* 2. Vệt sáng Hover lướt theo con trỏ chuột */}
          <div
            className="absolute left-0 right-0 rounded-xl pointer-events-none transition-all duration-200 ease-out z-0 bg-gradient-to-r from-[#a6d1fd]/35 via-white/60 to-[#a6d1fd]/20 border border-white/50 shadow-2xs"
            style={{
              top: `${navHover.top}px`,
              height: `${navHover.height}px`,
              opacity: navHover.opacity,
              transform: navHover.opacity ? 'scale(1)' : 'scale(0.96)',
            }}
          />

          {/* Item 1: Tổng quan */}
          <Link
            ref={(el) => {
              navItemRefs.current['dashboard'] = el;
            }}
            href="/dashboard"
            onClick={() => handleNavClick('dashboard')}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (activeNavKey !== 'dashboard') {
                setNavHover({
                  top: el.offsetTop,
                  height: el.offsetHeight,
                  opacity: 1,
                });
              } else {
                setNavHover((prev) => ({ ...prev, opacity: 0 }));
              }
            }}
            className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors duration-150 group cursor-pointer ${
              activeNavKey === 'dashboard'
                ? 'text-[#2b1572] font-bold'
                : 'text-[#2b1572]/70 hover:text-[#2b1572] font-semibold'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 group-hover:scale-110 group-hover:text-[#2b1572] transition-transform duration-200" />
            <span>Tổng quan</span>
          </Link>

          {/* Item 2: Thành viên & Cài đặt */}
          {currentWorkspace && (
            <Link
              ref={(el) => {
                navItemRefs.current['workspace'] = el;
              }}
              href={`/workspaces/${currentWorkspace.id}`}
              onClick={() => handleNavClick('workspace')}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (activeNavKey !== 'workspace') {
                  setNavHover({
                    top: el.offsetTop,
                    height: el.offsetHeight,
                    opacity: 1,
                  });
                } else {
                  setNavHover((prev) => ({ ...prev, opacity: 0 }));
                }
              }}
              className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors duration-150 group cursor-pointer ${
                activeNavKey === 'workspace'
                  ? 'text-[#2b1572] font-bold'
                  : 'text-[#2b1572]/70 hover:text-[#2b1572] font-semibold'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 group-hover:scale-110 group-hover:text-[#2b1572] transition-transform duration-200" />
              <span>Thành viên & Cài đặt</span>
            </Link>
          )}

          {/* Item 3: Thư viện Mẫu */}
          <Link
            ref={(el) => {
              navItemRefs.current['templates'] = el;
            }}
            href="/templates"
            onClick={() => handleNavClick('templates')}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (activeNavKey !== 'templates') {
                setNavHover({
                  top: el.offsetTop,
                  height: el.offsetHeight,
                  opacity: 1,
                });
              } else {
                setNavHover((prev) => ({ ...prev, opacity: 0 }));
              }
            }}
            className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors duration-150 group cursor-pointer ${
              activeNavKey === 'templates'
                ? 'text-[#2b1572] font-bold'
                : 'text-[#2b1572]/70 hover:text-[#2b1572] font-semibold'
            }`}
          >
            <LayoutTemplate className="w-4 h-4 shrink-0 group-hover:scale-110 group-hover:text-[#2b1572] transition-transform duration-200" />
            <span>Thư viện Mẫu</span>
          </Link>

          {/* Item 4: Hoạt động của tôi */}
          <button
            type="button"
            onClick={() => setIsMyActivityOpen(true)}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              setNavHover({
                top: el.offsetTop,
                height: el.offsetHeight,
                opacity: 1,
              });
            }}
            className="w-full relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#2b1572]/70 hover:text-[#2b1572] transition-colors duration-150 cursor-pointer text-left group"
          >
            <History className="w-4 h-4 shrink-0 group-hover:scale-110 group-hover:text-[#2b1572] transition-transform duration-200" />
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
                className="p-1 hover:bg-white/60 rounded-md text-[#2b1572]/70 hover:text-[#2b1572] hover:scale-110 transition-all cursor-pointer"
                title="Tạo Board mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto space-y-1 pr-1 relative"
            onMouseLeave={() => setBoardHover((prev) => ({ ...prev, opacity: 0 }))}
          >
            {/* 1. Thanh màu Active di chuyển mượt mà giữa các Bảng (Gliding Active Bar & Pill) */}
            <div
              className={`absolute left-0 right-0 rounded-xl pointer-events-none z-0 bg-white/90 border border-white/85 shadow-xs ${
                hasMounted ? 'transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]' : ''
              }`}
              style={{
                top: `${activeBoardStyle.top}px`,
                height: `${activeBoardStyle.height}px`,
                opacity: activeBoardStyle.opacity,
                transform: activeBoardStyle.opacity ? 'scale(1)' : 'scale(0.96)',
              }}
            >
              {/* Thanh màu tím thương hiệu trượt theo Bảng được chọn */}
              <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#2b1572] shadow-xs" />
            </div>

            {/* 2. Vệt sáng Hover lướt theo con trỏ chuột */}
            <div
              className="absolute left-0 right-0 rounded-xl pointer-events-none transition-all duration-200 ease-out z-0 bg-gradient-to-r from-[#a6d1fd]/35 via-white/60 to-[#a6d1fd]/20 border border-white/50 shadow-2xs"
              style={{
                top: `${boardHover.top}px`,
                height: `${boardHover.height}px`,
                opacity: boardHover.opacity,
                transform: boardHover.opacity ? 'scale(1)' : 'scale(0.96)',
              }}
            />

            {currentWorkspace?.boards && currentWorkspace.boards.length > 0 ? (
              currentWorkspace.boards.map((board) => {
                const isActive = activeBoardId === board.id;
                return (
                  <Link
                    key={board.id}
                    ref={(el) => {
                      boardItemRefs.current[board.id] = el;
                    }}
                    href={`/boards/${board.id}`}
                    onClick={() => handleBoardClick(board.id)}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      if (!isActive) {
                        setBoardHover({
                          top: el.offsetTop,
                          height: el.offsetHeight,
                          opacity: 1,
                        });
                      } else {
                        setBoardHover((prev) => ({ ...prev, opacity: 0 }));
                      }
                    }}
                    className={`relative z-10 flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors duration-150 group cursor-pointer ${
                      isActive
                        ? 'text-[#2b1572] font-bold'
                        : 'text-[#2b1572]/75 hover:text-[#2b1572] font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pl-1">
                      <Kanban className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
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
