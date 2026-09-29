'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  X,
  History,
  Kanban,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface ActivityTargetMeta {
  card_id?: string;
  card_title?: string;
  board_id?: string;
  board_name?: string;
  list_title?: string;
}

export interface ActivityItem {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  target_type: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar?: string | null;
    email?: string;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
  target_meta?: ActivityTargetMeta;
}

interface MyActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard?: (cardId: string) => void;
}

export default function MyActivityModal({
  isOpen,
  onClose,
  onSelectCard,
}: MyActivityModalProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'card' | 'board' | 'workspace'>('all');

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setPage(1);
      const res = await apiClient<ActivityItem[]>('/activities/me?limit=15&page=1');
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
        setHasMore(res.data.length >= 15);
      } else {
        setActivities([]);
        setHasMore(false);
      }
    } catch {
      // Ignore error
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const res = await apiClient<ActivityItem[]>(`/activities/me?limit=15&page=${nextPage}`);
      if (res.success && Array.isArray(res.data)) {
        setActivities((prev) => [...prev, ...res.data]);
        setPage(nextPage);
        setHasMore(res.data.length >= 15);
      } else {
        setHasMore(false);
      }
    } catch {
      // Ignore error
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatRelativeTime = (timestamp: string) => {
    try {
      const now = Date.now();
      const diff = now - new Date(timestamp).getTime();
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 1) return 'Vừa xong';
      if (mins < 60) return `${mins} phút trước`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} giờ trước`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days} ngày trước`;
      return new Date(timestamp).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getActionIcon = (action: string, targetType: string) => {
    if (action.includes('bình luận')) {
      return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (action.includes('đính kèm')) {
      return <Paperclip className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (action.includes('hoàn thành')) {
      return <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (action.includes('hạn chót') || action.includes('ngày hết hạn')) {
      return <Clock className="w-3.5 h-3.5 text-rose-500" />;
    }
    if (targetType.startsWith('board:')) {
      return <Kanban className="w-3.5 h-3.5 text-[#2b1572]" />;
    }
    if (targetType.startsWith('workspace:')) {
      return <Layers className="w-3.5 h-3.5 text-[#a000c8]" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-[#2b1572]" />;
  };

  const filteredActivities = activities.filter((act) => {
    if (filter === 'card') return act.target_type.startsWith('card:');
    if (filter === 'board') return act.target_type.startsWith('board:');
    if (filter === 'workspace') return act.target_type.startsWith('workspace:');
    return true;
  });

  const handleItemClick = (act: ActivityItem) => {
    const isRemovalAction =
      act.action.toLowerCase().includes('đã xóa') ||
      act.action.toLowerCase().includes('đã rời khỏi') ||
      act.action.toLowerCase().includes('xóa thành viên');

    if (isRemovalAction) {
      alert('Không thể chuyển tiếp: Hoạt động này ghi nhận thao tác xóa hoặc rời khỏi dự án.');
      return;
    }

    if (act.target_type.startsWith('card:')) {
      const cardId = act.target_meta?.card_id || act.target_type.replace('card:', '');
      const boardId = act.target_meta?.board_id;
      if (boardId) {
        router.push(`/boards/${boardId}?cardId=${cardId}`);
        onClose();
      } else if (onSelectCard) {
        onSelectCard(cardId);
        onClose();
      }
    } else if (act.target_type.startsWith('board:')) {
      const boardId = act.target_meta?.board_id || act.target_type.replace('board:', '');
      router.push(`/boards/${boardId}`);
      onClose();
    } else if (act.workspace_id) {
      if (act.action.includes('thành viên') || act.action.includes('vai trò')) {
        router.push(`/workspaces/${act.workspace_id}?tab=members`);
      } else if (act.action.includes('cài đặt') || act.action.includes('tên') || act.action.includes('mô tả')) {
        router.push(`/workspaces/${act.workspace_id}?tab=settings`);
      } else {
        router.push(`/workspaces/${act.workspace_id}`);
      }
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-sm">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2b1572]">Hoạt động của tôi</h3>
              <p className="text-[11px] text-slate-400">
                Toàn bộ lịch sử thao tác của bạn trên hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchActivities}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#2b1572] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${filter === 'all'
                ? 'bg-[#2b1572] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
              }`}
          >
            Tất cả ({activities.length})
          </button>
          <button
            onClick={() => setFilter('card')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${filter === 'card'
                ? 'bg-[#2b1572] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
              }`}
          >
            Thẻ công việc ({activities.filter((a) => a.target_type.startsWith('card:')).length})
          </button>
          <button
            onClick={() => setFilter('board')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${filter === 'board'
                ? 'bg-[#2b1572] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
              }`}
          >
            Bảng ({activities.filter((a) => a.target_type.startsWith('board:')).length})
          </button>
          <button
            onClick={() => setFilter('workspace')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${filter === 'workspace'
                ? 'bg-[#2b1572] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
              }`}
          >
            Workspace ({activities.filter((a) => a.target_type.startsWith('workspace:')).length})
          </button>
        </div>

        {/* Activity Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading && activities.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2b1572]" />
              <span className="text-xs">Đang tải lịch sử hoạt động...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#2b1572]" />
              <p className="text-xs font-semibold">Chưa có hoạt động nào</p>
              <p className="text-[11px] mt-0.5">Các thao tác của bạn sẽ được tự động lưu lại ở đây.</p>
            </div>
          ) : (
            <>
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => handleItemClick(act)}
                  className="group p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-[#2b1572]/20 hover:shadow-xs transition-all flex items-start gap-3 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    {getActionIcon(act.action, act.target_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-800 font-medium leading-relaxed break-words">
                        <span className="font-bold text-[#2b1572]">Bạn </span>
                        {act.action}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                        {formatRelativeTime(act.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      {act.workspace?.name && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 font-medium text-slate-500">
                          {act.workspace.name}
                        </span>
                      )}
                      {act.target_type.startsWith('card:') && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-[#2b1572] font-semibold flex items-center gap-1 group-hover:bg-purple-100 transition-colors">
                          Thẻ{act.target_meta?.board_name ? ` • ${act.target_meta.board_name}` : ''} <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </span>
                      )}
                      {act.target_type.startsWith('board:') && (
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold flex items-center gap-1 group-hover:bg-blue-100 transition-colors">
                          Bảng{act.target_meta?.board_name ? `: ${act.target_meta.board_name}` : ''} <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2b1572] bg-slate-100 hover:bg-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingMore && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isLoadingMore ? 'Đang tải thêm...' : 'Tải thêm hoạt động cũ hơn'}</span>
                  </button>
                </div>
              )}

              {!hasMore && activities.length > 0 && (
                <div className="py-2 text-center text-[11px] text-slate-400 font-medium">
                  Đã hiển thị tất cả hoạt động
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
