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
        badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
        label: 'Bình luận',
      };
    }
    if (actLower.includes('đính kèm') || actLower.includes('tệp') || actLower.includes('file')) {
      return {
        icon: Paperclip,
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
        label: 'Tệp đính kèm',
      };
    }
    if (actLower.includes('hoàn thành') || actLower.includes('xong') || actLower.includes('complete')) {
      return {
        icon: CheckSquare,
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        label: 'Hoàn thành',
      };
    }
    if (actLower.includes('hạn chót') || actLower.includes('ngày hết hạn') || actLower.includes('quá hạn') || actLower.includes('due')) {
      return {
        icon: Clock,
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        label: 'Thời hạn',
      };
    }
    if (targetType.startsWith('board:')) {
      return {
        icon: Kanban,
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
        label: 'Bảng Kanban',
      };
    }
    if (targetType.startsWith('workspace:')) {
      return {
        icon: Layers,
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
        label: 'Workspace',
      };
    }
    return {
      icon: Activity,
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-600" />
            <span>Audit Log</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hoạt động của tôi
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Lịch sử toàn bộ thao tác, chỉnh sửa thẻ, bảng và không gian làm việc của bạn theo dòng thời gian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchActivities(true)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            title="Làm mới hoạt động"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng hoạt động</div>
            <div className="text-lg font-bold text-slate-900">{stats.total}</div>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thẻ & Nhiệm vụ</div>
            <div className="text-lg font-bold text-slate-900">{stats.cardsCount}</div>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Kanban className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bảng Kanban</div>
            <div className="text-lg font-bold text-slate-900">{stats.boardsCount}</div>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workspace</div>
            <div className="text-lg font-bold text-slate-900">{stats.wsCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({activities.length})
          </button>
          <button
            onClick={() => setFilter('card')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === 'card'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Thẻ & Công việc
          </button>
          <button
            onClick={() => setFilter('board')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === 'board'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bảng làm việc
          </button>
          <button
            onClick={() => setFilter('workspace')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === 'workspace'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Không gian làm việc
          </button>
          <button
            onClick={() => setFilter('comment')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filter === 'comment'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bình luận
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hành động..."
            className="pl-8 pr-3 py-1 text-xs w-full rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* Main Activities Feed */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 border border-slate-200 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="p-8 text-center rounded-md border border-dashed border-slate-300 bg-white space-y-3">
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery ? 'Không tìm thấy hoạt động phù hợp' : 'Chưa có hoạt động nào'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Không có kết quả nào khớp với "${searchQuery}". Hãy thử từ khóa khác.`
                : 'Mọi thao tác bạn thực hiện trên các thẻ, bảng hoặc không gian làm việc sẽ xuất hiện tại đây.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((groupLabel) => (
            <div key={groupLabel} className="space-y-2.5">
              {/* Timeline Group Header */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {groupLabel}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-medium text-slate-400">
                  {groupedActivities[groupLabel].length} thao tác
                </span>
              </div>

              {/* Items in this group */}
              <div className="space-y-2">
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
                      className={`p-3 bg-white border border-slate-200 rounded-md shadow-2xs flex items-start gap-3 group transition-colors ${
                        isClickable
                          ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/50'
                          : 'cursor-default opacity-85'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${
                        isRemoval
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-1.5 text-xs text-slate-800 leading-relaxed">
                          <span className="font-semibold text-slate-900">
                            {act.user?.name || 'Bạn'}
                          </span>
                          <span className="text-slate-600">
                            {act.action}
                          </span>
                          {act.target_meta?.card_title && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {act.target_meta.card_title}
                            </span>
                          )}
                        </div>

                        {/* Location Meta Tags */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`${badgeInfo.badgeClass} text-[10px] px-1.5 py-0.2 rounded-xs font-semibold`}>
                              {badgeInfo.label}
                            </span>

                            {act.workspace?.name && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                                <Layers className="w-3 h-3 text-slate-400" />
                                <span>{act.workspace.name}</span>
                              </span>
                            )}

                            {act.target_meta?.board_name && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                                <Kanban className="w-3 h-3 text-slate-400" />
                                <span>{act.target_meta.board_name}</span>
                              </span>
                            )}

                            {act.target_meta?.list_title && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                <ChevronRight className="w-3 h-3" />
                                <span>{act.target_meta.list_title}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                              {formatRelativeTime(act.created_at)} ({formatExactTime(act.created_at)})
                            </span>
                            {isClickable && (
                              <span className="font-semibold text-slate-900 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px]">
                                Xem <ArrowRight className="w-3 h-3" />
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
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <>
                    <span>Tải thêm hoạt động</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
