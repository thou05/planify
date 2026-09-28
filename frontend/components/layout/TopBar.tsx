'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Shield,
  Mail,
  ChevronDown,
} from 'lucide-react';
import MyActivityModal from '@/components/modals/MyActivityModal';
import NotificationPopover from '@/components/notifications/NotificationPopover';
import ProfileModal from '@/components/modals/ProfileModal';

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'security' | 'invitations'>('profile');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Realtime instant notification subscription + periodic counter sync
  useEffect(() => {
    let isMounted = true;
    const fetchCounters = async () => {
      try {
        const notifRes = await apiClient<{ count: number }>('/notifications/unread-count');
        if (isMounted && notifRes.success && typeof notifRes.data?.count === 'number') {
          setUnreadCount(notifRes.data.count);
        }

        const inviteRes = await apiClient<any>('/users/invitations');
        if (isMounted && inviteRes.success && inviteRes.data) {
          const total =
            (inviteRes.data.workspaceInvites?.length || 0) +
            (inviteRes.data.boardInvites?.length || 0);
          setPendingInvitesCount(total);
        }
      } catch {
        // ignore
      }
    };

    fetchCounters();

    if (!user?.id) return;

    const channel = supabase.channel(`user-notifications:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'NOTIFICATION_RECEIVED' }, () => {
        setUnreadCount((prev) => prev + 1);
      })
      .on('broadcast', { event: 'NOTIFICATION_UPDATED' }, () => {
        fetchCounters();
      })
      .on('broadcast', { event: 'NOTIFICATION_DELETED' }, () => {
        fetchCounters();
      })
      .on('broadcast', { event: 'ALL_NOTIFICATIONS_READ' }, () => {
        setUnreadCount(0);
      })
      .subscribe();

    const fallbackTimer = setInterval(fetchCounters, 30000);

    return () => {
      isMounted = false;
      clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const openProfileTab = (tab: 'profile' | 'security' | 'invitations') => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
    setIsUserMenuOpen(false);
  };

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

          {/* User Profile Pill & Dropdown */}
          {user && (
            <div className="relative pl-2 border-l border-[#2b1572]/15" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-white/50 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#2b1572]/10 border border-white/80 overflow-hidden flex items-center justify-center text-[#2b1572] font-bold text-xs shadow-sm relative">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  )}
                  {pendingInvitesCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c40000] ring-2 ring-white absolute top-0 right-0" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-[#2b1572] leading-tight truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-[#2b1572]/60 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#2b1572]/50 hidden sm:block" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-black text-[#2b1572] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#2b1572]/60 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[9px]">
                      {user.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => openProfileTab('profile')}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-[#2b1572] hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-[#2b1572]/70" />
                      <span>Thông tin cá nhân</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openProfileTab('security')}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-[#2b1572] hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Shield className="w-4 h-4 text-[#2b1572]/70" />
                      <span>Bảo mật & Đổi mật khẩu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openProfileTab('invitations')}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-[#2b1572] hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-[#2b1572]/70" />
                        <span>Lời mời tham gia</span>
                      </div>
                      {pendingInvitesCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#c40000] text-white text-[10px] font-black">
                          {pendingInvitesCount}
                        </span>
                      )}
                    </button>

                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-[#2b1572]/80 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-100"
                    >
                      <span>Trang hồ sơ chi tiết</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-[#c40000] hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* My Activity Modal */}
      <MyActivityModal
        isOpen={isMyActivityOpen}
        onClose={() => setIsMyActivityOpen(false)}
      />

      {/* Profile & Account Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialTab={profileModalTab}
      />
    </>
  );
}
