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

    // Tách targetUrl nếu có từ cấu trúc "message||/target-url"
    const parts = (n.message || '').split('||');
    let targetUrl = parts[1]?.trim();

    // Nếu không có targetUrl từ || nhưng message hoặc type chứa URL dạng /invite/:token
    if (!targetUrl) {
      const inviteMatch = n.message?.match(/\/invite\/[a-zA-Z0-9_\-]+/);
      if (inviteMatch) {
        targetUrl = inviteMatch[0];
      }
    }

    onClose();

    if (targetUrl) {
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        try {
          const parsed = new URL(targetUrl);
          router.push(parsed.pathname + parsed.search);
        } catch {
          router.push(targetUrl);
        }
      } else {
        router.push(targetUrl);
      }
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
          <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
          </div>
        );
      case 'OVERDUE':
        return (
          <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
        );
      case 'MENTION':
        return (
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
        );
      case 'ASSIGN':
        return (
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
        );
      case 'BOARD_INVITE':
      case 'WORKSPACE_INVITE':
        return (
          <div className="w-7 h-7 rounded-md bg-[#ffc0cb]/30 text-[#d86969] flex items-center justify-center shrink-0 border border-[#ffc0cb]/80">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
        );
      case 'BOARD_REMOVED':
      case 'WORKSPACE_REMOVED':
        return (
          <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
            <UserX className="w-3.5 h-3.5" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
            <Bell className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 z-50 w-[360px] sm:w-[420px] bg-white rounded-lg shadow-xl border border-slate-300 flex flex-col max-h-[560px] overflow-hidden animate-fade-in origin-top-right"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#f28d8d] text-white flex items-center justify-center shadow-2xs">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Thông báo</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-rose-600 text-white rounded-xs">
              {unreadCount > 99 ? '99+' : unreadCount} mới
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isPerformingAction}
              className="px-2 py-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[11px] font-medium hidden sm:inline">Đọc tất cả</span>
            </button>
          )}

          {notifications.some((n) => n.is_read) && (
            <button
              type="button"
              onClick={handleClearRead}
              disabled={isPerformingAction}
              className="p-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-rose-200 disabled:opacity-50"
              title="Xoá thông báo đã đọc"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer ml-0.5"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-medium shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              filter === 'all'
                ? 'bg-[#f28d8d] text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs ${
              filter === 'unread'
                ? 'bg-[#f28d8d] text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  filter === 'unread' ? 'bg-amber-400' : 'bg-rose-500'
                }`}
              />
            )}
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          {notifications.length > 0 ? 'REALTIME' : ''}
        </span>
      </div>

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
        {isLoading && notifications.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse items-center">
                <div className="w-7 h-7 rounded-md bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mb-3">
              {filter === 'unread' ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <Inbox className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <p className="text-xs font-semibold text-slate-800">
              {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
              {filter === 'unread'
                ? 'Bạn đã xem tất cả thông báo công việc.'
                : 'Mọi hoạt động phân công, hạn chót và nhắc tên sẽ hiển thị tại đây.'}
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
                className={`group p-3 flex items-start gap-3 transition-colors cursor-pointer relative ${
                  !n.is_read
                    ? 'bg-slate-50/80 hover:bg-slate-100/90'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Type Icon */}
                {getNotificationIcon(n.type)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <p
                      className={`text-xs leading-tight truncate ${
                        !n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {n.title}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed break-words">
                    {displayMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatRelativeTime(n.created_at)}</span>
                    {!n.is_read && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-xs text-[9px] font-semibold bg-[#f28d8d] text-white shadow-2xs">
                        Mới
                      </span>
                    )}
                    {targetUrl && (
                      <span className="inline-flex items-center gap-0.5 text-slate-700 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Chi tiết</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {!n.is_read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-3.5 right-3" />
                )}

                {/* Hover Quick Actions */}
                <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white p-0.5 rounded-md shadow-xs border border-slate-200">
                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                      title="Đánh dấu đã đọc"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(n.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Xoá thông báo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-slate-400">
          <span>Planify Notifications</span>
        </span>
        <span className="text-[10px] text-slate-400">Lưu trữ 30 ngày</span>
      </div>
    </div>
  );
}
