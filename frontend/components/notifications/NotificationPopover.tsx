'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  UserCheck,
  Layout,
  Briefcase,
  ExternalLink,
  Sparkles,
  Inbox,
  X,
  Clock,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  UserX,
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function NotificationPopover({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationPopoverProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<{
        notifications: NotificationItem[];
        total: number;
        unreadCount: number;
      }>('/notifications?limit=30');

      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        const count = res.data.unreadCount ?? 0;
        setUnreadCount(count);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Realtime notification sync inside popover
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const channel = supabase.channel(`popover-notifications:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'NOTIFICATION_RECEIVED' }, ({ payload }) => {
        if (payload?.notification) {
          setNotifications((prev) => [payload.notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      })
      .on('broadcast', { event: 'NOTIFICATION_UPDATED' }, ({ payload }) => {
        if (payload?.notificationId) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.notificationId ? { ...n, is_read: !!payload.isRead } : n
            )
          );
        }
      })
      .on('broadcast', { event: 'NOTIFICATION_DELETED' }, ({ payload }) => {
        if (payload?.notificationId) {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.notificationId));
        }
      })
      .on('broadcast', { event: 'ALL_NOTIFICATIONS_READ' }, () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.id]);

  // Đóng popover khi bấm ra ngoài hoặc nhấn phím ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await apiClient(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isPerformingAction) return;
    try {
      setIsPerformingAction(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      await apiClient('/notifications/read-all', {
        method: 'PATCH',
      });
    } catch {
      fetchNotifications();
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await apiClient(`/notifications/${id}`, {
        method: 'DELETE',
      });
    } catch {
      fetchNotifications();
    }
  };

  const handleClearRead = async () => {
    const hasRead = notifications.some((n) => n.is_read);
    if (!hasRead || isPerformingAction) return;

    try {
      setIsPerformingAction(true);
      setNotifications((prev) => prev.filter((n) => !n.is_read));

      await apiClient('/notifications/clear-read', {
        method: 'DELETE',
      });
    } catch {
      fetchNotifications();
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }

    // Tách targetUrl nếu có
    const parts = (n.message || '').split('||');
    const targetUrl = parts[1];

    onClose();

    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'DUE_SOON':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs border border-amber-200/70">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'OVERDUE':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs border border-rose-200/70">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'MENTION':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2b1572] flex items-center justify-center shrink-0 shadow-xs border border-blue-200/60">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'ASSIGN':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200/60">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'BOARD_INVITE':
      case 'WORKSPACE_INVITE':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs border border-indigo-200/60">
            <UserPlus className="w-4 h-4" />
          </div>
        );
      case 'BOARD_REMOVED':
      case 'WORKSPACE_REMOVED':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs border border-rose-200/70">
            <UserX className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-[#2b1572]/10 text-[#2b1572] flex items-center justify-center shrink-0 shadow-xs border border-[#2b1572]/20">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2.5 z-50 w-[360px] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[560px] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 origin-top-right"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2b1572]/10 text-[#2b1572] flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-[#2b1572]">Thông báo</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#c40000] text-white rounded-full shadow-2xs">
              {unreadCount > 99 ? '99+' : unreadCount} mới
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isPerformingAction}
              className="p-1.5 text-xs text-slate-500 hover:text-[#2b1572] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="w-4 h-4 text-[#2b1572]" />
              <span className="text-[11px] font-medium hidden sm:inline">Đọc tất cả</span>
            </button>
          )}

          {notifications.some((n) => n.is_read) && (
            <button
              type="button"
              onClick={handleClearRead}
              disabled={isPerformingAction}
              className="p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Xoá thông báo đã đọc"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="px-3.5 py-1.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#2b1572] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filter === 'unread'
                ? 'bg-[#2b1572] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  filter === 'unread' ? 'bg-amber-300' : 'bg-[#c40000]'
                }`}
              />
            )}
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-normal">
          {notifications.length > 0 ? 'Cập nhật trực tiếp' : ''}
        </span>
      </div>

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse items-center">
                <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#a6d1fd]/20 text-[#2b1572] flex items-center justify-center mb-3 shadow-xs">
              {filter === 'unread' ? (
                <Check className="w-6 h-6 text-emerald-600" />
              ) : (
                <Inbox className="w-6 h-6 text-[#2b1572]" />
              )}
            </div>
            <p className="text-sm font-bold text-slate-700">
              {filter === 'unread' ? 'Tuyệt vời, không có tin chưa đọc!' : 'Chưa có thông báo nào'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              {filter === 'unread'
                ? 'Bạn đã đọc tất cả thông báo công việc.'
                : 'Mọi hoạt động phân công thẻ, hạn chót và nhắc tên sẽ hiển thị tại đây.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const parts = (n.message || '').split('||');
            const displayMessage = parts[0] || '';
            const targetUrl = parts[1] || null;

            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group p-3.5 flex items-start gap-3 transition-all cursor-pointer relative ${
                  !n.is_read
                    ? 'bg-[#a6d1fd]/12 hover:bg-[#a6d1fd]/22'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Type Icon */}
                {getNotificationIcon(n.type)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <p
                      className={`text-xs font-bold leading-tight truncate ${
                        !n.is_read ? 'text-[#2b1572]' : 'text-slate-800'
                      }`}
                    >
                      {n.title}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed break-words">
                    {displayMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(n.created_at)}</span>
                    {!n.is_read && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[#2b1572]/10 text-[#2b1572]">
                        Mới
                      </span>
                    )}
                    {targetUrl && (
                      <span className="inline-flex items-center gap-0.5 text-[#2b1572] text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Xem chi tiết</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#2b1572] absolute top-4 right-3.5 shadow-2xs" />
                )}

                {/* Hover Quick Actions */}
                <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white p-1 rounded-lg shadow-md border border-slate-200">
                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                      title="Đánh dấu đã đọc"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(n.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Xoá thông báo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#2b1572]" />
          <span>Planify Notifications</span>
        </span>
        <span>Lưu trữ 30 ngày</span>
      </div>
    </div>
  );
}
