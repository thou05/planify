'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { createRealtimeClient } from '@/lib/supabase';
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
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import ThemeToggle from '@/components/theme/ThemeToggle';
import MyActivityModal from '@/components/modals/MyActivityModal';
import NotificationPopover from '@/components/notifications/NotificationPopover';
import ProfileModal from '@/components/modals/ProfileModal';
import GlobalSearchModal from '@/components/modals/GlobalSearchModal';

interface TopBarProps {
  onOpenCreateWorkspace?: () => void;
  onOpenCreateBoard?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopBar({
  onOpenCreateWorkspace,
  onOpenCreateBoard,
  isSidebarOpen,
  onToggleSidebar,
}: TopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setIsCustomizerOpen } = useTheme();
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

    const realtime = createRealtimeClient();
    const channel = realtime.channel(`user:${user.id}`, {
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
      realtime.removeChannel(channel);
    };
  }, [user?.id]);

  const openProfileTab = (tab: 'profile' | 'security' | 'invitations' | 'notifications') => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shrink-0">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={isSidebarOpen ? 'Thu gọn menu bên (Ctrl+B)' : 'Mở menu bên (Ctrl+B)'}
              className={`p-1.5 rounded-md transition-all cursor-pointer border flex items-center justify-center ${
                isSidebarOpen
                  ? 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  : 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-2xs'
              }`}
              aria-label={isSidebarOpen ? 'Thu gọn menu bên' : 'Mở menu bên'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-slate-900 dark:text-white" />
              )}
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all shadow-xs"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Planify
            </span>
            <span
              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm border"
              style={{
                backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
                color: 'var(--color-primary-dark)',
                borderColor: 'rgba(var(--color-primary-rgb), 0.3)',
              }}
            >
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
              className="w-full pl-9 pr-24 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-[#87ceeb] dark:focus:border-slate-500 rounded-md placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 font-normal outline-none transition-colors"
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
                className="absolute right-20 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dedicated Search Button */}
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-slate-900 dark:text-slate-900 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-contrast, #ffffff)',
              }}
              title="Tìm kiếm"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Tìm</span>
            </button>
          </form>

          {/* Live Search Results Dropdown directly below Search Bar */}
          {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto p-2 space-y-2">
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tìm kiếm...</span>
                </div>
              )}

              {!isSearching &&
                searchResults.workspaces.length === 0 &&
                searchResults.boards.length === 0 &&
                searchResults.cards.length === 0 && (
                  <div className="py-6 px-3 text-center">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Không tìm thấy kết quả nào cho &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Thử tìm với tên bảng, thẻ hoặc không gian làm việc khác
                    </p>
                  </div>
                )}

              {/* Workspaces list */}
              {/* Workspaces list */}
              {searchResults.workspaces.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <FolderKanban className="w-3 h-3 text-slate-600" />
                    <span>Không gian làm việc ({searchResults.workspaces.length})</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.workspaces.map((w: any) => (
                      <div
                        key={w.id}
                        onClick={() => handleSelectResult(`/workspaces/${w.id}`)}
                        className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                            <FolderKanban className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {w.name}
                            </p>
                            {w.description && (
                              <p className="text-[10px] text-slate-500 truncate">
                                {w.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boards list */}
              {searchResults.boards.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <LayoutGrid className="w-3 h-3 text-slate-600" />
                    <span>Bảng công việc ({searchResults.boards.length})</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.boards.map((b: any) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectResult(`/boards/${b.id}`)}
                        className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {b.name}
                              </p>
                              {b.workspace_name && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 font-medium truncate border border-slate-200">
                                  {b.workspace_name}
                                </span>
                              )}
                            </div>
                            {b.description && (
                              <p className="text-[10px] text-slate-500 truncate">
                                {b.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cards list */}
              {searchResults.cards.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <CreditCard className="w-3 h-3 text-slate-600" />
                    <span>Thẻ công việc ({searchResults.cards.length})</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.cards.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() =>
                          handleSelectResult(`/boards/${c.board_id}?cardId=${c.id}`)
                        }
                        className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {c.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {c.board_name && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 font-medium truncate border border-slate-200">
                                  Bảng: {c.board_name}
                                </span>
                              )}
                              {c.list_name && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 font-medium truncate border border-slate-200">
                                  Cột: {c.list_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={() => setIsGlobalSearchOpen(true)}
            className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="Tìm kiếm (Ctrl + K)"
          >
            <Search className="w-4 h-4" />
          </button>
          {onOpenCreateBoard && (
            <button
              onClick={onOpenCreateBoard}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 btn-primary text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Board</span>
            </button>
          )}

          {/* Theme Quick Toggle (Sun/Moon) & Palette */}
          <ThemeToggle />

          <button
            onClick={() => setIsMyActivityOpen(true)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer relative"
            title="Hoạt động của tôi"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Notification Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer relative ${
                isNotificationOpen
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="min-w-[15px] h-3.5 px-1 rounded-full bg-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 ring-1 ring-white dark:ring-slate-900">
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
            <div className="relative pl-1.5 border-l border-slate-200 dark:border-slate-800" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div
                  className="w-7 h-7 rounded-full text-white overflow-hidden flex items-center justify-center font-bold text-xs relative shadow-2xs"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  )}
                  {pendingInvitesCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#dc2626] ring-1 ring-white dark:ring-slate-900 absolute top-0 right-0" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold text-[9px]">
                      {user.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => openProfileTab('profile')}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Thông tin cá nhân</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsCustomizerOpen(true);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Giao diện & Màu sắc</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openProfileTab('security')}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Bảo mật & Đổi mật khẩu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openProfileTab('invitations')}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Lời mời tham gia</span>
                      </div>
                      {pendingInvitesCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#dc2626] text-white text-[9px] font-bold">
                          {pendingInvitesCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openProfileTab('notifications')}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Cài đặt thông báo</span>
                    </button>

                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800"
                    >
                      <span>Trang hồ sơ chi tiết</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
