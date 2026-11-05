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
  Tag,
} from 'lucide-react';

export interface BoardFilterState {
  keyword: string;
  members: string[]; // 'no_members' | 'assigned_to_me' | member_id
  labels: string[]; // 'no_labels' | label_id
  cardStatus: ('completed' | 'not_completed')[];
  dueDates: ('no_date' | 'overdue' | 'due_tomorrow' | 'due_next_week' | 'due_next_month')[];
  activities: ('past_week' | 'past_2_weeks' | 'past_4_weeks' | 'no_activity_4_weeks')[];
  matchMode: 'any' | 'all';
}

export const defaultFilterState: BoardFilterState = {
  keyword: '',
  members: [],
  labels: [],
  cardStatus: [],
  dueDates: [],
  activities: [],
  matchMode: 'any',
};

export function getActiveFilterCount(filters: BoardFilterState): number {
  let count = 0;
  if (filters.keyword.trim()) count++;
  count += filters.members?.length || 0;
  count += filters.labels?.length || 0;
  count += filters.cardStatus?.length || 0;
  count += filters.dueDates?.length || 0;
  count += filters.activities?.length || 0;
  return count;
}

export const getAssigneeUserId = (ca: any): string | undefined => {
  return ca?.user_id || ca?.user?.id || ca?.board_member?.user_id || ca?.board_member?.user?.id;
};

/**
 * Universal Bidirectional Member Matching Helper
 * Kiểm tra xem một card assignee (ca) có khớp với targetId hay không.
 * targetId có thể là:
 * - 'assigned_to_me'
 * - User ID
 * - Board Member ID
 */
export function checkAssigneeMatchesTarget(
  ca: any,
  targetId: string,
  currentUserId?: string,
  currentMemberId?: string,
  memberIdToUserIdMap?: Map<string, string>,
  userIdToMemberIdMap?: Map<string, string>,
  targetEmail?: string
): boolean {
  if (!ca || !targetId) return false;

  // 1. Target là 'assigned_to_me'
  if (targetId === 'assigned_to_me') {
    if (currentUserId) {
      if (
        ca.user_id === currentUserId ||
        ca.user?.id === currentUserId ||
        ca.board_member?.user_id === currentUserId ||
        ca.board_member?.user?.id === currentUserId
      ) {
        return true;
      }
      if (memberIdToUserIdMap) {
        const memId = ca.board_member_id || ca.member_id || ca.id;
        if (memId && memberIdToUserIdMap.get(memId) === currentUserId) return true;
      }
    }

    if (currentMemberId) {
      if (
        ca.board_member_id === currentMemberId ||
        ca.member_id === currentMemberId ||
        ca.board_member?.id === currentMemberId
      ) {
        return true;
      }
      if (userIdToMemberIdMap) {
        const uId = ca.user_id || ca.user?.id;
        if (uId && userIdToMemberIdMap.get(uId) === currentMemberId) return true;
      }
    }

    if (targetEmail) {
      const email = ca.user?.email || ca.board_member?.user?.email;
      if (email && email.toLowerCase() === targetEmail.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  // 2. So khớp trực tiếp targetId
  if (
    ca.user_id === targetId ||
    ca.user?.id === targetId ||
    ca.board_member_id === targetId ||
    ca.member_id === targetId ||
    ca.board_member?.id === targetId ||
    ca.board_member?.user_id === targetId ||
    ca.board_member?.user?.id === targetId
  ) {
    return true;
  }

  // 3. Tra cứu ánh xạ qua memberIdToUserIdMap
  if (memberIdToUserIdMap) {
    const memId = ca.board_member_id || ca.member_id || ca.id;
    if (memId && memberIdToUserIdMap.get(memId) === targetId) {
      return true;
    }
    // Nếu targetId là memberId -> ánh xạ ra userId và so sánh
    const mappedUserId = memberIdToUserIdMap.get(targetId);
    if (
      mappedUserId &&
      (ca.user_id === mappedUserId ||
        ca.user?.id === mappedUserId ||
        ca.board_member?.user_id === mappedUserId ||
        ca.board_member?.user?.id === mappedUserId)
    ) {
      return true;
    }
  }

  // 4. Tra cứu ánh xạ qua userIdToMemberIdMap
  if (userIdToMemberIdMap) {
    const uId = ca.user_id || ca.user?.id;
    if (uId && userIdToMemberIdMap.get(uId) === targetId) {
      return true;
    }
    // Nếu targetId là userId -> ánh xạ ra memberId và so sánh
    const mappedMemberId = userIdToMemberIdMap.get(targetId);
    if (
      mappedMemberId &&
      (ca.board_member_id === mappedMemberId ||
        ca.member_id === mappedMemberId ||
        ca.board_member?.id === mappedMemberId)
    ) {
      return true;
    }
  }

  // 5. So sánh fallback qua email nếu có
  if (targetEmail) {
    const caEmail = ca.user?.email || ca.board_member?.user?.email;
    if (caEmail && caEmail.toLowerCase() === targetEmail.toLowerCase()) {
      return true;
    }
  }

  return false;
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
    user_id?: string;
    user?: { id: string; name: string; email: string; avatar?: string | null };
  }>;
  boardLabels?: Array<{
    id: string;
    name: string;
    color: string;
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
  boardLabels = [],
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

  // Maps tra cứu 2 chiều giữa board_member.id và user_id
  const { memberIdToUserIdMap, userIdToMemberIdMap, memberEmailMap, currentMemberId } = useMemo(() => {
    const mToU = new Map<string, string>();
    const uToM = new Map<string, string>();
    const emails = new Map<string, string>();
    let currMemId: string | undefined = undefined;

    (boardMembers || []).forEach((m) => {
      const uId = m.user_id || m.user?.id;
      const email = m.user?.email;
      if (m.id && uId) {
        mToU.set(m.id, uId);
        uToM.set(uId, m.id);
      }
      if (email) {
        if (uId) emails.set(uId, email);
        if (m.id) emails.set(m.id, email);
      }
      if (currentUser?.id && uId === currentUser.id) {
        currMemId = m.id;
      }
      if (currentUser?.email && email && email.toLowerCase() === currentUser.email.toLowerCase()) {
        currMemId = m.id;
      }
    });

    return {
      memberIdToUserIdMap: mToU,
      userIdToMemberIdMap: uToM,
      memberEmailMap: emails,
      currentMemberId: currMemId,
    };
  }, [boardMembers, currentUser?.id, currentUser?.email]);

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
      no_labels: 0,
      labels: {} as Record<string, number>,
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
        checkAssigneeMatchesTarget(
          card.card_assignees ? { card_assignees: assignees } : null,
          'assigned_to_me',
          currentUser?.id,
          currentMemberId,
          memberIdToUserIdMap,
          userIdToMemberIdMap,
          currentUser?.email
        ) ||
        assignees.some((ca: any) =>
          checkAssigneeMatchesTarget(
            ca,
            'assigned_to_me',
            currentUser?.id,
            currentMemberId,
            memberIdToUserIdMap,
            userIdToMemberIdMap,
            currentUser?.email
          )
        )
      ) {
        c.assigned_to_me++;
      }

      boardMembers.forEach((m) => {
        const uId = m.user_id || m.user?.id;
        const memId = m.id;
        const targetEmail = m.user?.email || (uId ? memberEmailMap.get(uId) : undefined);

        const matchesMember = assignees.some((ca: any) => {
          if (uId && checkAssigneeMatchesTarget(ca, uId, currentUser?.id, currentMemberId, memberIdToUserIdMap, userIdToMemberIdMap, targetEmail)) {
            return true;
          }
          if (memId && checkAssigneeMatchesTarget(ca, memId, currentUser?.id, currentMemberId, memberIdToUserIdMap, userIdToMemberIdMap, targetEmail)) {
            return true;
          }
          return false;
        });

        if (matchesMember) {
          if (uId) {
            c.members[uId] = (c.members[uId] || 0) + 1;
          }
          if (memId && memId !== uId) {
            c.members[memId] = (c.members[memId] || 0) + 1;
          }
        }
      });

      // 2. Labels
      const cardLabels = card.card_labels || [];
      if (cardLabels.length === 0) {
        c.no_labels++;
      }
      cardLabels.forEach((cl: any) => {
        const lId = cl.label_id || cl.label?.id || cl.id;
        if (lId) {
          c.labels[lId] = (c.labels[lId] || 0) + 1;
        }
      });

      // 3. Status
      const isDone = Boolean(card.is_due_date_completed || card.status === 'DONE' || card.status === 'COMPLETED');
      if (isDone) {
        c.completed++;
      } else {
        c.not_completed++;
      }

      // 4. Dates
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

      // 5. Activity
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
  }, [
    allCards,
    currentUser?.id,
    currentUser?.email,
    currentMemberId,
    memberIdToUserIdMap,
    userIdToMemberIdMap,
    memberEmailMap,
    boardMembers,
  ]);

  if (!isOpen) return null;

  const activeCount = getActiveFilterCount(filters);

  // Toggle helper for array filters
  const toggleArrayItem = <T extends string>(
    key: keyof Pick<
      BoardFilterState,
      'members' | 'labels' | 'cardStatus' | 'dueDates' | 'activities'
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

  const handleToggleMember = (uid: string, mId?: string) => {
    const list = filters.members || [];
    const targetKey = uid || mId;
    if (!targetKey) return;
    const exists = list.includes(uid) || (!!mId && list.includes(mId));
    let updated: string[];
    if (exists) {
      updated = list.filter((id) => id !== uid && id !== mId);
    } else {
      updated = [...list, uid];
    }
    onChangeFilters({
      ...filters,
      members: updated,
    });
  };

  const currentInitial = (currentUser?.name || currentUser?.email || 'N')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-35 pointer-events-none flex items-start justify-end sm:p-4">
      {/* Trong suốt - KHÔNG làm mờ và KHÔNG làm tối toàn màn hình */}
      <div
        className="fixed inset-0 pointer-events-auto bg-transparent"
        onClick={onClose}
        aria-label="Đóng bảng lọc"
      />

      {/* Floating Filter Popover Panel */}
      <div
        ref={modalRef}
        className="pointer-events-auto relative w-full sm:w-[380px] bg-white rounded-lg shadow-xl border border-slate-300 flex flex-col max-h-screen sm:max-h-[86vh] overflow-hidden mt-0 sm:mt-12 mr-0 sm:mr-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#f28d8d] text-white shadow-2xs">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Lọc thẻ</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeCount > 0 ? (
                  <span className="text-slate-900 font-semibold">
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
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                title="Xóa tất cả bộ lọc"
              >
                Xóa lọc ({activeCount})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Đóng bảng lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Filter Result Banner */}
        {activeCount > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Đang áp dụng <b>{activeCount}</b> điều kiện</span>
            </div>
            <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded-xs border border-slate-200 text-[11px]">
              {totalFilteredCards} thẻ hiển thị
            </span>
          </div>
        )}

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700 select-none">
          {/* Section 1: Từ khóa */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
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
                className="w-full px-3 py-1.5 pr-8 text-xs border border-slate-300 rounded-md placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-colors font-medium"
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
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Tìm theo tiêu đề, mô tả hoặc thành viên.
            </p>
          </div>

          {/* Section 2: Thành viên */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
              <span>Thành viên</span>
              {filters.members.length > 0 && (
                <span className="text-[10px] text-slate-600 font-semibold px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  Đã chọn {filters.members.length}
                </span>
              )}
            </h4>
            <div className="space-y-1">
              {/* Không có thành viên */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.members.includes('no_members')}
                  onChange={() => toggleArrayItem('members', 'no_members')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có thành viên
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.no_members}
                </span>
              </label>

              {/* Các thẻ đã chỉ định cho tôi */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.members.includes('assigned_to_me')}
                  onChange={() => toggleArrayItem('members', 'assigned_to_me')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                {currentUser?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || 'Tôi'}
                    className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    {currentInitial}
                  </div>
                )}
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Các thẻ đã chỉ định cho tôi
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.assigned_to_me}
                </span>
              </label>

              {/* Specific members in board */}
              {boardMembers.length > 0 &&
                boardMembers
                  .filter((m) => !!(m.user?.id || m.user_id || m.id))
                  .map((m) => {
                    const u = m.user;
                    const uid = (m.user?.id || m.user_id || m.id)!;
                    const initial = (u?.name || u?.email || '?').charAt(0).toUpperCase();
                    const isCurrentUser =
                      (!!currentUser?.id && (m.user_id === currentUser.id || m.user?.id === currentUser.id)) ||
                      (!!currentUser?.email && !!u?.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
                    const isSelected = filters.members.includes(uid) || (!!m.id && filters.members.includes(m.id));
                    const memberBadgeCount =
                      counts.members[uid] ?? (m.id ? counts.members[m.id] : 0) ?? 0;

                    return (
                      <label
                        key={m.id || uid}
                        className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleMember(uid, m.id)}
                          className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                        />
                        {u?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar}
                            alt={u?.name || ''}
                            className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {initial}
                          </div>
                        )}
                        <span className="font-medium text-slate-700 group-hover:text-slate-900 truncate max-w-[190px] flex items-center gap-1">
                          <span className="truncate">{u?.name || u?.email || 'Thành viên'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-normal text-slate-500 shrink-0">
                              (Bạn)
                            </span>
                          )}
                        </span>
                        <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                          {memberBadgeCount}
                        </span>
                      </label>
                    );
                  })}
            </div>
          </div>

          {/* Section 3: Nhãn dán (Labels) */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-600" />
                <span>Nhãn dán</span>
              </span>
              {(filters.labels?.length || 0) > 0 && (
                <span className="text-[10px] text-slate-600 font-semibold px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  Đã chọn {filters.labels.length}
                </span>
              )}
            </h4>
            <div className="space-y-1">
              {/* Không có nhãn */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={(filters.labels || []).includes('no_labels')}
                  onChange={() => toggleArrayItem('labels', 'no_labels')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có nhãn dán
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.no_labels}
                </span>
              </label>

              {/* Danh sách các nhãn trên bảng */}
              {boardLabels.map((label) => {
                const isSelected = (filters.labels || []).includes(label.id);
                return (
                  <label
                    key={label.id}
                    className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleArrayItem('labels', label.id)}
                      className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                    />
                    <div
                      className="flex-1 min-w-0 px-2 py-1 rounded-xs text-[11px] font-semibold text-white truncate flex items-center justify-between"
                      style={{ backgroundColor: label.color || '#3b82f6' }}
                    >
                      <span className="truncate">{label.name || 'Nhãn không tên'}</span>
                    </div>
                    <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200 shrink-0">
                      {counts.labels[label.id] || 0}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 4: Trạng thái thẻ (Card status) */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
              <span>Trạng thái hoàn thành</span>
              {filters.cardStatus.length > 0 && (
                <span className="text-[10px] text-slate-600 font-semibold px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  Đã chọn {filters.cardStatus.length}
                </span>
              )}
            </h4>
            <div className="space-y-1">
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.cardStatus.includes('completed')}
                  onChange={() => toggleArrayItem('cardStatus', 'completed')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đã hoàn thành
                </span>
                <span className="ml-auto text-[10px] font-semibold text-emerald-700 px-1.5 py-0.2 rounded-xs bg-emerald-50 border border-emerald-200">
                  {counts.completed}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.cardStatus.includes('not_completed')}
                  onChange={() => toggleArrayItem('cardStatus', 'not_completed')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Chưa hoàn thành
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.not_completed}
                </span>
              </label>
            </div>
          </div>

          {/* Section 5: Ngày hết hạn */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
              <span>Ngày hết hạn</span>
              {filters.dueDates.length > 0 && (
                <span className="text-[10px] text-slate-600 font-semibold px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  Đã chọn {filters.dueDates.length}
                </span>
              )}
            </h4>
            <div className="space-y-1">
              {/* Không có ngày */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('no_date')}
                  onChange={() => toggleArrayItem('dueDates', 'no_date')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <Calendar className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có ngày
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.no_date}
                </span>
              </label>

              {/* Quá hạn */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('overdue')}
                  onChange={() => toggleArrayItem('dueDates', 'overdue')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Quá hạn
                </span>
                <span className="ml-auto text-[10px] font-semibold text-rose-700 px-1.5 py-0.2 rounded-xs bg-rose-50 border border-rose-200">
                  {counts.overdue}
                </span>
              </label>

              {/* Đến hạn vào ngày mai */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('due_tomorrow')}
                  onChange={() => toggleArrayItem('dueDates', 'due_tomorrow')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đến hạn vào ngày mai
                </span>
                <span className="ml-auto text-[10px] font-semibold text-amber-700 px-1.5 py-0.2 rounded-xs bg-amber-50 border border-amber-200">
                  {counts.due_tomorrow}
                </span>
              </label>

              {/* Đến hạn trong 7 ngày tới */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('due_next_week')}
                  onChange={() => toggleArrayItem('dueDates', 'due_next_week')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đến hạn trong 7 ngày tới
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.due_next_week}
                </span>
              </label>

              {/* Đến hạn trong tháng tới */}
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.dueDates.includes('due_next_month')}
                  onChange={() => toggleArrayItem('dueDates', 'due_next_month')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Đến hạn trong tháng tới
                </span>
                <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  {counts.due_next_month}
                </span>
              </label>
            </div>
          </div>

          {/* Section 6: Hoạt động (Activity) */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
              <span>Hoạt động</span>
              {filters.activities.length > 0 && (
                <span className="text-[10px] text-slate-600 font-semibold px-1.5 py-0.2 rounded-xs bg-slate-100 border border-slate-200">
                  Đã chọn {filters.activities.length}
                </span>
              )}
            </h4>
            <div className="space-y-1">
              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('past_week')}
                  onChange={() => toggleArrayItem('activities', 'past_week')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Hoạt động trong tuần qua
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('past_2_weeks')}
                  onChange={() => toggleArrayItem('activities', 'past_2_weeks')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Hoạt động trong hai tuần qua
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('past_4_weeks')}
                  onChange={() => toggleArrayItem('activities', 'past_4_weeks')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Hoạt động trong bốn tuần qua
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-md -mx-1 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.activities.includes('no_activity_4_weeks')}
                  onChange={() => toggleArrayItem('activities', 'no_activity_4_weeks')}
                  className="w-3.5 h-3.5 rounded-xs border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] cursor-pointer"
                />
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Không có hoạt động trong 4 tuần qua
                </span>
              </label>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 7: Matching rule Dropdown */}
          <div className="relative pt-1" ref={matchDropdownRef}>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Quy tắc so khớp
            </label>
            <button
              type="button"
              onClick={() => setIsMatchDropdownOpen((prev) => !prev)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-md flex items-center justify-between text-slate-800 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>{filters.matchMode === 'any' ? 'Khớp bất kỳ (OR)' : 'Khớp hoàn toàn (AND)'}</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {/* Dropdown popup */}
            {isMatchDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden z-20 py-1">
                {/* Option 1: Khớp bất kỳ */}
                <div
                  onClick={() => {
                    onChangeFilters({ ...filters, matchMode: 'any' });
                    setIsMatchDropdownOpen(false);
                  }}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    filters.matchMode === 'any'
                      ? 'bg-[#f28d8d] text-white'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <p className="font-semibold text-xs">Khớp bất kỳ (Match Any)</p>
                  <p className={`text-[11px] mt-0.5 ${filters.matchMode === 'any' ? 'text-white/80' : 'text-slate-500'}`}>
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
                      ? 'bg-[#f28d8d] text-white'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <p className="font-semibold text-xs">Khớp hoàn toàn (Match All)</p>
                  <p className={`text-[11px] mt-0.5 ${filters.matchMode === 'all' ? 'text-white/80' : 'text-slate-500'}`}>
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
