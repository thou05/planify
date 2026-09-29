'use client';

import React, { useState, useEffect } from 'react';
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
  Mail,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import ConfirmModal from './ConfirmModal';

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
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [copied, setCopied] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  // Members Tab State
  const [selectedWsUserId, setSelectedWsUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // Invites Tab State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Custom Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const boardUrl = `${origin}/boards/${board?.id}`;

  const fetchPendingInvites = async () => {
    if (!board?.id) return;
    setLoadingInvites(true);
    try {
      const res = await apiClient<any[]>(`/boards/${board.id}/invites`);
      if (res.success && res.data) {
        setPendingInvites(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (isOpen && board?.id) {
      setError('');
      setSuccessMsg('');
      setLatestInviteLink(null);
      if (activeTab === 'invites') {
        fetchPendingInvites();
      }
    }
  }, [isOpen, board?.id, activeTab]);

  if (!isOpen || !board) return null;

  const handleCopyBoardUrl = () => {
    navigator.clipboard.writeText(boardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyInviteLink = () => {
    if (latestInviteLink) {
      navigator.clipboard.writeText(latestInviteLink);
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 2500);
    }
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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSendingInvite(true);
    setError('');
    setSuccessMsg('');
    setLatestInviteLink(null);

    try {
      const res = await apiClient<any>(`/boards/${board.id}/invites`, {
        method: 'POST',
        data: {
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        },
      });

      if (res.success && res.data) {
        const token = res.data.invite?.token;
        if (token) {
          const link = `${origin}/invite/${token}`;
          setLatestInviteLink(link);
        }
        setSuccessMsg(res.data.message || 'Tạo lời mời thành công!');
        setInviteEmail('');
        fetchPendingInvites();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lời mời, vui lòng thử lại');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeInvite = (invite: any) => {
    setConfirmState({
      isOpen: true,
      title: 'Thu hồi lời mời',
      message: `Bạn có chắc chắn muốn thu hồi lời mời gửi tới "${invite.email}"? Sau khi thu hồi, liên kết mời này sẽ mất hiệu lực ngay lập tức.`,
      confirmText: 'Thu hồi lời mời',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await apiClient(`/boards/${board.id}/invites/${invite.id}`, {
            method: 'DELETE',
          });
          if (res.success) {
            setSuccessMsg(`Đã thu hồi lời mời gửi tới ${invite.email}`);
            fetchPendingInvites();
            setTimeout(() => setSuccessMsg(''), 3000);
          }
        } catch (err: any) {
          setError(err.message || 'Không thể thu hồi lời mời');
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUpdateRole = async (targetUserId: string, newRole: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
    if (!targetUserId || targetUserId === 'undefined') {
      setError('Không xác định được mã thành viên để đổi vai trò');
      return;
    }
    setError('');
    try {
      const res = await apiClient(`/boards/${board.id}/members/${targetUserId}`, {
        method: 'PATCH',
        data: { role: newRole },
      });
      if (res.success) {
        onUpdated();
        setSuccessMsg('Đã cập nhật vai trò thành công');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể đổi vai trò');
    }
  };

  const handleRemoveMember = (memberOrId: any) => {
    const targetUserId =
      typeof memberOrId === 'string'
        ? memberOrId
        : (memberOrId?.user_id || memberOrId?.user?.id || memberOrId?.id);

    const memberName =
      typeof memberOrId === 'object'
        ? (memberOrId?.user?.name || memberOrId?.user?.email || 'thành viên này')
        : 'thành viên này';

    if (!targetUserId || targetUserId === 'undefined') {
      setError('Không xác định được mã thành viên để xóa');
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Xóa thành viên khỏi Bảng',
      message: `Bạn có chắc chắn muốn xóa "${memberName}" khỏi Bảng làm việc này? Thành viên sẽ không còn quyền truy cập bảng.`,
      confirmText: 'Xóa thành viên',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await apiClient(`/boards/${board.id}/members/${targetUserId}`, {
            method: 'DELETE',
          });
          if (res.success) {
            onUpdated();
            setSuccessMsg(`Đã xóa ${memberName} khỏi Bảng`);
            setTimeout(() => setSuccessMsg(''), 3000);
          }
        } catch (err: any) {
          setError(err.message || 'Không thể xóa thành viên');
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const existingBoardUserIds = new Set((board.members || []).map((m: any) => m.user_id));
  const availableWsMembers = workspaceMembers.filter((m: any) => !existingBoardUserIds.has(m.user_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/25 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl glass-strong border border-white/80 rounded-3xl p-6 sm:p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Chia sẻ & Quyền truy cập</h2>
            <p className="text-xs text-[#2b1572]/70">Bảng: {board.name}</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-[#2b1572]/10 pb-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-xs'
                : 'text-[#2b1572]/70 hover:bg-white/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thành viên ({board.members?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('invites');
              fetchPendingInvites();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'invites'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-xs'
                : 'text-[#2b1572]/70 hover:bg-white/40'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Mời qua Email / Liên kết</span>
            {pendingInvites.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#c40000] text-white text-[9px] font-black leading-none">
                {pendingInvites.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Container */}
        <div className="overflow-y-auto space-y-5 flex-1 pr-1">
          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <>
              {/* Copy Direct Board URL */}
              <div className="p-3.5 rounded-2xl bg-white/50 border border-white/70 space-y-2">
                <span className="text-[11px] font-bold text-[#2b1572]">Liên kết trực tiếp tới Board</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={boardUrl}
                    className="flex-1 px-3 py-1.5 text-xs glass-input select-all font-mono text-[#2b1572]/80 bg-white/40"
                  />
                  <button
                    onClick={handleCopyBoardUrl}
                    className="px-3 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Visibility Setting */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2b1572]/70 mb-2">
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
                <form onSubmit={handleAddMember} className="p-3 rounded-2xl bg-white/40 border border-white/60 space-y-2">
                  <span className="text-[11px] font-bold text-[#2b1572] flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#2b1572]" />
                    Thêm trực tiếp thành viên từ Không gian làm việc
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
                      className="px-3.5 py-1.5 btn-primary text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
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

                <div className="max-h-56 overflow-y-auto divide-y divide-[#2b1572]/10 pr-1">
                  {board.members?.map((m: any) => {
                    const isSelf = m.user_id === currentUserId;
                    const canEditRole = board.canManageMembers && !isSelf;

                    return (
                      <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2b1572]/10 border border-white/80 overflow-hidden flex items-center justify-center text-[#2b1572] font-bold text-xs shadow-xs">
                            {m.user?.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.user.avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span>{m.user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                            )}
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
                              onChange={(e) => handleUpdateRole(m.user_id || m.user?.id, e.target.value as any)}
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
                              onClick={() => handleRemoveMember(m)}
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
            </>
          )}

          {/* TAB 2: INVITES VIA EMAIL / LINK */}
          {activeTab === 'invites' && (
            <div className="space-y-5">
              {/* Send Invite Form */}
              {board.canManageMembers && (
                <form onSubmit={handleSendInvite} className="p-4 rounded-2xl bg-white/50 border border-white/80 space-y-3">
                  <span className="text-xs font-bold text-[#2b1572] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#2b1572]" />
                    <span>Gửi lời mời tham gia Bảng qua email</span>
                  </span>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Nhập email đồng nghiệp..."
                      className="flex-1 px-3.5 py-2 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572]"
                    />

                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full sm:w-36 px-3 py-2 text-xs glass-input font-semibold text-[#2b1572]"
                    >
                      <option value="EDITOR">Biên tập viên</option>
                      <option value="VIEWER">Chỉ xem</option>
                      <option value="ADMIN">Quản trị viên</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isSendingInvite || !inviteEmail.trim()}
                      className="px-4 py-2 btn-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                    >
                      {isSendingInvite ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      <span>Tạo lời mời</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Display Generated Invite Link */}
              {latestInviteLink && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2 animate-fade-in">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Liên kết mời tham gia Board vừa tạo (có hiệu lực 7 ngày):</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={latestInviteLink}
                      className="flex-1 px-3 py-1.5 text-xs glass-input font-mono select-all text-[#2b1572] bg-white/60"
                    />
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="px-3 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      {copiedInviteLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedInviteLink ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Invites List */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#2b1572]/70 mb-2">
                  Lời mời đang chờ ({pendingInvites.length})
                </div>

                {loadingInvites ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#2b1572]/60">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2b1572]" />
                    <span>Đang tải danh sách lời mời...</span>
                  </div>
                ) : pendingInvites.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#2b1572]/60 rounded-xl bg-white/30 border border-white/60">
                    Chưa có lời mời đang chờ nào cho Bảng này.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#2b1572]/10 pr-1">
                    {pendingInvites.map((inv: any) => (
                      <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-[#2b1572] flex items-center gap-2">
                            <span>{inv.email}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-900 font-bold">
                              {inv.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#2b1572]/60 flex items-center gap-2 mt-0.5">
                            <span>Mời bởi: {inv.inviter?.name || 'Admin'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Hạn: {new Date(inv.expired_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const link = `${origin}/invite/${inv.token}`;
                              navigator.clipboard.writeText(link);
                              setSuccessMsg('Đã sao chép liên kết mời vào bộ nhớ tạm!');
                              setTimeout(() => setSuccessMsg(''), 3000);
                            }}
                            className="p-1.5 text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
                            title="Sao chép liên kết"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {board.canManageMembers && (
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv)}
                              className="px-2.5 py-1 rounded-lg border border-[#c40000]/30 text-[#c40000] hover:bg-[#c40000]/10 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Thu hồi
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global Confirm Modal */}
        <ConfirmModal
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          variant={confirmState.variant}
        />
      </div>
    </div>
  );
}
