'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Columns3, Table, Calendar, GanttChart, BarChart3, ChevronDown, X, Check } from 'lucide-react';

export type BoardViewType = 'kanban' | 'table' | 'calendar' | 'schedule' | 'analytics';

interface BoardViewSwitcherProps {
  activeView: BoardViewType;
  onViewChange: (view: BoardViewType) => void;
}

export const VIEW_CONFIGS: {
  id: BoardViewType;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: 'kanban',
    label: 'Bảng',
    subLabel: 'Kanban',
    icon: Columns3,
    description: 'Dạng cột thẻ trực quan, kéo thả linh hoạt',
  },
  {
    id: 'table',
    label: 'Bảng dữ liệu',
    subLabel: 'Table',
    icon: Table,
    description: 'Dạng bảng tính tổng hợp, lọc và phân loại tiện lợi',
  },
  {
    id: 'calendar',
    label: 'Lịch',
    subLabel: 'Calendar',
    icon: Calendar,
    description: 'Lịch tháng trực quan, theo dõi hạn chót và kế hoạch',
  },
  {
    id: 'schedule',
    label: 'Lịch trình',
    subLabel: 'Timeline',
    icon: GanttChart,
    description: 'Biểu đồ tiến độ Gantt theo ngày và tuần',
  },
  {
    id: 'analytics',
    label: 'Thống kê',
    subLabel: 'Analytics',
    icon: BarChart3,
    description: 'Biểu đồ tiến độ, phân bổ nhân sự và phân tích thông minh',
  },
];

export default function BoardViewSwitcher({
  activeView,
  onViewChange,
}: BoardViewSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentConfig = VIEW_CONFIGS.find((v) => v.id === activeView) || VIEW_CONFIGS[0];
  const CurrentIcon = currentConfig.icon;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="flex items-center gap-1.5 select-none">
      {/* Dropdown Menu matching the design in user reference image */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-xs ${
            isOpen
              ? 'bg-[#2b1572] text-[#a6d1fd] border-[#2b1572]'
              : 'glass-weak text-[#2b1572] hover:bg-white/80 border-white/60'
          }`}
          title="Thay đổi chế độ xem bảng"
        >
          <CurrentIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{currentConfig.label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-2 w-72 glass-strong rounded-2xl shadow-xl border border-white/80 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-[#2b1572]/10 mb-1">
              <span className="font-bold text-[#2b1572] text-xs">
                Chế độ xem
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/60 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of Views */}
            <div className="space-y-1">
              {VIEW_CONFIGS.map((item) => {
                const Icon = item.icon;
                const isSelected = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2b1572] text-white shadow-xs font-semibold'
                        : 'hover:bg-white/70 text-[#2b1572]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-[#a6d1fd]/20 text-[#a6d1fd]'
                            : 'bg-white/80 text-[#2b1572] border border-white/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold leading-tight">
                          {item.label}
                        </div>
                        <div
                          className={`text-[10px] leading-snug mt-0.5 line-clamp-1 ${
                            isSelected ? 'text-[#a6d1fd]' : 'text-[#2b1572]/60'
                          }`}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#a6d1fd] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
