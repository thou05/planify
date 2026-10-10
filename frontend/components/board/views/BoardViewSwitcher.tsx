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
  const isDropdownActive = activeView !== 'analytics';

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
    <div className="flex items-center gap-2 select-none">
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
            isOpen || isDropdownActive
              ? 'bg-[#f28d8d] text-white border-[#d86969] hover:bg-[#e57a7a] shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs'
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
            className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-lg shadow-xl border border-slate-300 z-50 p-2 text-xs animate-fade-in"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-200 mb-1.5">
              <span className="font-semibold text-slate-900 text-xs">
                Chế độ xem
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#f28d8d] text-white font-medium'
                        : 'hover:bg-[#ffc0cb]/20 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-md shrink-0 ${
                          isSelected
                            ? 'bg-[#e57a7a] text-white border border-[#d86969]'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold leading-tight">
                          {item.label}
                        </div>
                        <div
                          className={`text-[11px] leading-snug mt-0.5 line-clamp-1 ${
                            isSelected ? 'text-rose-50' : 'text-slate-500'
                          }`}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />
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
