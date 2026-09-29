'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  History,
  Kanban,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  ChevronRight,
  User,
} from 'lucide-react';

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

type FilterType = 'all' | 'card' | 'board' | 'workspace' | 'comment';

export default function MyActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchActivities = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setPage(1);
      const res = await apiClient<ActivityItem[]>('/activities/me?limit=25&page=1');
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
        setHasMore(res.data.length >= 25);
      } else {
        setActivities([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const res = await apiClient<ActivityItem[]>(`/activities/me?limit=25&page=${nextPage}`);
      if (res.success && Array.isArray(res.data)) {
        setActivities((prev) => [...prev, ...res.data]);
        setPage(nextPage);
        setHasMore(res.data.length >= 25);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more activities:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatExactTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

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

  const getActionBadge = (action: string, targetType: string) => {
    const actLower = action.toLowerCase();
    if (actLower.includes('bình luận') || actLower.includes('comment')) {
      return {
        icon: MessageSquare,
        badgeClass: 'badge-info',
        label: 'Bình luận',
      };
    }
    if (actLower.includes('đính kèm') || actLower.includes('tệp') || actLower.includes('file')) {
      return {
        icon: Paperclip,
        badgeClass: 'badge-info',
        label: 'Tệp đính kèm',
      };
    }
    if (actLower.includes('hoàn thành') || actLower.includes('xong') || actLower.includes('complete')) {
      return {
        icon: CheckSquare,
        badgeClass: 'badge-success',
        label: 'Hoàn thành',
      };
    }
    if (actLower.includes('hạn chót') || actLower.includes('ngày hết hạn') || actLower.includes('quá hạn') || actLower.includes('due')) {
      return {
        icon: Clock,
        badgeClass: 'badge-error',
        label: 'Thời hạn',
      };
    }
    if (targetType.startsWith('board:')) {
      return {
        icon: Kanban,
        badgeClass: 'badge-info',
        label: 'Bảng Kanban',
      };
    }
    if (targetType.startsWith('workspace:')) {
      return {
        icon: Layers,
        badgeClass: 'badge-ai',
        label: 'Workspace',
      };
    }
    return {
      icon: Sparkles,
      badgeClass: 'badge-ai',
      label: 'Hoạt động',
    };
  };

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
      }
    } else if (act.target_type.startsWith('board:')) {
      const boardId = act.target_meta?.board_id || act.target_type.replace('board:', '');
      router.push(`/boards/${boardId}`);
    } else if (act.workspace_id) {
      if (act.action.includes('thành viên') || act.action.includes('vai trò')) {
        router.push(`/workspaces/${act.workspace_id}?tab=members`);
      } else if (act.action.includes('cài đặt') || act.action.includes('tên') || act.action.includes('mô tả')) {
        router.push(`/workspaces/${act.workspace_id}?tab=settings`);
      } else {
        router.push(`/workspaces/${act.workspace_id}`);
      }
    }
  };

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type Filter
      if (filter === 'card' && !act.target_type.startsWith('card:')) return false;
      if (filter === 'board' && !act.target_type.startsWith('board:')) return false;
      if (filter === 'workspace' && !act.target_type.startsWith('workspace:')) return false;
      if (filter === 'comment') {
        const actLower = act.action.toLowerCase();
        if (!actLower.includes('bình luận') && !actLower.includes('comment')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchAction = act.action?.toLowerCase().includes(query);
        const matchCard = act.target_meta?.card_title?.toLowerCase().includes(query);
        const matchBoard = act.target_meta?.board_name?.toLowerCase().includes(query);
        const matchWs = act.workspace?.name?.toLowerCase().includes(query);
        const matchUser = act.user?.name?.toLowerCase().includes(query);
        if (!matchAction && !matchCard && !matchBoard && !matchWs && !matchUser) {
          return false;
        }
      }

      return true;
    });
  }, [activities, filter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = activities.length;
    const cardsCount = activities.filter((a) => a.target_type.startsWith('card:')).length;
    const boardsCount = activities.filter((a) => a.target_type.startsWith('board:')).length;
    const wsCount = activities.filter((a) => a.target_type.startsWith('workspace:')).length;
    return { total, cardsCount, boardsCount, wsCount };
  }, [activities]);

  // Group by Date sections
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: ActivityItem[] } = {};
    const now = new Date();
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStr = todayStr - 86400000;
    const weekAgoStr = todayStr - 7 * 86400000;
    const monthAgoStr = todayStr - 30 * 86400000;

    filteredActivities.forEach((act) => {
      const actDate = new Date(act.created_at);
      const actTime = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate()).getTime();

      let groupLabel = 'Cũ hơn';
      if (actTime === todayStr) {
        groupLabel = 'Hôm nay';
      } else if (actTime === yesterdayStr) {
        groupLabel = 'Hôm qua';
      } else if (actTime > weekAgoStr) {
        groupLabel = '7 ngày qua';
      } else if (actTime > monthAgoStr) {
        groupLabel = 'Tháng này';
      }

      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(act);
    });

    return groups;
  }, [filteredActivities]);

  const groupKeys = Object.keys(groupedActivities);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Welcome / Hero Banner - Exactly matching dashboard/workspace style */}
      <div className="glass-surface p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-[#a6d1fd]/25 blur-3xl pointer-events-none" />
        <div className="absolute -right-4 -top-8 w-64 h-64 rounded-full bg-[#a000c8]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 text-xs font-semibold text-[#2b1572] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#a000c8]" />
            <span>Nhật ký hành động Planify</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2b1572] tracking-tight">
            Hoạt động của tôi
          </h1>
          <p className="text-sm text-[#2b1572]/70 mt-1 max-w-xl">
            Xem lại toàn bộ lịch sử thao tác, chỉnh sửa thẻ, bảng làm việc và không gian làm việc của bạn theo dòng thời gian.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => fetchActivities(true)}
            disabled={isLoading || isRefreshing}
            className="px-4 py-2 btn-secondary text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Làm mới hoạt động"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#a000c8]' : 'text-[#2b1572]'}`} />
            <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Overview - Styled with kanban-card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="kanban-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#2b1572]/10 flex items-center justify-center text-[#2b1572] shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#2b1572]/60 uppercase tracking-wider">Tổng hoạt động</div>
            <div className="text-xl font-bold text-[#2b1572]">{stats.total}</div>
          </div>
        </div>

        <div className="kanban-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#a6d1fd]/30 flex items-center justify-center text-[#2b1572] shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#2b1572]/60 uppercase tracking-wider">Thẻ & Nhiệm vụ</div>
            <div className="text-xl font-bold text-[#2b1572]">{stats.cardsCount}</div>
          </div>
        </div>

        <div className="kanban-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#a000c8]/15 flex items-center justify-center text-[#a000c8] shrink-0">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#2b1572]/60 uppercase tracking-wider">Bảng Kanban</div>
            <div className="text-xl font-bold text-[#2b1572]">{stats.boardsCount}</div>
          </div>
        </div>

        <div className="kanban-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-700 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#2b1572]/60 uppercase tracking-wider">Workspace</div>
            <div className="text-xl font-bold text-[#2b1572]">{stats.wsCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-surface p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Filter Tabs using btn-primary-glass and btn-secondary */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'btn-primary shadow-xs'
                : 'btn-secondary text-[#2b1572]/70'
            }`}
          >
            Tất cả ({activities.length})
          </button>
          <button
            onClick={() => setFilter('card')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              filter === 'card'
                ? 'btn-primary shadow-xs'
                : 'btn-secondary text-[#2b1572]/70'
            }`}
          >
            Thẻ & Công việc
          </button>
          <button
            onClick={() => setFilter('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              filter === 'board'
                ? 'btn-primary shadow-xs'
                : 'btn-secondary text-[#2b1572]/70'
            }`}
          >
            Bảng làm việc
          </button>
          <button
            onClick={() => setFilter('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              filter === 'workspace'
                ? 'btn-primary shadow-xs'
                : 'btn-secondary text-[#2b1572]/70'
            }`}
          >
            Không gian làm việc
          </button>
          <button
            onClick={() => setFilter('comment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              filter === 'comment'
                ? 'btn-primary shadow-xs'
                : 'btn-secondary text-[#2b1572]/70'
            }`}
          >
            Bình luận
          </button>
        </div>

        {/* Search Input styled with .glass-input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#2b1572]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung, tên thẻ, bảng..."
            className="glass-input pl-9 pr-3.5 py-1.5 text-xs w-full font-medium"
          />
        </div>
      </div>

      {/* Main Activities Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-weak h-20 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="glass-surface p-8 text-center rounded-2xl border-dashed border-2 border-white/60 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2b1572]/10 flex items-center justify-center text-[#2b1572] mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2b1572]">
              {searchQuery ? 'Không tìm thấy hoạt động phù hợp' : 'Chưa có hoạt động nào'}
            </h3>
            <p className="text-xs text-[#2b1572]/60 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Không có kết quả nào khớp với "${searchQuery}". Hãy thử từ khóa khác.`
                : 'Mọi thao tác bạn thực hiện trên các thẻ, bảng hoặc không gian làm việc sẽ xuất hiện tại đây.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-1.5 btn-secondary text-xs font-semibold cursor-pointer"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((groupLabel) => (
            <div key={groupLabel} className="space-y-3">
              {/* Timeline Group Header */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-4 h-4 text-[#a000c8]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#2b1572]">
                  {groupLabel}
                </span>
                <div className="h-px flex-1 bg-[#2b1572]/10" />
                <span className="text-[11px] font-semibold text-[#2b1572]/50">
                  {groupedActivities[groupLabel].length} thao tác
                </span>
              </div>

              {/* Items in this group - styled with kanban-card */}
              <div className="space-y-2.5">
                {groupedActivities[groupLabel].map((act) => {
                  const badgeInfo = getActionBadge(act.action, act.target_type);
                  const IconComp = badgeInfo.icon;
                  const isRemoval =
                    act.action.toLowerCase().includes('đã xóa') ||
                    act.action.toLowerCase().includes('đã rời khỏi') ||
                    act.action.toLowerCase().includes('xóa thành viên');

                  const isClickable = !isRemoval && Boolean(
                    act.target_meta?.board_id ||
                    act.target_type.startsWith('card:') ||
                    act.target_type.startsWith('board:') ||
                    act.workspace_id
                  );

                  return (
                    <div
                      key={act.id}
                      onClick={() => handleItemClick(act)}
                      className={`kanban-card p-4 flex items-start gap-3.5 group ${
                        isClickable
                          ? 'cursor-pointer hover:border-[#a6d1fd]'
                          : 'cursor-default opacity-85'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl border shadow-2xs flex items-center justify-center shrink-0 transition-transform ${
                        isRemoval
                          ? 'bg-rose-500/10 border-rose-500/20 text-[#c40000]'
                          : 'bg-white/70 border-white/80 group-hover:scale-105 text-[#2b1572]'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-1.5 text-xs text-[#2b1572] leading-relaxed">
                          <span className="font-bold text-[#2b1572]">
                            {act.user?.name || 'Bạn'}
                          </span>
                          <span className="text-[#2b1572]/80">
                            {act.action}
                          </span>
                          {act.target_meta?.card_title && (
                            <span className="badge-info text-[11px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                              {act.target_meta.card_title}
                            </span>
                          )}
                        </div>

                        {/* Location Meta Tags */}
                        <div className="mt-3 pt-2.5 border-t border-[#2b1572]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#2b1572]/60">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`${badgeInfo.badgeClass} text-[10px] px-2 py-0.5 rounded-full font-semibold`}>
                              {badgeInfo.label}
                            </span>

                            {act.workspace?.name && (
                              <span className="flex items-center gap-1 text-[11px] text-[#2b1572]/70 font-medium">
                                <Layers className="w-3 h-3 text-[#a000c8]" />
                                <span>{act.workspace.name}</span>
                              </span>
                            )}

                            {act.target_meta?.board_name && (
                              <span className="flex items-center gap-1 text-[11px] text-[#2b1572]/70 font-medium">
                                <Kanban className="w-3 h-3" />
                                <span>{act.target_meta.board_name}</span>
                              </span>
                            )}

                            {act.target_meta?.list_title && (
                              <span className="flex items-center gap-1 text-[11px] text-[#2b1572]/50">
                                <ChevronRight className="w-3 h-3" />
                                <span>{act.target_meta.list_title}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#2b1572]/50 font-medium">
                              {formatRelativeTime(act.created_at)} ({formatExactTime(act.created_at)})
                            </span>
                            {isClickable && (
                              <span className="font-semibold text-[#2b1572] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Xem <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2 btn-secondary text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#a000c8]" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <>
                    <span>Tải thêm hoạt động</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
