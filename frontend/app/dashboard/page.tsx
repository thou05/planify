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
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="glass-surface p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-[#a6d1fd]/25 blur-3xl pointer-events-none" />
          <div className="absolute -right-4 -top-8 w-64 h-64 rounded-full bg-[#a000c8]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 text-xs font-semibold text-[#2b1572] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#a000c8]" />
              <span>Không gian làm việc Planify</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2b1572] tracking-tight">
              Xin chào, {user?.name || 'bạn'}! 👋
            </h1>
            <p className="text-sm text-[#2b1572]/70 mt-1 max-w-xl">
              Chào mừng bạn quay lại hệ thống quản lý công việc và dự án Kanban. Dưới đây là các không gian làm việc và bảng việc của bạn.
            </p>
          </div>
        </div>

        {/* Favorite Boards Section */}
        {favoriteBoards.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-lg font-bold text-[#2b1572]">Bảng công việc yêu thích</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {favoriteBoards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="kanban-card p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-[#2b1572]/60 uppercase tracking-wider truncate">
                        {board.workspaceName}
                      </span>
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    </div>
                    <h3 className="font-bold text-[#2b1572] text-base group-hover:text-[#4f91cf] transition-colors line-clamp-1">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-[#2b1572]/70 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2b1572]/10 flex items-center justify-between text-xs text-[#2b1572]/60">
                    <span className="flex items-center gap-1.5">
                      <Kanban className="w-3.5 h-3.5" />
                      Kanban Board
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces List Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#2b1572]" />
              <h2 className="text-lg font-bold text-[#2b1572]">Không gian làm việc (Workspaces)</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="glass-weak h-40 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="glass-surface p-8 text-center rounded-2xl border-dashed border-2 border-white/60">
              <div className="w-12 h-12 rounded-2xl bg-[#2b1572]/10 flex items-center justify-center text-[#2b1572] mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#2b1572]">Chưa có Workspace nào</h3>
              <p className="text-xs text-[#2b1572]/60 mt-1 max-w-sm mx-auto">
                Hãy tạo Workspace đầu tiên để bắt đầu quản lý các bảng dự án và cộng tác cùng đồng đội.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {workspaces.map((ws) => (
                <div key={ws.id} className="glass-surface p-6 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2b1572]/10">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] font-bold text-xs shadow-sm">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-lg font-bold text-[#2b1572]">{ws.name}</h3>
                        {ws.currentUserRole === 'OWNER' ? (
                          <span className="badge-ai text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Owner
                          </span>
                        ) : ws.currentUserRole === 'ADMIN' ? (
                          <span className="badge-info text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Admin
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-[#2b1572]/70 font-semibold border border-white/80">
                            Thành viên
                          </span>
                        )}
                      </div>
                      {ws.description && (
                        <p className="text-xs text-[#2b1572]/70 mt-1 pl-10.5">
                          {ws.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="flex items-center gap-1 text-xs text-[#2b1572]/70 font-medium px-2.5 py-1 rounded-full bg-white/50 border border-white/60">
                        <Users className="w-3.5 h-3.5" />
                        <span>{ws.members?.length || 1} thành viên</span>
                      </span>

                      <Link
                        href={`/workspaces/${ws.id}`}
                        className="px-3.5 py-1.5 btn-secondary text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Quản lý</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Boards within this Workspace */}
                  <div className="mt-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#2b1572]/60 mb-3">
                      Các bảng Kanban trong Workspace ({ws.boards?.length || 0})
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {(ws.boards || []).map((b: any) => (
                        <Link
                          key={b.id}
                          href={`/boards/${b.id}`}
                          className="p-3.5 rounded-xl bg-white/50 hover:bg-white/80 border border-white/60 transition-all flex items-center justify-between group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Kanban className="w-4 h-4 text-[#2b1572]/60 group-hover:text-[#2b1572] shrink-0" />
                            <span className="text-xs font-bold text-[#2b1572] truncate">
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
                        className="p-3.5 rounded-xl bg-[#a6d1fd]/20 hover:bg-[#a6d1fd]/40 border border-dashed border-[#a6d1fd] transition-all flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2b1572] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Board</span>
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
