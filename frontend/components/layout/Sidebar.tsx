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
    if (pathname === '/my-activities' || pathname.startsWith('/my-activities')) return 'my-activities';
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
      <aside className="w-64 h-full flex flex-col bg-white border-r border-slate-200 p-3.5 shrink-0 select-none">
        {/* Workspace Switcher */}
        <div className="relative mb-5">
          <button
            onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                {currentWorkspace ? currentWorkspace.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Workspace</div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentWorkspace ? currentWorkspace.name : 'Chọn Workspace'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform duration-200 ${
                isWsDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu - 100% Solid White */}
          {isWsDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white rounded-lg shadow-md border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Danh sách Không gian làm việc
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5 my-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace?.(ws.id);
                      setIsWsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                      ws.id === currentWorkspace?.id
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
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
                className="w-full mt-1 pt-1.5 border-t border-slate-100 flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-900" />
                <span>Tạo Workspace mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <div
          className="relative space-y-0.5 mb-5"
          onMouseLeave={() => setNavHover((prev) => ({ ...prev, opacity: 0 }))}
        >
          {/* 1. Thanh màu Active di chuyển mượt mà (Gliding Active Bar & Pill) */}
          <div
            className={`absolute left-0 right-0 rounded-md pointer-events-none z-0 bg-slate-100 border border-slate-200/80 ${
              hasMounted ? 'transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]' : ''
            }`}
            style={{
              top: `${activeNavStyle.top}px`,
              height: `${activeNavStyle.height}px`,
              opacity: activeNavStyle.opacity,
            }}
          >
            {/* Vạch màu active trượt theo */}
            <span className="absolute left-1 top-2 bottom-2 w-1 rounded-sm bg-slate-900" />
          </div>

          {/* 2. Vệt sáng Hover lướt theo con trỏ chuột */}
          <div
            className="absolute left-0 right-0 rounded-md pointer-events-none transition-all duration-150 ease-out z-0 bg-slate-50 border border-slate-200/50"
            style={{
              top: `${navHover.top}px`,
              height: `${navHover.height}px`,
              opacity: navHover.opacity,
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
            className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors duration-150 group cursor-pointer ${
              activeNavKey === 'dashboard'
                ? 'text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
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
              className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors duration-150 group cursor-pointer ${
                activeNavKey === 'workspace'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
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
            className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors duration-150 group cursor-pointer ${
              activeNavKey === 'templates'
                ? 'text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutTemplate className="w-4 h-4 shrink-0" />
            <span>Thư viện Mẫu</span>
          </Link>

          {/* Item 4: Hoạt động của tôi */}
          <Link
            ref={(el) => {
              navItemRefs.current['my-activities'] = el;
            }}
            href="/my-activities"
            onClick={() => handleNavClick('my-activities')}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (activeNavKey !== 'my-activities') {
                setNavHover({
                  top: el.offsetTop,
                  height: el.offsetHeight,
                  opacity: 1,
                });
              } else {
                setNavHover((prev) => ({ ...prev, opacity: 0 }));
              }
            }}
            className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors duration-150 group cursor-pointer ${
              activeNavKey === 'my-activities'
                ? 'text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Hoạt động của tôi</span>
          </Link>
        </div>

        {/* Boards Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Các Bảng (Boards)
            </span>
            {onOpenCreateBoard && (
              <button
                onClick={onOpenCreateBoard}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Tạo Board mới"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto space-y-0.5 pr-1 relative"
            onMouseLeave={() => setBoardHover((prev) => ({ ...prev, opacity: 0 }))}
          >
            {/* 1. Thanh màu Active di chuyển mượt mà giữa các Bảng (Gliding Active Bar & Pill) */}
            <div
              className={`absolute left-0 right-0 rounded-md pointer-events-none z-0 bg-slate-100 border border-slate-200/80 ${
                hasMounted ? 'transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]' : ''
              }`}
              style={{
                top: `${activeBoardStyle.top}px`,
                height: `${activeBoardStyle.height}px`,
                opacity: activeBoardStyle.opacity,
              }}
            >
              {/* Vạch màu active trượt theo Bảng được chọn */}
              <span className="absolute left-1 top-2 bottom-2 w-1 rounded-sm bg-slate-900" />
            </div>

            {/* 2. Vệt sáng Hover lướt theo con trỏ chuột */}
            <div
              className="absolute left-0 right-0 rounded-md pointer-events-none transition-all duration-150 ease-out z-0 bg-slate-50 border border-slate-200/50"
              style={{
                top: `${boardHover.top}px`,
                height: `${boardHover.height}px`,
                opacity: boardHover.opacity,
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
                    className={`relative z-10 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 group cursor-pointer ${
                      isActive
                        ? 'text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pl-1">
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
              <div className="px-3 py-4 text-center rounded-md bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
                Chưa có Board nào
              </div>
            )}
          </div>
        </div>

        {/* Bottom Shortcut Helper Card */}
        <div className="mt-3 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span>Phím tắt nhanh</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Nhấn <kbd className="px-1 py-0.2 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700">Ctrl</kbd> + <kbd className="px-1 py-0.2 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700">K</kbd> để tìm kiếm nhanh mọi lúc.
          </p>
        </div>
      </aside>
    </>
  );
}
