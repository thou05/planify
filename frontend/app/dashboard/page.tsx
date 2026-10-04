'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { useShell } from '@/components/layout/ShellContext';
import {
  Layers,
  Kanban,
  Star,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
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
    const channel = supabase.channel(`user-dashboard:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'USER_WORKSPACES_CHANGED' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 mb-2.5">
                <Kanban className="w-3 h-3 text-slate-500" />
                <span>Không gian làm việc Planify</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Xin chào, {user?.name || 'bạn'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
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
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Bảng công việc yêu thích</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {favoriteBoards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="p-4 rounded-md border border-slate-200 hover:border-slate-400 bg-white transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
                        {board.workspaceName}
                      </span>
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm group-hover:text-slate-700 transition-colors line-clamp-1">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Kanban className="w-3.5 h-3.5 text-slate-400" />
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
              <Layers className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Không gian làm việc (Workspaces)</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-slate-200 h-36 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-lg border border-dashed border-slate-300">
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 mx-auto mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Chưa có Workspace nào</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Hãy tạo Workspace đầu tiên để bắt đầu quản lý các bảng dự án và cộng tác cùng đồng đội.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workspaces.map((ws) => (
                <div key={ws.id} className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{ws.name}</h3>
                        {ws.currentUserRole === 'OWNER' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Owner
                          </span>
                        ) : ws.currentUserRole === 'ADMIN' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Admin
                          </span>
                        ) : ws.currentUserRole === 'GUEST' || ws.isGuest ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Khách
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Thành viên
                          </span>
                        )}
                      </div>
                      {ws.description && (
                        <p className="text-xs text-slate-500 mt-1 pl-9.5">
                          {ws.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium px-2 py-1 rounded-xs bg-slate-50 border border-slate-200">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>{ws.members?.length || 1} thành viên</span>
                      </span>

                      <Link
                        href={`/workspaces/${ws.id}`}
                        className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <span>Quản lý</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Boards within this Workspace */}
                  <div className="mt-3.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                      Bảng Kanban ({ws.boards?.length || 0})
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {(ws.boards || []).map((b: any) => (
                        <Link
                          key={b.id}
                          href={`/boards/${b.id}`}
                          className="p-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Kanban className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
                            <span className="text-xs font-medium text-slate-800 truncate">
                              {b.name}
                            </span>
                          </div>
                          {b.is_favorite && (
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </Link>
                      ))}

                      <Link
                        href={`/workspaces/${ws.id}`}
                        className="p-3 rounded-md bg-white hover:bg-slate-50 border border-dashed border-slate-300 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Bảng</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
