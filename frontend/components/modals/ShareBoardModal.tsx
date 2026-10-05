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

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Bạn có chắc muốn thu hồi lời mời này?')) return;
    try {
      const res = await apiClient(`/boards/${board.id}/invites/${inviteId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        fetchPendingInvites();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể thu hồi lời mời');
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

  const existingBoardUserIds = new Set((board.members || []).map((m: any) => m.user_id));
  const availableWsMembers = workspaceMembers.filter((m: any) => !existingBoardUserIds.has(m.user_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white border border-slate-300 rounded-lg p-6 sm:p-7 relative shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-2xs">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Chia sẻ & Quyền truy cập</h2>
            <p className="text-xs text-slate-500">Bảng: {board.name}</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-slate-200 pb-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-[#0f172a] text-white'
                : 'text-slate-600 hover:bg-slate-100'
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
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'invites'
                ? 'bg-[#0f172a] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Mời qua Email / Liên kết</span>
            {pendingInvites.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-xs bg-red-600 text-white text-[10px] font-mono leading-none">
                {pendingInvites.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
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
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-semibold text-slate-800">Liên kết trực tiếp tới Board</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={boardUrl}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md select-all font-mono text-slate-800 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyBoardUrl}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Visibility Setting */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Quyền hiển thị (Visibility)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingVisibility || !board.canManageMembers}
                    onClick={() => handleVisibilityChange('WORKSPACE')}
                    className={`p-2.5 rounded-md text-left border transition-all cursor-pointer ${
                      board.visibility === 'WORKSPACE'
                        ? 'bg-slate-100 border-slate-900 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Không gian</span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Mọi thành viên Workspace
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingVisibility || !board.canManageMembers}
                    onClick={() => handleVisibilityChange('PRIVATE')}
                    className={`p-2.5 rounded-md text-left border transition-all cursor-pointer ${
                      board.visibility === 'PRIVATE'
                        ? 'bg-slate-100 border-slate-900 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Riêng tư</span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Chỉ thành viên Board
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingVisibility || !board.canManageMembers}
                    onClick={() => handleVisibilityChange('PUBLIC')}
                    className={`p-2.5 rounded-md text-left border transition-all cursor-pointer ${
                      board.visibility === 'PUBLIC'
                        ? 'bg-slate-100 border-slate-900 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Công khai</span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Bất kỳ ai có liên kết
                    </div>
                  </button>
                </div>
              </div>

              {/* Add Member from Workspace */}
              {board.canManageMembers && availableWsMembers.length > 0 && (
                <form onSubmit={handleAddMember} className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                    Thêm trực tiếp thành viên từ Không gian làm việc
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={selectedWsUserId}
                      onChange={(e) => setSelectedWsUserId(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-800 focus:outline-none"
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
                      className="w-28 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="EDITOR">Biên tập</option>
                      <option value="VIEWER">Chỉ xem</option>
                      <option value="ADMIN">Admin</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isAdding || !selectedWsUserId}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Thêm'}
                    </button>
                  </div>
                </form>
              )}

              {/* Members List in Board */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Thành viên trong Board ({board.members?.length || 0})
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
                  {board.members?.map((m: any) => {
                    const isSelf = m.user_id === currentUserId;
                    const canEditRole = board.canManageMembers && !isSelf;

                    return (
                      <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-700 font-bold text-xs">
                            {m.user?.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.user.avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span>{m.user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{m.user?.name}</span>
                              {isSelf && <span className="text-[10px] text-slate-400 font-normal">(Bạn)</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">{m.user?.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canEditRole ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateRole(m.user_id, e.target.value as any)}
                              className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:outline-none"
                            >
                              <option value="ADMIN">Quản trị viên</option>
                              <option value="EDITOR">Biên tập viên</option>
                              <option value="VIEWER">Chỉ xem</option>
                            </select>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                              {m.role === 'ADMIN' ? 'Admin' : m.role === 'EDITOR' ? 'Biên tập' : 'Chỉ xem'}
                            </span>
                          )}

                          {canEditRole && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
                <form onSubmit={handleSendInvite} className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                    <span>Gửi lời mời tham gia Bảng qua email</span>
                  </span>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Nhập email đồng nghiệp..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md placeholder:text-slate-400 text-slate-900 focus:outline-none"
                    />

                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full sm:w-36 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="EDITOR">Biên tập viên</option>
                      <option value="VIEWER">Chỉ xem</option>
                      <option value="ADMIN">Quản trị viên</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isSendingInvite || !inviteEmail.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 transition-colors shadow-2xs"
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
                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2 animate-fade-in">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Liên kết mời tham gia Board vừa tạo (có hiệu lực 7 ngày):</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={latestInviteLink}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono select-all text-slate-800 focus:outline-none"
                    >
                    </input>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
                    >
                      {copiedInviteLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedInviteLink ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Invites List */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Lời mời đang chờ ({pendingInvites.length})
                </div>

                {loadingInvites ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Đang tải danh sách lời mời...</span>
                  </div>
                ) : pendingInvites.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 rounded-md bg-slate-50 border border-slate-200">
                    Chưa có lời mời đang chờ nào cho Bảng này.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {pendingInvites.map((inv: any) => (
                      <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{inv.email}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-slate-100 border border-slate-200 text-slate-800 font-semibold font-mono">
                              {inv.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
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
                              alert('Đã sao chép liên kết mời!');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Sao chép liên kết"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {board.canManageMembers && (
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-2.5 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
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
      </div>
    </div>
  );
}
