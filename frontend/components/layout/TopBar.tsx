'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  FolderKanban,
  CreditCard,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import MyActivityModal from '@/components/modals/MyActivityModal';
import NotificationPopover from '@/components/notifications/NotificationPopover';
import ProfileModal from '@/components/modals/ProfileModal';
import GlobalSearchModal from '@/components/modals/GlobalSearchModal';

interface TopBarProps {
  onOpenCreateWorkspace?: () => void;
  onOpenCreateBoard?: () => void;
}

export default function TopBar({
  onOpenCreateWorkspace,
  onOpenCreateBoard,
}: TopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isMyActivityOpen, setIsMyActivityOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'security' | 'invitations' | 'notifications'>('profile');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // In-Bar Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    workspaces: any[];
    boards: any[];
    cards: any[];
  }>({ workspaces: [], boards: [], cards: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live search effect with 200ms debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults({ workspaces: [], boards: [], cards: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient<any>(`/search?q=${encodeURIComponent(q)}`);
        if (res.success && res.data) {
          setSearchResults(res.data);
          setIsSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus search input when pressing Ctrl+K without showing prominent badge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        if (searchQuery.trim()) {
          setIsSearchDropdownOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Close menus and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchDropdownOpen(true);
  };

  const handleSelectResult = (url: string) => {
    setIsSearchDropdownOpen(false);
    router.push(url);
  };

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

  const openProfileTab = (tab: 'profile' | 'security' | 'invitations' | 'notifications') => {
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

        {/* Middle Search Bar with Direct Keyword Typing & Search Button */}
        <div
          ref={searchContainerRef}
          className="hidden md:flex items-center flex-1 max-w-md mx-6 relative"
        >
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full flex items-center"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setIsSearchDropdownOpen(true);
                }
              }}
              placeholder="Tìm kiếm không gian, bảng, thẻ..."
              className="w-full pl-10 pr-28 py-2 text-xs glass-input placeholder:text-[#2b1572]/40 text-[#2b1572] font-medium"
            />

            {/* Clear Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults({ workspaces: [], boards: [], cards: [] });
                  setIsSearchDropdownOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-24 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dedicated Search Button */}
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#2b1572] hover:bg-[#1e0f52] active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Tìm kiếm"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Tìm kiếm</span>
            </button>
          </form>

          {/* Live Search Results Dropdown directly below Search Bar */}
          {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl shadow-[#2b1572]/20 overflow-hidden z-50 max-h-[70vh] overflow-y-auto animate-scale-up p-2.5 space-y-3">
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-[#2b1572]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tìm kiếm...</span>
                </div>
              )}

              {!isSearching &&
                searchResults.workspaces.length === 0 &&
                searchResults.boards.length === 0 &&
                searchResults.cards.length === 0 && (
                  <div className="py-6 px-3 text-center">
                    <p className="text-xs font-bold text-slate-700">
                      Không tìm thấy kết quả nào cho &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Thử tìm với tên bảng, thẻ hoặc không gian làm việc khác
                    </p>
                  </div>
                )}

              {/* Workspaces list */}
              {searchResults.workspaces.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-[#2b1572]/60 uppercase tracking-wider">
                    <FolderKanban className="w-3 h-3 text-[#2b1572]" />
                    <span>Không gian làm việc ({searchResults.workspaces.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {searchResults.workspaces.map((w: any) => (
                      <div
                        key={w.id}
                        onClick={() => handleSelectResult(`/workspaces/${w.id}`)}
                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#2b1572] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#a6d1fd]/30 group-hover:bg-white/20 text-[#2b1572] group-hover:text-white flex items-center justify-center shrink-0">
                            <FolderKanban className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#2b1572] group-hover:text-white truncate">
                              {w.name}
                            </p>
                            {w.description && (
                              <p className="text-[10px] text-slate-400 group-hover:text-white/70 truncate">
                                {w.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boards list */}
              {searchResults.boards.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-[#2b1572]/60 uppercase tracking-wider">
                    <LayoutGrid className="w-3 h-3 text-[#2b1572]" />
                    <span>Bảng công việc ({searchResults.boards.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {searchResults.boards.map((b: any) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectResult(`/boards/${b.id}`)}
                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#2b1572] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 group-hover:bg-white/20 text-emerald-700 group-hover:text-white flex items-center justify-center shrink-0">
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-[#2b1572] group-hover:text-white truncate">
                                {b.name}
                              </p>
                              {b.workspace_name && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 group-hover:bg-white/20 text-slate-600 group-hover:text-white font-medium truncate">
                                  {b.workspace_name}
                                </span>
                              )}
                            </div>
                            {b.description && (
                              <p className="text-[10px] text-slate-400 group-hover:text-white/70 truncate">
                                {b.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cards list */}
              {searchResults.cards.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-[#2b1572]/60 uppercase tracking-wider">
                    <CreditCard className="w-3 h-3 text-[#2b1572]" />
                    <span>Thẻ công việc ({searchResults.cards.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {searchResults.cards.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() =>
                          handleSelectResult(`/boards/${c.board_id}?cardId=${c.id}`)
                        }
                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#2b1572] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 group-hover:bg-white/20 text-[#2b1572] group-hover:text-white flex items-center justify-center shrink-0">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#2b1572] group-hover:text-white truncate">
                              {c.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {c.board_name && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#a6d1fd]/30 group-hover:bg-white/20 text-[#2b1572] group-hover:text-white font-medium truncate">
                                  Bảng: {c.board_name}
                                </span>
                              )}
                              {c.list_name && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 group-hover:bg-white/20 text-slate-600 group-hover:text-white font-medium truncate">
                                  Cột: {c.list_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => setIsGlobalSearchOpen(true)}
            className="md:hidden p-2 text-[#2b1572]/70 hover:text-[#2b1572] hover:bg-white/40 rounded-xl transition-colors cursor-pointer"
            title="Tìm kiếm (Ctrl + K)"
          >
            <Search className="w-4 h-4" />
          </button>
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

                    <button
                      type="button"
                      onClick={() => openProfileTab('notifications')}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-[#2b1572] hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Bell className="w-4 h-4 text-[#2b1572]/70" />
                      <span>Cài đặt thông báo</span>
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

      {/* Global Command Palette Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />
    </>
  );
}
