'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Kanban } from 'lucide-react';

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string | null;
  email?: string | null;
  isGuest?: boolean;
  color?: string;
  online_at?: string;
}

export const GOOGLE_DOCS_PRESENCE_COLORS = [
  { border: '#10b981', bg: '#ecfdf5', text: '#065f46', ring: 'ring-emerald-500', hex: '#10b981' },
  { border: '#3b82f6', bg: '#eff6ff', text: '#1e40af', ring: 'ring-blue-500', hex: '#3b82f6' },
  { border: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6', ring: 'ring-purple-500', hex: '#8b5cf6' },
  { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', ring: 'ring-amber-500', hex: '#f59e0b' },
  { border: '#ec4899', bg: '#fdf2f8', text: '#9d174d', ring: 'ring-pink-500', hex: '#ec4899' },
  { border: '#06b6d4', bg: '#ecfeff', text: '#155e75', ring: 'ring-cyan-500', hex: '#06b6d4' },
  { border: '#6366f1', bg: '#eef2ff', text: '#3730a3', ring: 'ring-indigo-500', hex: '#6366f1' },
  { border: '#f43f5e', bg: '#fff1f2', text: '#9f1239', ring: 'ring-rose-500', hex: '#f43f5e' },
];

export function getDeterministicColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GOOGLE_DOCS_PRESENCE_COLORS.length;
  return GOOGLE_DOCS_PRESENCE_COLORS[index];
}

interface LivePresenceBarProps {
  activeUsers: PresenceUser[];
  currentUserId?: string;
  onOpenShareModal?: () => void;
}

export default function LivePresenceBar({
  activeUsers,
  currentUserId,
  onOpenShareModal,
}: LivePresenceBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const uniqueUsers = React.useMemo(() => {
    const map = new Map<string, PresenceUser>();
    for (const u of activeUsers) {
      if (u.id && !map.has(u.id)) {
        map.set(u.id, u);
      }
    }
    return Array.from(map.values());
  }, [activeUsers]);

  if (uniqueUsers.length === 0) {
    return null;
  }

  const displayUsers = uniqueUsers.slice(0, 5);
  const remainingCount = uniqueUsers.length > 5 ? uniqueUsers.length - 5 : 0;

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Live Presence Avatar Stack (Google Docs style) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center -space-x-1.5 hover:opacity-95 transition-all cursor-pointer p-0.5 rounded-full hover:bg-slate-100/70"
        title="Bấm để xem danh sách cộng tác viên đang trực tuyến theo thời gian thực"
      >
        {displayUsers.map((u, idx) => {
          const colorObj = getDeterministicColor(u.id);
          const isMe = currentUserId === u.id;
          const initial = (u.name || 'U').charAt(0).toUpperCase();

          return (
            <div
              key={u.id || idx}
              className="relative shrink-0 transition-transform duration-150 hover:scale-120 hover:z-30 hover:-translate-y-0.5 group"
            >
              {/* Avatar ring with Google Docs vibrant border */}
              <div
                className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full overflow-hidden border-2 bg-white flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-xs transition-shadow"
                style={{
                  borderColor: u.isGuest ? '#f59e0b' : colorObj.border,
                  backgroundColor: colorObj.bg,
                  color: colorObj.text,
                }}
              >
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              {/* Dấu chấm xanh trực tuyến có hiệu ứng nhấp nháy */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white"></span>
              </span>

              {/* Huy hiệu Khách (Guest) đặc thù nếu là khách ngoài */}
              {u.isGuest && (
                <span
                  className="absolute -top-1 -right-1 z-20 w-3 h-3 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[8px] font-black text-white shadow-2xs"
                  title="Khách (Guest) ngoài Workspace"
                >
                  K
                </span>
              )}

              {/* Tooltip phong cách Google Docs */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/95 text-white shadow-xl backdrop-blur-xs text-center border border-slate-700/60">
                  <div className="text-xs font-semibold flex items-center gap-1.5 justify-center">
                    <span>{u.name}</span>
                    {isMe && <span className="text-emerald-400 font-normal text-[10px]">(Bạn)</span>}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1 justify-center">
                    {u.isGuest ? (
                      <span className="text-amber-300 font-medium flex items-center gap-0.5">
                        <Kanban className="w-2.5 h-2.5" /> Khách (Guest)
                      </span>
                    ) : (
                      <span className="text-sky-300 font-medium">Thành viên Bảng</span>
                    )}
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Đang xem</span>
                  </div>
                  {u.email && <div className="text-[9px] text-slate-400 mt-0.5">{u.email}</div>}
                </div>
                {/* Mũi tên tooltip */}
                <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900/95 -mt-0.5 order-first"></div>
              </div>
            </div>
          );
        })}

        {/* Nút +N nếu có hơn 5 người */}
        {remainingCount > 0 && (
          <div
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-slate-100 text-slate-700 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-xs hover:bg-slate-200 transition-colors z-10"
            title={`Còn ${remainingCount} người khác đang trực tuyến`}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Dropdown chi tiết người đang trực tuyến */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-slate-900 text-xs">
                Cộng tác viên trực tuyến ({uniqueUsers.length})
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Google Docs Realtime</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 space-y-1 pr-1">
            {uniqueUsers.map((u) => {
              const isMe = currentUserId === u.id;
              const colorObj = getDeterministicColor(u.id);

              return (
                <div key={u.id} className="pt-2 pb-1.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden"
                      style={{
                        borderColor: u.isGuest ? '#f59e0b' : colorObj.border,
                        backgroundColor: colorObj.bg,
                        color: colorObj.text,
                      }}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(u.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                        <span className="truncate">{u.name}</span>
                        {isMe && <span className="text-[10px] text-emerald-600 font-bold shrink-0">(Bạn)</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {u.email || (u.isGuest ? 'Khách ngoài Workspace' : 'Thành viên Bảng')}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {u.isGuest ? (
                      <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Khách (Guest)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        Thành viên
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {onOpenShareModal && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Mời thêm cộng tác viên vào Bảng?</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenShareModal();
                }}
                className="text-xs font-semibold text-[#f28d8d] hover:text-[#d86969] cursor-pointer"
              >
                Chia sẻ Bảng →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
