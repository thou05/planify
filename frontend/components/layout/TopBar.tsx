'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import {
  LayoutGrid,
  Search,
  Plus,
  Bell,
  LogOut,
  User as UserIcon,
  History,
} from 'lucide-react';
import MyActivityModal from '@/components/modals/MyActivityModal';
import NotificationPopover from '@/components/notifications/NotificationPopover';

interface TopBarProps {
  onOpenCreateWorkspace?: () => void;
  onOpenCreateBoard?: () => void;
}

export default function TopBar({
  onOpenCreateWorkspace,
  onOpenCreateBoard,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const [isMyActivityOpen, setIsMyActivityOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Realtime instant notification subscription + fallback sync
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await apiClient<{ count: number }>('/notifications/unread-count');
        if (isMounted && res.success && typeof res.data?.count === 'number') {
          setUnreadCount(res.data.count);
        }
      } catch {
        // ignore
      }
    };

    fetchUnread();

    if (!user?.id) return;

    const channel = supabase.channel(`user-notifications:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'NOTIFICATION_RECEIVED' }, () => {
        setUnreadCount((prev) => prev + 1);
      })
      .on('broadcast', { event: 'NOTIFICATION_UPDATED' }, () => {
        fetchUnread();
      })
      .on('broadcast', { event: 'NOTIFICATION_DELETED' }, () => {
        fetchUnread();
      })
      .on('broadcast', { event: 'ALL_NOTIFICATIONS_READ' }, () => {
        setUnreadCount(0);
      })
      .subscribe();

    const fallbackTimer = setInterval(fetchUnread, 60000);

    return () => {
      isMounted = false;
      clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <>
      <header className="h-16 px-6 flex items-center justify-between glass-surface !rounded-none !border-x-0 !border-t-0 border-b border-white/40 sticky top-0 z-40 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20 group-hover:scale-105 transition-transform">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#2b1572]">
              Planify
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#a6d1fd]/50 text-[#2b1572] border border-white/50">
              v1.0
            </span>
          </Link>
        </div>

        {/* Middle Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40" />
            <input
              type="text"
              placeholder="Tìm kiếm công việc, board, thẻ..."
              className="w-full pl-10 pr-4 py-2 text-xs glass-input placeholder:text-[#2b1572]/40"
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {onOpenCreateBoard && (
            <button
              onClick={onOpenCreateBoard}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 btn-primary-glass text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Board</span>
            </button>
          )}

          <button
            onClick={() => setIsMyActivityOpen(true)}
            className="p-2 text-[#2b1572]/70 hover:text-[#2b1572] hover:bg-white/40 rounded-xl transition-colors cursor-pointer relative"
            title="Hoạt động của tôi"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Notification Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                isNotificationOpen
                  ? 'bg-white text-[#2b1572] shadow-xs'
                  : 'text-[#2b1572]/70 hover:text-[#2b1572] hover:bg-white/40'
              }`}
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#c40000] text-white text-[9px] font-black flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-white shadow-xs animate-in zoom-in-50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationPopover
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              onUnreadCountChange={setUnreadCount}
            />
          </div>

          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-[#2b1572]/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2b1572]/10 border border-white/80 flex items-center justify-center text-[#2b1572] font-bold text-xs shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-[#2b1572] leading-tight truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-[#2b1572]/60 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-[#2b1572]/60 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-xl transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* My Activity Modal */}
      <MyActivityModal
        isOpen={isMyActivityOpen}
        onClose={() => setIsMyActivityOpen(false)}
      />
    </>
  );
}
