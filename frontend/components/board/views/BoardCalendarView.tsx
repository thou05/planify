'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Layers,
  X,
  ListTodo,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import CustomSelect from '@/components/ui/CustomSelect';

interface BoardCalendarViewProps {
  board: any;
  onOpenCardDetail: (cardId: string) => void;
  onRefreshBoard: () => Promise<void>;
}

export default function BoardCalendarView({
  board,
  onOpenCardDetail,
  onRefreshBoard,
}: BoardCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Quick add card modal for a specific day
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddListId, setQuickAddListId] = useState(board?.lists?.[0]?.id || '');
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  // Flatten all cards from board lists
  const allCards = useMemo(() => {
    if (!board?.lists) return [];
    const cards: any[] = [];
    board.lists.forEach((list: any) => {
      (list.cards || []).forEach((c: any) => {
        cards.push({
          ...c,
          listName: list.title,
          listId: list.id,
        });
      });
    });
    return cards;
  }, [board]);

  // Filtered cards by list
  const filteredCards = useMemo(() => {
    if (selectedListFilter === 'all') return allCards;
    return allCards.filter((c) => c.listId === selectedListFilter);
  }, [allCards, selectedListFilter]);

  // Cards without due dates
  const unscheduledCards = useMemo(() => {
    return filteredCards.filter((c) => !c.due_date);
  }, [filteredCards]);

  // Calendar calculations (Month Matrix)
  const { year, month, daysMatrix, monthName } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    const firstDayOfMonth = new Date(y, m, 1);
    const lastDayOfMonth = new Date(y, m + 1, 0);

    // Vietnam / ISO week: Monday is index 0, Sunday is 6
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateKey: string;
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(y, m - 1, prevMonthLastDay - i);
      const isToday =
        d.toDateString() === new Date().toDateString();
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday,
        dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(y, m, i);
      const isToday =
        d.toDateString() === new Date().toDateString();
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday,
        dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    // Next month padding to fill grid (usually 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(y, m + 1, i);
      const isToday =
        d.toDateString() === new Date().toDateString();
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday,
        dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    const monthFormatted = `Tháng ${m + 1}, ${y}`;
    return { year: y, month: m, daysMatrix: days, monthName: monthFormatted };
  }, [currentDate]);

  // Group cards by date key (YYYY-MM-DD)
  const cardsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredCards.forEach((c) => {
      if (c.due_date) {
        const d = new Date(c.due_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      }
    });
    return map;
  }, [filteredCards]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Quick Add Card for a specific day
  const handleOpenQuickAdd = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickAddDate(date);
    setQuickAddTitle('');
    setQuickAddListId(board?.lists?.[0]?.id || '');
  };

  const handleSubmitQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAddListId || !quickAddDate) return;

    try {
      setIsSubmittingQuickAdd(true);
      // Format due date to end of day in ISO string
      const due = new Date(quickAddDate);
      due.setHours(23, 59, 59, 0);

      await apiClient(`/lists/${quickAddListId}/cards`, {
        method: 'POST',
        data: {
          title: quickAddTitle.trim(),
          due_date: due.toISOString(),
        },
      });

      setQuickAddDate(null);
      setQuickAddTitle('');
      await onRefreshBoard();
    } catch (err) {
      console.error('Lỗi thêm thẻ trên lịch:', err);
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  // Get status color chip according to DESIGN_SYSTEM.md Section 22
  const getCardChipStyle = (card: any) => {
    if (card.is_due_date_completed) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    }

    if (card.due_date) {
      const dueTime = new Date(card.due_date).getTime();
      const diffHours = (dueTime - Date.now()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        return 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 font-medium';
      }
      if (diffHours <= 24) {
        return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
      }
    }

    return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200/70';
  };

  const dayHeaders = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-7xl mx-auto w-full">
      {/* Calendar Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-2.5 rounded-lg bg-white border border-slate-300 shadow-2xs">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-600" />
            <span>{monthName}</span>
          </h2>

          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Hôm nay
          </button>
        </div>

        {/* Filter & Unscheduled Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by List */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-40">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <CustomSelect
              value={selectedListFilter}
              onChange={(val) => setSelectedListFilter(val)}
              options={[
                { value: 'all', label: 'Tất cả danh sách' },
                ...(board?.lists || []).map((list: any) => ({
                  value: list.id,
                  label: list.title,
                })),
              ]}
              size="sm"
            />
          </div>

          {/* Toggle Unscheduled Drawer */}
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showUnscheduled
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Chưa lên lịch ({unscheduledCards.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Grid + Optional Unscheduled Sidebar */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Calendar Grid Container */}
        <div className="flex-1 flex flex-col rounded-lg bg-white border border-slate-300 shadow-2xs overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {dayHeaders.map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                  idx >= 5 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6 gap-[1px] bg-slate-200 overflow-y-auto">
            {daysMatrix.map((item) => {
              const dayCards = cardsByDate.get(item.dateKey) || [];

              return (
                <div
                  key={item.dateKey}
                  className={`group relative p-1.5 sm:p-2 flex flex-col min-h-[90px] transition-colors select-none ${
                    item.isCurrentMonth
                      ? 'bg-white hover:bg-slate-50/60'
                      : 'bg-slate-50/70 text-slate-400'
                  } ${
                    item.isToday ? 'ring-2 ring-slate-900 ring-inset bg-slate-50' : ''
                  }`}
                >
                  {/* Day Cell Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                        item.isToday
                          ? 'bg-slate-900 text-white'
                          : item.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.date.getDate()}
                    </span>

                    {/* Quick Add Button on Day Hover */}
                    {!board?.is_archived && board?.canEdit && item.isCurrentMonth && (
                      <button
                        onClick={(e) => handleOpenQuickAdd(item.date, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-xs hover:bg-slate-100 text-slate-600 transition-opacity cursor-pointer"
                        title="Thêm thẻ vào ngày này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Cards inside Day Cell */}
                  <div className="flex-1 overflow-y-auto space-y-1 max-h-24 sm:max-h-28 pr-0.5">
                    {dayCards.map((card) => {
                      const chipStyle = getCardChipStyle(card);
                      return (
                        <div
                          key={card.id}
                          onClick={() => onOpenCardDetail(card.id)}
                          className={`p-1.5 rounded-xs border text-[11px] leading-tight cursor-pointer transition-colors ${chipStyle}`}
                          title={`${card.title} - ${card.listName}`}
                        >
                          <div className="font-medium truncate">{card.title}</div>
                          <div className="flex items-center justify-between text-[9px] opacity-75 mt-0.5">
                            <span className="truncate">{card.listName}</span>
                            {card.is_due_date_completed && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unscheduled Cards Drawer / Sidebar */}
        {showUnscheduled && (
          <div className="w-72 sm:w-80 rounded-lg bg-white border border-slate-300 shadow-xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-semibold text-slate-900">
                  Chưa lên ngày hết hạn ({unscheduledCards.length})
                </h3>
              </div>
              <button
                onClick={() => setShowUnscheduled(false)}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unscheduledCards.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tất cả các thẻ đều đã được lên lịch ngày hết hạn!
                </div>
              ) : (
                unscheduledCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => onOpenCardDetail(card.id)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="text-xs font-medium text-slate-800 group-hover:text-blue-600">
                      {card.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span className="px-1.5 py-0.2 rounded-xs bg-slate-200 text-slate-700 font-medium">
                        {card.listName}
                      </span>
                      <span className="text-blue-600 font-medium hover:underline">
                        Thiết lập ngày →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Card Modal for Date */}
      {quickAddDate && (
        <div className="fixed inset-0 z-70 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-lg p-5 shadow-xl border border-slate-300 animate-fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Thêm thẻ cho ngày {quickAddDate.toLocaleDateString('vi-VN')}</span>
              </h4>
              <button
                onClick={() => setQuickAddDate(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuickAdd} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tiêu đề thẻ
                </label>
                <input
                  type="text"
                  autoFocus
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thẻ..."
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Thêm vào danh sách
                </label>
                <CustomSelect
                  value={quickAddListId}
                  onChange={(val) => setQuickAddListId(val)}
                  options={(board?.lists || []).map((l: any) => ({
                    value: l.id,
                    label: l.title,
                  }))}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickAddDate(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!quickAddTitle.trim() || isSubmittingQuickAdd}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
                >
                  {isSubmittingQuickAdd ? 'Đang tạo...' : 'Tạo thẻ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
