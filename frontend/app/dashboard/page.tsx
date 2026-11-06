'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { createRealtimeClient } from '@/lib/supabase';
import { useShell } from '@/components/layout/ShellContext';
import {
  Layers,
  Kanban,
  Star,
  Users,
  Plus,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const shell = useShell();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await apiClient<any[]>('/workspaces');
      if (res.success && res.data) {
        setWorkspaces(res.data);
      }
    } catch {
      // Offline or error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shell?.registerRefreshHandler) {
      return shell.registerRefreshHandler(fetchDashboardData);
    }
  }, [shell]);

  useEffect(() => {
    fetchDashboardData();

    if (!user?.id) return;
    const realtime = createRealtimeClient();
    const channel = realtime.channel(`user:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'USER_WORKSPACES_CHANGED' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      realtime.removeChannel(channel);
    };
  }, [user?.id]);

  // Collect all favorite boards across all workspaces
  const favoriteBoards = workspaces.flatMap((ws) =>
    (ws.boards || [])
      .filter((b: any) => b.is_favorite)
      .map((b: any) => ({ ...b, workspaceName: ws.name, workspaceId: ws.id }))
  );

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-semibold mb-2.5 border"
                style={{
                  backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
                  borderColor: 'rgba(var(--color-primary-rgb), 0.3)',
                  color: 'var(--color-primary-dark)',
                }}
              >
                <Kanban className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                <span>Không gian làm việc Planify</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Xin chào, {user?.name || 'bạn'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Tổng quan các không gian làm việc và bảng dự án Kanban của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Favorite Boards Section */}
        {favoriteBoards.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Bảng công việc yêu thích
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {favoriteBoards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="p-4.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                        {board.workspaceName}
                      </span>
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-slate-700 dark:group-hover:text-white transition-colors line-clamp-1">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Kanban className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                      Kanban Board
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces List Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Không gian làm việc của bạn ({workspaces.filter((w) => !w.isGuest && w.currentUserRole !== 'GUEST').length})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-36 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : workspaces.filter((w) => !w.isGuest && w.currentUserRole !== 'GUEST').length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-7 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center mx-auto mb-2.5"
                style={{
                  backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
                  color: 'var(--color-primary)',
                }}
              >
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chưa có Không gian làm việc riêng</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {workspaces.some((w) => w.isGuest || w.currentUserRole === 'GUEST')
                  ? 'Bạn đang tham gia các bảng công việc với tư cách Khách ở phần bên dưới. Bạn có thể tạo Không gian làm việc riêng để tự quản lý dự án.'
                  : 'Hãy tạo Không gian làm việc đầu tiên để bắt đầu quản lý các bảng dự án và cộng tác cùng đồng đội.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workspaces
                .filter((ws) => !ws.isGuest && ws.currentUserRole !== 'GUEST')
                .map((ws) => (
                  <div key={ws.id} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{ws.name}</h3>
                          {ws.currentUserRole === 'OWNER' ? (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-xs font-semibold border"
                              style={{
                                backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
                                color: 'var(--color-primary-dark)',
                                borderColor: 'rgba(var(--color-primary-rgb), 0.3)',
                              }}
                            >
                              Owner
                            </span>
                          ) : ws.currentUserRole === 'ADMIN' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Thành viên
                            </span>
                          )}
                        </div>
                        {ws.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-9.5">
                            {ws.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium px-2 py-1 rounded-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                          <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          <span>{ws.members?.length || 1} thành viên</span>
                        </span>

                        <Link
                          href={`/workspaces/${ws.id}`}
                          className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <span>Quản lý</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Boards within this Workspace */}
                    <div className="mt-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                        Bảng Kanban ({ws.boards?.length || 0})
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(ws.boards || []).map((b: any) => (
                          <Link
                            key={b.id}
                            href={`/boards/${b.id}`}
                            className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:shadow-2xs transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Kanban className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:opacity-100 shrink-0 transition-colors" />
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                                {b.name}
                              </span>
                            </div>
                            {b.is_favorite && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </Link>
                        ))}

                        <Link
                          href={`/workspaces/${ws.id}`}
                          className="p-3 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                          <span>Thêm Bảng</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Guest Boards Section (Các bảng dạng khách) */}
        {!isLoading && workspaces.some((w) => w.isGuest || w.currentUserRole === 'GUEST') && (
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Các bảng dạng khách (Guest Boards)
                </h2>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Các bảng công việc bạn được mời tham gia ngoài Không gian làm việc của bạn
              </span>
            </div>

            <div className="space-y-4">
              {workspaces
                .filter((ws) => ws.isGuest || ws.currentUserRole === 'GUEST')
                .map((ws) => (
                  <div
                    key={ws.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{ws.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Khách
                          </span>
                        </div>
                        {ws.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-9.5">
                            {ws.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span>{ws.boards?.length || 0} bảng được chia sẻ</span>
                      </div>
                    </div>

                    {/* Boards within this Guest Workspace */}
                    <div className="mt-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                        Bảng dạng khách có quyền truy cập ({ws.boards?.length || 0})
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(ws.boards || []).map((b: any) => (
                          <Link
                            key={b.id}
                            href={`/boards/${b.id}`}
                            className="p-3.5 rounded-lg bg-amber-50/20 dark:bg-amber-950/20 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Kanban className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 shrink-0 transition-colors" />
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                                {b.name}
                              </span>
                            </div>
                            {b.is_favorite ? (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            ) : (
                              <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
