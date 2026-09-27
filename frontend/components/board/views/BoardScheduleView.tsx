'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GanttChart,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  ListTodo,
  X,
  ChevronDown,
} from 'lucide-react';

interface BoardScheduleViewProps {
  board: any;
  onOpenCardDetail: (cardId: string) => void;
  onRefreshBoard: () => Promise<void>;
}

export default function BoardScheduleView({
  board,
  onOpenCardDetail,
}: BoardScheduleViewProps) {
  // Timeline scale: 'day' | 'week'
  const [scale, setScale] = useState<'day' | 'week'>('day');
  // Base start date of the timeline viewport
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3); // start 3 days before today for good context
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize vertical scrolling between left titles pane and right timeline chart pane
  const handleTimelineScroll = () => {
    if (timelineContainerRef.current && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = timelineContainerRef.current.scrollTop;
    }
  };

  const handleLeftPaneScroll = () => {
    if (timelineContainerRef.current && leftPaneRef.current) {
      timelineContainerRef.current.scrollTop = leftPaneRef.current.scrollTop;
    }
  };

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

  // Cards with dates vs without dates
  const scheduledCards = useMemo(() => {
    return filteredCards.filter((c) => c.start_date || c.due_date);
  }, [filteredCards]);

  const unscheduledCards = useMemo(() => {
    return filteredCards.filter((c) => !c.start_date && !c.due_date);
  }, [filteredCards]);

  // Group scheduled cards by list
  const listsWithCards = useMemo(() => {
    if (!board?.lists) return [];
    return board.lists
      .filter((l: any) => selectedListFilter === 'all' || l.id === selectedListFilter)
      .map((l: any) => {
        const cardsInList = scheduledCards.filter((c) => c.listId === l.id);
        return {
          ...l,
          scheduledCards: cardsInList,
        };
      });
  }, [board, selectedListFilter, scheduledCards]);

  // Total visible days in the timeline
  const daysCount = scale === 'day' ? 24 : 42;
  const colWidth = scale === 'day' ? 44 : 32;

  // Generate array of date objects
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [baseDate, daysCount]);

  // Date range formatted label
  const dateRangeLabel = useMemo(() => {
    if (timelineDates.length === 0) return '';
    const start = timelineDates[0];
    const end = timelineDates[timelineDates.length - 1];
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  }, [timelineDates]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - (scale === 'day' ? 7 : 14));
    setBaseDate(d);
  };

  const handleNext = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + (scale === 'day' ? 7 : 14));
    setBaseDate(d);
  };

  const handleToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(0, 0, 0, 0);
    setBaseDate(d);
  };

  // Helper to calculate card bar offset and width in days
  const getCardBarPosition = (card: any) => {
    const startTimestamp = baseDate.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    let cardStart = card.start_date
      ? new Date(card.start_date).getTime()
      : card.due_date
      ? new Date(card.due_date).getTime() - dayMs
      : startTimestamp;

    let cardEnd = card.due_date
      ? new Date(card.due_date).getTime()
      : card.start_date
      ? new Date(card.start_date).getTime() + dayMs
      : startTimestamp + dayMs;

    if (cardEnd <= cardStart) {
      cardEnd = cardStart + dayMs;
    }

    const startDiffDays = (cardStart - startTimestamp) / dayMs;
    const durationDays = Math.max(1, (cardEnd - cardStart) / dayMs);

    const left = startDiffDays * colWidth;
    const width = Math.max(colWidth * 0.9, durationDays * colWidth);

    return { left, width };
  };

  // Card bar color styling according to DESIGN_SYSTEM.md Section 22
  const getCardBarStyle = (card: any) => {
    if (card.is_due_date_completed) {
      return 'bg-emerald-500/90 hover:bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20';
    }

    if (card.due_date) {
      const dueTime = new Date(card.due_date).getTime();
      const diffHours = (dueTime - Date.now()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        return 'bg-rose-500/90 hover:bg-rose-600 text-white border-rose-400 shadow-rose-500/20';
      }
      if (diffHours <= 24) {
        return 'bg-amber-500/90 hover:bg-amber-600 text-white border-amber-400 shadow-amber-500/20';
      }
    }

    return 'bg-[#2b1572] hover:bg-[#1e0f52] text-[#a6d1fd] border-white/30 shadow-indigo-900/20';
  };

  // Day of week abbreviations in Vietnamese
  const getDayOfWeekName = (date: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-7xl mx-auto w-full">
      {/* Schedule Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-2xl glass-surface border border-white/60 shadow-xs">
        {/* Navigation & Date Range */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl glass-weak hover:bg-white/80 text-[#2b1572] transition-colors cursor-pointer border border-white/60"
              title="Khoảng thời gian trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl glass-weak hover:bg-white/80 text-[#2b1572] transition-colors cursor-pointer border border-white/60"
              title="Khoảng thời gian sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xs sm:text-sm font-bold text-[#2b1572] flex items-center gap-2">
            <GanttChart className="w-4 h-4 text-[#2b1572]" />
            <span>{dateRangeLabel}</span>
          </h2>

          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-xl glass-weak hover:bg-white text-[#2b1572] transition-colors border border-white/60 cursor-pointer shadow-2xs"
          >
            Hôm nay
          </button>
        </div>

        {/* Scale Switcher & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scale Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl glass-weak border border-white/60 text-xs">
            <button
              onClick={() => setScale('day')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                scale === 'day'
                  ? 'bg-[#2b1572] text-[#a6d1fd] shadow-xs'
                  : 'text-[#2b1572]/70 hover:text-[#2b1572]'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setScale('week')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                scale === 'week'
                  ? 'bg-[#2b1572] text-[#a6d1fd] shadow-xs'
                  : 'text-[#2b1572]/70 hover:text-[#2b1572]'
              }`}
            >
              Tuần
            </button>
          </div>

          {/* Filter by List */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2b1572]">
            <Filter className="w-3.5 h-3.5 text-[#2b1572]/60" />
            <select
              value={selectedListFilter}
              onChange={(e) => setSelectedListFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl glass-weak border border-white/60 text-xs font-semibold text-[#2b1572] cursor-pointer focus:outline-none"
            >
              <option value="all">Tất cả danh sách</option>
              {board?.lists?.map((list: any) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Unscheduled Drawer */}
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs ${
              showUnscheduled
                ? 'bg-[#2b1572] text-[#a6d1fd] border-[#2b1572]'
                : 'glass-weak text-[#2b1572] hover:bg-white/80 border-white/60'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Chưa lên lịch ({unscheduledCards.length})</span>
          </button>
        </div>
      </div>

      {/* Main Timeline Gantt Container */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 flex rounded-2xl glass-surface border border-white/60 shadow-md overflow-hidden">
          {/* Left Column: Fixed List & Card Titles */}
          <div className="w-56 sm:w-64 border-r border-white/80 bg-white/60 backdrop-blur-md flex flex-col shrink-0 z-20">
            {/* Header placeholder matching timeline header height */}
            <div className="h-14 border-b border-white/80 px-4 flex items-center font-bold text-xs text-[#2b1572] uppercase tracking-wider bg-white/40">
              Danh sách & Thẻ
            </div>

            {/* List & Card Rows with synchronized scroll */}
            <div
              ref={leftPaneRef}
              onScroll={handleLeftPaneScroll}
              className="flex-1 overflow-y-auto divide-y divide-white/40 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {listsWithCards.map((list: any) => (
                <div key={list.id} className="py-2">
                  {/* List Header Row */}
                  <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-[#2b1572] bg-white/40">
                    <span className="w-2 h-2 rounded-full bg-[#2b1572]" />
                    <span className="truncate">{list.title}</span>
                    <span className="text-[10px] text-[#2b1572]/50 font-normal">
                      ({list.scheduledCards.length})
                    </span>
                  </div>

                  {/* Cards In List */}
                  {list.scheduledCards.map((card: any) => (
                    <div
                      key={card.id}
                      onClick={() => onOpenCardDetail(card.id)}
                      className="h-10 px-4 flex items-center justify-between text-xs text-[#2b1572] hover:bg-[#a6d1fd]/20 transition-colors cursor-pointer group"
                    >
                      <span className="truncate font-medium group-hover:text-[#1e0f52]">
                        {card.title}
                      </span>
                      {card.is_due_date_completed && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                      )}
                    </div>
                  ))}

                  {list.scheduledCards.length === 0 && (
                    <div className="h-8 px-4 flex items-center text-[11px] text-[#2b1572]/40 italic">
                      Chưa có thẻ có ngày
                    </div>
                  )}
                </div>
              ))}

              {listsWithCards.length === 0 && (
                <div className="p-4 text-center text-xs text-[#2b1572]/50">
                  Không có danh sách nào
                </div>
              )}
            </div>
          </div>

          {/* Right Area: Scrollable Timeline Chart with synchronized scroll */}
          <div
            ref={timelineContainerRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-x-auto overflow-y-auto relative select-none"
          >
            <div
              style={{ width: `${timelineDates.length * colWidth}px` }}
              className="min-h-full flex flex-col relative"
            >
              {/* Timeline Header Row (Days of Week + Dates) */}
              <div className="h-14 border-b border-white/80 bg-white/70 backdrop-blur-md sticky top-0 z-10 flex">
                {timelineDates.map((d) => {
                  const today = isToday(d);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <div
                      key={d.toISOString()}
                      style={{ width: `${colWidth}px` }}
                      className={`h-full border-r border-[#2b1572]/10 flex flex-col items-center justify-center shrink-0 ${
                        today
                          ? 'bg-[#a6d1fd]/30'
                          : isWeekend
                          ? 'bg-[#2b1572]/5'
                          : ''
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          isWeekend ? 'text-[#c40000]/70' : 'text-[#2b1572]/60'
                        }`}
                      >
                        {getDayOfWeekName(d)}
                      </span>
                      <span
                        className={`text-xs font-bold mt-0.5 ${
                          today
                            ? 'w-5 h-5 rounded-full bg-[#2b1572] text-[#a6d1fd] flex items-center justify-center shadow-xs'
                            : 'text-[#2b1572]'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grid Background Lines */}
              <div className="absolute inset-0 top-14 pointer-events-none flex">
                {timelineDates.map((d) => {
                  const today = isToday(d);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <div
                      key={d.toISOString()}
                      style={{ width: `${colWidth}px` }}
                      className={`h-full border-r border-[#2b1572]/10 shrink-0 ${
                        today
                          ? 'border-r-2 border-r-[#2b1572]/40 bg-[#a6d1fd]/10'
                          : isWeekend
                          ? 'bg-[#2b1572]/[0.02]'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>

              {/* Swimlanes & Card Gantt Bars */}
              <div className="flex-1 divide-y divide-white/40 z-1">
                {listsWithCards.map((list: any) => (
                  <div key={list.id} className="py-2">
                    {/* List lane space matching left list header height */}
                    <div className="h-8" />

                    {/* Card Bars */}
                    {list.scheduledCards.map((card: any) => {
                      const { left, width } = getCardBarPosition(card);
                      const barStyle = getCardBarStyle(card);

                      return (
                        <div key={card.id} className="h-10 relative flex items-center">
                          {/* Horizontal Timeline Bar */}
                          <div
                            onClick={() => onOpenCardDetail(card.id)}
                            style={{
                              left: `${left}px`,
                              width: `${width}px`,
                            }}
                            className={`absolute h-7 rounded-xl border px-2.5 flex items-center justify-between text-xs font-semibold cursor-pointer shadow-xs transition-all hover:scale-[1.01] hover:shadow-md ${barStyle}`}
                            title={`${card.title} (${
                              card.due_date
                                ? new Date(card.due_date).toLocaleDateString('vi-VN')
                                : 'Chưa có hạn'
                            })`}
                          >
                            <span className="truncate pr-1">{card.title}</span>
                            {card.card_assignees?.length > 0 && (
                              <div className="w-4 h-4 rounded-full bg-white text-[#2b1572] flex items-center justify-center text-[8px] font-bold shrink-0">
                                {card.card_assignees[0].user?.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {list.scheduledCards.length === 0 && <div className="h-8" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Unscheduled Cards Drawer / Sidebar */}
        {showUnscheduled && (
          <div className="w-72 sm:w-80 rounded-2xl glass-strong border border-white/80 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-[#2b1572]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-[#2b1572]" />
                <h3 className="text-xs font-bold text-[#2b1572]">
                  Chưa lên lịch ({unscheduledCards.length})
                </h3>
              </div>
              <button
                onClick={() => setShowUnscheduled(false)}
                className="p-1 rounded-lg hover:bg-white/60 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unscheduledCards.length === 0 ? (
                <div className="py-12 text-center text-[#2b1572]/50 text-xs">
                  Tất cả các thẻ đều đã được thiết lập ngày trên lịch trình!
                </div>
              ) : (
                unscheduledCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => onOpenCardDetail(card.id)}
                    className="p-2.5 bg-white/80 hover:bg-white rounded-xl border border-white/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-[#2b1572] group-hover:text-[#1e0f52]">
                      {card.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#2b1572]/60 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#2b1572]/10 font-medium">
                        {card.listName}
                      </span>
                      <span className="text-[#a000c8] font-semibold hover:underline">
                        Lên lịch ngày →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
