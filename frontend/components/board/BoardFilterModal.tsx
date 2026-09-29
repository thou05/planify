'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  ChevronDown,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export interface BoardFilterState {
  keyword: string;
  members: string[]; // 'no_members' | 'assigned_to_me' | member_id
  cardStatus: ('completed' | 'not_completed')[];
  dueDates: ('no_date' | 'overdue' | 'due_tomorrow' | 'due_next_week' | 'due_next_month')[];
  activities: ('past_week' | 'past_2_weeks' | 'past_4_weeks' | 'no_activity_4_weeks')[];
  matchMode: 'any' | 'all';
}

export const defaultFilterState: BoardFilterState = {
  keyword: '',
  members: [],
  cardStatus: [],
  dueDates: [],
  activities: [],
  matchMode: 'any',
};

export function getActiveFilterCount(filters: BoardFilterState): number {
  let count = 0;
  if (filters.keyword.trim()) count++;
  count += filters.members.length;
  count += filters.cardStatus.length;
  count += filters.dueDates.length;
  count += filters.activities.length;
  return count;
}

interface BoardFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: BoardFilterState;
  onChangeFilters: (filters: BoardFilterState) => void;
  onResetFilters: () => void;
  boardMembers?: Array<{
    id: string;
    role?: string;
    user?: { id: string; name: string; email: string; avatar?: string | null };
  }>;
  currentUser?: { id: string; name?: string; email?: string; avatar?: string | null } | null;
  totalFilteredCards?: number;
  totalAllCards?: number;
  allCards?: any[];
}

export default function BoardFilterModal({
  isOpen,
  onClose,
  filters,
  onChangeFilters,
  onResetFilters,
  boardMembers = [],
  currentUser,
  totalFilteredCards = 0,
  totalAllCards = 0,
  allCards = [],
}: BoardFilterModalProps) {
  const [isMatchDropdownOpen, setIsMatchDropdownOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const matchDropdownRef = useRef<HTMLDivElement>(null);

  // Close match dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        matchDropdownRef.current &&
        !matchDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute card counts for each filter option
  const counts = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59);

    const c = {
      no_members: 0,
      assigned_to_me: 0,
      members: {} as Record<string, number>,
      completed: 0,
      not_completed: 0,
      no_date: 0,
      overdue: 0,
      due_tomorrow: 0,
      due_next_week: 0,
      due_next_month: 0,
      past_week: 0,
      past_2_weeks: 0,
      past_4_weeks: 0,
      no_activity_4_weeks: 0,
    };

    allCards.forEach((card: any) => {
      // 1. Members
      const assignees = card.card_assignees || [];
      if (assignees.length === 0) {
        c.no_members++;
      }
      if (
        currentUser?.id &&
        assignees.some(
          (ca: any) =>
            ca.board_member?.user?.id === currentUser.id ||
            ca.board_member?.user_id === currentUser.id ||
            ca.user_id === currentUser.id
        )
      ) {
        c.assigned_to_me++;
      }
      assignees.forEach((ca: any) => {
        const uId = ca.board_member?.user?.id || ca.board_member?.user_id || ca.user_id;
        if (uId) {
          c.members[uId] = (c.members[uId] || 0) + 1;
        }
      });

      // 2. Status
      const isDone = !!card.is_due_date_completed || card.status === 'DONE' || card.status === 'COMPLETED';
      if (isDone) {
        c.completed++;
      } else {
        c.not_completed++;
      }

      // 3. Dates
      if (!card.due_date) {
        c.no_date++;
      } else {
        const d = new Date(card.due_date);
        if (!isNaN(d.getTime())) {
          if (d.getTime() < nowTime && !isDone) {
            c.overdue++;
          }
          if (d >= tomorrowStart && d <= tomorrowEnd) {
            c.due_tomorrow++;
          }
          if (d >= weekStart && d <= weekEnd) {
            c.due_next_week++;
          }
          if (d >= monthStart && d <= monthEnd) {
            c.due_next_month++;
          }
        }
      }

      // 4. Activity
      const cardTime = card.updated_at
        ? new Date(card.updated_at).getTime()
        : card.created_at
        ? new Date(card.created_at).getTime()
        : nowTime;
      const diffDays = (nowTime - cardTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) c.past_week++;
      if (diffDays <= 14) c.past_2_weeks++;
      if (diffDays <= 28) c.past_4_weeks++;
      if (diffDays > 28) c.no_activity_4_weeks++;
    });

    return c;
  }, [allCards, currentUser?.id]);

  if (!isOpen) return null;

  const activeCount = getActiveFilterCount(filters);

  // Toggle helper for array filters
  const toggleArrayItem = <T extends string>(
    key: keyof Pick<
      BoardFilterState,
      'members' | 'cardStatus' | 'dueDates' | 'activities'
    >,
    value: T
  ) => {
    const list = (filters[key] as T[]) || [];
    const exists = list.includes(value);
    const updated = exists ? list.filter((item) => item !== value) : [...list, value];
    onChangeFilters({
      ...filters,
      [key]: updated,
    });
  };

  const currentInitial = (currentUser?.name || currentUser?.email || 'N')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-end sm:p-4">
      {/* Trong suốt - KHÔNG làm mờ và KHÔNG làm tối toàn màn hình */}
      <div
        className="fixed inset-0 pointer-events-auto bg-transparent"
        onClick={onClose}
        aria-label="Đóng bảng lọc"
      />

      {/* Floating Filter Popover Panel - Nổi trên góc phải, nhìn rõ 100% các cột phía sau */}
      <div
        ref={modalRef}
        className="pointer-events-auto relative w-full sm:w-[380px] bg-white rounded-none sm:rounded-2xl shadow-[0_16px_45px_rgba(0,0,0,0.18)] border border-slate-200/90 flex flex-col max-h-screen sm:max-h-[86vh] overflow-hidden mt-0 sm:mt-12 mr-0 sm:mr-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-[#2b1572]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Lọc thẻ</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeCount > 0 ? (
                  <span className="text-[#2b1572] font-semibold">
                    Khớp <b>{totalFilteredCards}</b> / {totalAllCards} thẻ
                  </span>
                ) : (
                  <span>Tất cả {totalAllCards} thẻ</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                title="Xóa tất cả bộ lọc"
              >
                Xóa lọc ({activeCount})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Đóng bảng lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Filter Result Banner */}
        {activeCount > 0 && (
          <div className="px-4 py-2 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-b border-indigo-100/60 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 text-indigo-950 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Đang áp dụng <b>{activeCount}</b> điều kiện</span>
            </div>
            <span className="font-bold text-[#2b1572] bg-white px-2 py-0.5 rounded-md border border-indigo-100/80 shadow-2xs text-[11px]">
              {totalFilteredCards} thẻ hiển thị
            </span>
          </div>
        )}

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-700 select-none">
          {/* Section 1: Từ khóa */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Từ khóa
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    keyword: e.target.value,
                  })
                }
                placeholder="Nhập từ khóa tìm kiếm..."
                className="w-full px-3 py-2 pr-8 text-xs border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
              {filters.keyword && (
                <button
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, keyword: '' })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Tìm theo tiêu đề, mô tả hoặc thành viên.
            </p>
          </div>

          {/* Section 2: Thành viên */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Thành viên</span>
              {filters.members.length > 0 && (
                <span className="text-[10px] text-indigo-600 font-semibold">
                  Đã chọn {filters.members.length}
                </span>
              )}
            </h4>
            <div className="space-y-1.5">
              {/* Không có thành viên */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.members.includes('no_members')}
                  onChange={() => toggleArrayItem('members', 'no_members')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có thành viên
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">
                  {counts.no_members}
                </span>
              </label>

              {/* Các thẻ đã chỉ định cho tôi */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.members.includes('assigned_to_me')}
                  onChange={() => toggleArrayItem('members', 'assigned_to_me')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                {currentUser?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || 'Tôi'}
                    className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#2b1572] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentInitial}
                  </div>
                )}
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Các thẻ đã chỉ định cho tôi
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">
                  {counts.assigned_to_me}
                </span>
              </label>

              {/* Specific members in board */}
              {boardMembers.length > 0 &&
                boardMembers
                  .filter((m) => m.user?.id && m.user.id !== currentUser?.id)
                  .map((m) => {
                    const u = m.user;
                    if (!u) return null;
                    const initial = (u.name || u.email || '?').charAt(0).toUpperCase();
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.members.includes(u.id)}
                          onChange={() => toggleArrayItem('members', u.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-[#2b1572] flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initial}
                          </div>
                        )}
                        <span className="font-medium text-slate-700 group-hover:text-slate-900 truncate max-w-[190px]">
                          {u.name || u.email}
                        </span>
                        <span className="ml-auto text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">
                          {counts.members[u.id] || 0}
                        </span>
                      </label>
                    );
                  })}
            </div>
          </div>

          {/* Section 3: Trạng thái thẻ (Card status) */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Trạng thái hoàn thành</span>
              {filters.cardStatus.length > 0 && (
                <span className="text-[10px] text-indigo-600 font-semibold">
                  Đã chọn {filters.cardStatus.length}
                </span>
              )}
            </h4>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.cardStatus.includes('completed')}
                  onChange={() => toggleArrayItem('cardStatus', 'completed')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đã hoàn thành
                </span>
                <span className="ml-auto text-[11px] font-semibold text-emerald-700 px-1.5 py-0.5 rounded-full bg-emerald-50">
                  {counts.completed}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.cardStatus.includes('not_completed')}
                  onChange={() => toggleArrayItem('cardStatus', 'not_completed')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Chưa hoàn thành
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-500 px-1.5 py-0.5 rounded-full bg-slate-100">
                  {counts.not_completed}
                </span>
              </label>
            </div>
          </div>

          {/* Section 4: Ngày hết hạn */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Ngày hết hạn</span>
              {filters.dueDates.length > 0 && (
                <span className="text-[10px] text-indigo-600 font-semibold">
                  Đã chọn {filters.dueDates.length}
                </span>
              )}
            </h4>
            <div className="space-y-1.5">
              {/* Không có ngày */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('no_date')}
                  onChange={() => toggleArrayItem('dueDates', 'no_date')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có ngày
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">
                  {counts.no_date}
                </span>
              </label>

              {/* Quá hạn */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('overdue')}
                  onChange={() => toggleArrayItem('dueDates', 'overdue')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Quá hạn
                </span>
                <span className="ml-auto text-[11px] font-semibold text-rose-700 px-1.5 py-0.5 rounded-full bg-rose-50">
                  {counts.overdue}
                </span>
              </label>

              {/* Đến hạn vào ngày mai */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('due_tomorrow')}
                  onChange={() => toggleArrayItem('dueDates', 'due_tomorrow')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đến hạn vào ngày mai
                </span>
                <span className="ml-auto text-[11px] font-semibold text-amber-700 px-1.5 py-0.5 rounded-full bg-amber-50">
                  {counts.due_tomorrow}
                </span>
              </label>

              {/* Đến hạn trong 7 ngày tới */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('due_next_week')}
                  onChange={() => toggleArrayItem('dueDates', 'due_next_week')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đến hạn trong 7 ngày tới
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">
                  {counts.due_next_week}
                </span>
              </label>

              {/* Đến hạn trong tháng tới */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('due_next_month')}
                  onChange={() => toggleArrayItem('dueDates', 'due_next_month')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đến hạn trong tháng tới
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">
                  {counts.due_next_month}
                </span>
              </label>
            </div>
          </div>

          {/* Section 5: Hoạt động (Activity) */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Hoạt động</span>
              {filters.activities.length > 0 && (
                <span className="text-[10px] text-indigo-600 font-semibold">
                  Đã chọn {filters.activities.length}
                </span>
              )}
            </h4>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('past_week')}
                  onChange={() => toggleArrayItem('activities', 'past_week')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Hoạt động trong tuần qua
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('past_2_weeks')}
                  onChange={() => toggleArrayItem('activities', 'past_2_weeks')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Hoạt động trong hai tuần qua
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('past_4_weeks')}
                  onChange={() => toggleArrayItem('activities', 'past_4_weeks')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Hoạt động trong bốn tuần qua
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('no_activity_4_weeks')}
                  onChange={() => toggleArrayItem('activities', 'no_activity_4_weeks')}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có hoạt động trong 4 tuần qua
                </span>
              </label>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 6: Matching rule Dropdown */}
          <div className="relative pt-1" ref={matchDropdownRef}>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Quy tắc so khớp
            </label>
            <button
              type="button"
              onClick={() => setIsMatchDropdownOpen((prev) => !prev)}
              className="w-full px-3 py-2 text-xs font-semibold border-2 border-[#2b1572] rounded-lg flex items-center justify-between text-slate-800 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <span>{filters.matchMode === 'any' ? 'Khớp bất kỳ (OR)' : 'Khớp hoàn toàn (AND)'}</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {/* Dropdown popup */}
            {isMatchDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20 animate-scale-up py-1">
                {/* Option 1: Khớp bất kỳ */}
                <div
                  onClick={() => {
                    onChangeFilters({ ...filters, matchMode: 'any' });
                    setIsMatchDropdownOpen(false);
                  }}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    filters.matchMode === 'any'
                      ? 'bg-purple-50 text-[#2b1572]'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <p className="font-bold text-xs">Khớp bất kỳ (Match Any)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Thỏa mãn bất kỳ thành viên hoặc điều kiện nào được chọn
                  </p>
                </div>

                {/* Option 2: Khớp hoàn toàn */}
                <div
                  onClick={() => {
                    onChangeFilters({ ...filters, matchMode: 'all' });
                    setIsMatchDropdownOpen(false);
                  }}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    filters.matchMode === 'all'
                      ? 'bg-purple-50 text-[#2b1572]'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <p className="font-bold text-xs">Khớp hoàn toàn (Match All)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bắt buộc phải thỏa mãn tất cả thành viên và điều kiện được chọn
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
