'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string | number;
  label: string;
  badge?: string;
  extra?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  error?: boolean;
  size?: 'sm' | 'md';
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn một mục...',
  disabled = false,
  className = '',
  dropdownClassName = '',
  error = false,
  size = 'md',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isSmall = size === 'sm';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between ${
          isSmall ? 'text-xs px-3 py-1.5' : 'text-sm px-3.5 py-2.5'
        } text-slate-900 bg-white border ${
          error
            ? 'border-rose-400 ring-2 ring-rose-400/20'
            : isOpen
            ? 'border-[#87ceeb] ring-2 ring-[#87ceeb]/30 shadow-xs'
            : 'border-slate-300 hover:border-slate-400'
        } rounded-lg transition-all font-medium text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1 mr-2">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate ${!selectedOption ? 'text-slate-400 font-normal' : 'text-slate-900 font-semibold'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200/80 rounded-md">
              {selectedOption.badge}
            </span>
          )}
          {selectedOption?.extra && (
            <span className="shrink-0 text-xs text-slate-500 font-normal">
              {selectedOption.extra}
            </span>
          )}
        </div>
        <ChevronDown
          className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-900' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 max-h-64 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-slate-400 text-center">
              Không có tùy chọn nào
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(String(opt.value));
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between ${
                    isSmall ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
                  } rounded-lg text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-[#f28d8d] text-white font-semibold shadow-2xs'
                      : 'text-slate-800 hover:bg-[#ffc0cb]/20 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span
                        className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-md ${
                          isSelected
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-sky-100 text-sky-800 border border-sky-200/60'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {opt.extra && (
                      <span
                        className={`shrink-0 text-xs font-normal ${
                          isSelected ? 'text-white/80' : 'text-slate-500'
                        }`}
                      >
                        {opt.extra}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
