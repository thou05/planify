'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  Users,
  Shield,
  Trash2,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: any;
  workspaceMembers?: any[];
  currentUserId?: string;
  onUpdated: () => void;
}

export default function ShareBoardModal({
  isOpen,
  onClose,
  board,
  workspaceMembers = [],
  currentUserId,
  onUpdated,
}: ShareBoardModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedWsUserId, setSelectedWsUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !board) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const boardUrl = `${origin}/boards/${board.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(boardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVisibilityChange = async (newVisibility: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC') => {
    setIsUpdatingVisibility(true);
    setError('');
    try {
      const res = await apiClient(`/boards/${board.id}`, {
        method: 'PATCH',
        data: { visibility: newVisibility },
      });
      if (res.success) {
        onUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật quyền hiển thị');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsUserId) return;

    setIsAdding(true);
    setError('');
    try {
      const res = await apiClient(`/boards/${board.id}/members`, {
        method: 'POST',
        data: {
          userId: selectedWsUserId,
          role: selectedRole,
        },
      });
      if (res.success) {
        setSelectedWsUserId('');
        onUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể thêm thành viên');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
    try {
      const res = await apiClient(`/boards/${board.id}/members/${targetUserId}`, {
        method: 'PATCH',
        data: { role: newRole },
      });
      if (res.success) {
        onUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể đổi vai trò');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi Board?')) return;
    try {
      const res = await apiClient(`/boards/${board.id}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        onUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa thành viên');
    }
  };

  // Lọc ra các thành viên trong workspace chưa được thêm vào board
  const existingBoardUserIds = new Set((board.members || []).map((m: any) => m.user_id));
  const availableWsMembers = workspaceMembers.filter((m: any) => !existingBoardUserIds.has(m.user_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/25 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-strong p-6 sm:p-8 border border-white/70 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Chia sẻ & Quyền truy cập</h2>
            <p className="text-xs text-[#2b1572]/70">Quản lý cách mọi người truy cập vào bảng này</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium">
            {error}
          </div>
        )}

        {/* Direct Link Section */}
        <div className="p-4 rounded-xl bg-white/50 border border-white/70 mb-5 space-y-2">
          <span className="text-[11px] font-bold text-[#2b1572]/70 uppercase tracking-wider">
            Liên kết trực tiếp tới Board
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={boardUrl}
              className="w-full px-3 py-2 text-xs glass-input text-[#2b1572] font-mono bg-white/60 select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 btn-primary text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visibility Selector */}
        <div className="mb-5 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80">
            Quyền hiển thị (Visibility)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isUpdatingVisibility || !board.canManageMembers}
              onClick={() => handleVisibilityChange('WORKSPACE')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                board.visibility === 'WORKSPACE'
                  ? 'bg-white/80 border-[#2b1572] shadow-sm'
                  : 'bg-white/40 border-white/60 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2b1572] mb-0.5">
                <Users className="w-3.5 h-3.5" />
                <span>Không gian</span>
              </div>
              <div className="text-[10px] text-[#2b1572]/65 leading-tight">
                Mọi thành viên Workspace
              </div>
            </button>

            <button
              type="button"
              disabled={isUpdatingVisibility || !board.canManageMembers}
              onClick={() => handleVisibilityChange('PRIVATE')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                board.visibility === 'PRIVATE'
                  ? 'bg-white/80 border-[#2b1572] shadow-sm'
                  : 'bg-white/40 border-white/60 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2b1572] mb-0.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Riêng tư</span>
              </div>
              <div className="text-[10px] text-[#2b1572]/65 leading-tight">
                Chỉ thành viên Board
              </div>
            </button>

            <button
              type="button"
              disabled={isUpdatingVisibility || !board.canManageMembers}
              onClick={() => handleVisibilityChange('PUBLIC')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                board.visibility === 'PUBLIC'
                  ? 'bg-white/80 border-[#2b1572] shadow-sm'
                  : 'bg-white/40 border-white/60 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2b1572] mb-0.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Công khai</span>
              </div>
              <div className="text-[10px] text-[#2b1572]/65 leading-tight">
                Bất kỳ ai có liên kết
              </div>
            </button>
          </div>
        </div>

        {/* Add Member from Workspace */}
        {board.canManageMembers && availableWsMembers.length > 0 && (
          <form onSubmit={handleAddMember} className="mb-5 p-3 rounded-xl bg-white/40 border border-white/60 space-y-2">
            <span className="text-[11px] font-bold text-[#2b1572] flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#2b1572]" />
              Thêm thành viên từ Không gian làm việc
            </span>
            <div className="flex gap-2">
              <select
                value={selectedWsUserId}
                onChange={(e) => setSelectedWsUserId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs glass-input font-medium"
              >
                <option value="">-- Chọn thành viên Workspace --</option>
                {availableWsMembers.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || 'Thành viên'} ({m.user?.email})
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-28 px-2.5 py-1.5 text-xs glass-input font-semibold"
              >
                <option value="EDITOR">Biên tập</option>
                <option value="VIEWER">Chỉ xem</option>
                <option value="ADMIN">Admin</option>
              </select>

              <button
                type="submit"
                disabled={isAdding || !selectedWsUserId}
                className="px-3 py-1.5 btn-primary text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Thêm'}
              </button>
            </div>
          </form>
        )}

        {/* Members List in Board */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#2b1572]/70 mb-2">
            Thành viên trong Board ({board.members?.length || 0})
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-[#2b1572]/10">
            {board.members?.map((m: any) => {
              const isSelf = m.user_id === currentUserId;
              const canEditRole = board.canManageMembers && !isSelf;

              return (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#2b1572]/10 border border-white/80 flex items-center justify-center text-[#2b1572] font-bold text-xs shadow-xs">
                      {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2b1572] flex items-center gap-1.5">
                        <span>{m.user?.name}</span>
                        {isSelf && <span className="text-[10px] text-[#2b1572]/50 font-normal">(Bạn)</span>}
                      </div>
                      <div className="text-[11px] text-[#2b1572]/60">{m.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEditRole ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.user_id, e.target.value as any)}
                        className="px-2 py-1 text-[11px] glass-input font-semibold text-[#2b1572]"
                      >
                        <option value="ADMIN">Quản trị viên</option>
                        <option value="EDITOR">Biên tập viên</option>
                        <option value="VIEWER">Chỉ xem</option>
                      </select>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-[#2b1572] font-bold border border-white/80">
                        {m.role === 'ADMIN' ? 'Admin' : m.role === 'EDITOR' ? 'Biên tập' : 'Chỉ xem'}
                      </span>
                    )}

                    {canEditRole && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="p-1 text-[#2b1572]/40 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-lg transition-colors cursor-pointer"
                        title="Xóa khỏi Board"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
