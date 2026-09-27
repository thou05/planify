'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/layout/AppShell';
import CreateBoardModal from '@/components/modals/CreateBoardModal';
import EditWorkspaceModal from '@/components/modals/EditWorkspaceModal';
import InviteMemberModal from '@/components/modals/InviteMemberModal';
import TransferOwnershipModal from '@/components/modals/TransferOwnershipModal';
import ArchivedBoardsModal from '@/components/modals/ArchivedBoardsModal';
import {
  Layers,
  Kanban,
  Users,
  Settings,
  Plus,
  Star,
  UserPlus,
  Trash2,
  Shield,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Mail,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  Crown,
  LogOut,
  Edit3,
  ExternalLink,
  Archive,
  History,
  RefreshCw,
  Clock,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ActivityItem } from '@/components/modals/MyActivityModal';

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.workspaceId;
  const router = useRouter();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'boards' | 'members' | 'settings' | 'activities'>('boards');

  // Workspace Activities State
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'board' | 'card' | 'workspace'>('all');

  const fetchWorkspaceActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const res = await apiClient<ActivityItem[]>(`/workspaces/${workspaceId}/activities`);
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
      }
    } catch {
      // Error
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Modals state
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isEditWsOpen, setIsEditWsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isArchivedBoardsOpen, setIsArchivedBoardsOpen] = useState(false);

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Delete & Leave state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [actionError, setActionError] = useState('');

  // Copied invite token
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    try {
      const res = await apiClient<any>(`/workspaces/${workspaceId}`);
      if (res.success && res.data) {
        setWorkspace(res.data);
        setSettingsName(res.data.name || '');
        setSettingsDescription(res.data.description || '');
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!workspace?.isAdmin) return;
    try {
      const res = await apiClient<any[]>(`/workspaces/${workspaceId}/invites`);
      if (res.success && res.data) {
        setPendingInvites(res.data);
      }
    } catch {
      // Ignore if no permission
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  useEffect(() => {
    if (workspace && (workspace.isOwner || workspace.isAdmin)) {
      fetchInvites();
    }
  }, [workspace]);

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchWorkspaceActivities();
    }
  }, [activeTab, workspaceId]);

  // Realtime workspace sync (boards, members, settings)
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase.channel(`workspace-sync:${workspaceId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'BOARD_CREATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (payload?.board) {
          setWorkspace((prev: any) => {
            if (!prev) return prev;
            const exists = (prev.boards || []).some((b: any) => b.id === payload.board.id);
            if (exists) return prev;
            return {
              ...prev,
              boards: [...(prev.boards || []), payload.board],
            };
          });
        } else {
          fetchWorkspace();
        }
      })
      .on('broadcast', { event: 'BOARD_UPDATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (payload?.board) {
          setWorkspace((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              boards: (prev.boards || []).map((b: any) =>
                b.id === payload.board.id ? { ...b, ...payload.board } : b
              ),
            };
          });
        } else {
          fetchWorkspace();
        }
      })
      .on('broadcast', { event: 'BOARD_DELETED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (payload?.boardId) {
          setWorkspace((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              boards: (prev.boards || []).filter((b: any) => b.id !== payload.boardId),
            };
          });
        } else {
          fetchWorkspace();
        }
      })
      .on('broadcast', { event: 'BOARD_ARCHIVED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (payload?.boardId) {
          setWorkspace((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              boards: (prev.boards || []).filter((b: any) => b.id !== payload.boardId),
            };
          });
        }
      })
      .on('broadcast', { event: 'BOARD_RESTORED' }, () => {
        fetchWorkspace();
      })
      .on('broadcast', { event: 'WORKSPACE_UPDATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (payload?.workspace) {
          setWorkspace((prev: any) => ({ ...prev, ...payload.workspace }));
          setSettingsName(payload.workspace.name || '');
          setSettingsDescription(payload.workspace.description || '');
        } else {
          fetchWorkspace();
        }
      })
      .on('broadcast', { event: 'WORKSPACE_MEMBERS_CHANGED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        fetchWorkspace();
        fetchInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, user?.id]);

  const handleUpdateRole = async (targetUserId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      const res = await apiClient(`/workspaces/${workspaceId}/members/${targetUserId}`, {
        method: 'PATCH',
        data: { role: newRole },
      });
      if (res.success) {
        fetchWorkspace();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể thay đổi vai trò thành viên');
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa thành viên "${memberName}" khỏi Workspace này?`)) return;

    try {
      await apiClient(`/workspaces/${workspaceId}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      fetchWorkspace();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa thành viên');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Bạn có chắc muốn thu hồi lời mời này?')) return;

    try {
      await apiClient(`/workspaces/${workspaceId}/invites/${inviteId}`, {
        method: 'DELETE',
      });
      fetchInvites();
    } catch (err: any) {
      alert(err.message || 'Không thể thu hồi lời mời');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) return;

    setIsSavingSettings(true);
    setSettingsMessage('');
    setActionError('');

    try {
      const res = await apiClient(`/workspaces/${workspaceId}`, {
        method: 'PATCH',
        data: {
          name: settingsName.trim(),
          description: settingsDescription.trim(),
        },
      });

      if (res.success) {
        setSettingsMessage('Cập nhật thông tin Workspace thành công!');
        fetchWorkspace();
      }
    } catch (err: any) {
      setActionError(err.message || 'Không thể cập nhật Workspace');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (workspace?.isOwner) {
      const memberCount = workspace?.members?.length || 1;
      if (memberCount > 1) {
        alert('Bạn là Chủ sở hữu của Workspace này. Vui lòng chuyển giao quyền Chủ sở hữu cho thành viên khác trước khi rời đi.');
        setIsTransferOpen(true);
        return;
      } else {
        alert('Bạn là thành viên duy nhất. Vui lòng chọn Xóa Workspace nếu không còn sử dụng.');
        return;
      }
    }

    if (!confirm('Bạn có chắc chắn muốn rời khỏi Không gian làm việc này?')) return;

    setIsLeaving(true);
    try {
      const res = await apiClient(`/workspaces/${workspaceId}/leave`, {
        method: 'POST',
      });
      if (res.success) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Không thể rời Workspace');
      setIsLeaving(false);
    }
  };

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.trim() !== workspace?.name) {
      setActionError('Tên xác nhận không khớp với tên Không gian làm việc');
      return;
    }

    setIsDeleting(true);
    setActionError('');

    try {
      const res = await apiClient(`/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setActionError(err.message || 'Không thể xóa Workspace');
      setIsDeleting(false);
    }
  };

  return (
    <AppShell activeWorkspaceId={workspaceId} onRefresh={fetchWorkspace}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2b1572]/60">
          <Link href="/dashboard" className="hover:text-[#2b1572] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-[#2b1572] font-bold">{workspace?.name || 'Workspace'}</span>
        </div>

        {/* Workspace Hero Header */}
        {isLoading ? (
          <div className="glass-surface h-40 animate-pulse rounded-2xl" />
        ) : workspace ? (
          <div className="glass-surface p-6 sm:p-8 relative overflow-hidden rounded-2xl border border-white/60">
            {/* Background ambient orbs */}
            <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-[#a6d1fd]/25 blur-3xl pointer-events-none" />
            <div className="absolute -right-4 -top-8 w-64 h-64 rounded-full bg-[#a000c8]/15 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] font-bold text-2xl shadow-lg shadow-[#2b1572]/20 shrink-0">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2b1572] tracking-tight">
                      {workspace.name}
                    </h1>
                    {workspace.isOwner ? (
                      <span className="badge-ai text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" />
                        Owner
                      </span>
                    ) : workspace.isAdmin ? (
                      <span className="badge-info text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/70 text-[#2b1572]/70 font-semibold border border-white/80">
                        Thành viên
                      </span>
                    )}
                  </div>

                  {workspace.description && (
                    <p className="text-xs sm:text-sm text-[#2b1572]/75 mt-1.5 max-w-2xl leading-relaxed">
                      {workspace.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#2b1572]/65 mt-3 font-medium">
                    <span>Chủ sở hữu: <strong>{workspace.owner?.name}</strong></span>
                    <span>•</span>
                    <span>{workspace.members?.length || 1} thành viên</span>
                    <span>•</span>
                    <span>{workspace.boards?.length || 0} bảng</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                {workspace.isAdmin && (
                  <>
                    <button
                      onClick={() => setIsInviteOpen(true)}
                      className="px-3.5 py-2 btn-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <UserPlus className="w-4 h-4 text-[#2b1572]" />
                      <span>Mời thành viên</span>
                    </button>
                    <button
                      onClick={() => setIsEditWsOpen(true)}
                      className="px-3.5 py-2 btn-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#2b1572]" />
                      <span>Chỉnh sửa</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsCreateBoardOpen(true)}
                  className="px-4 py-2 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Board mới</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-surface p-10 text-center rounded-2xl">
            <h3 className="text-base font-bold text-[#c40000]">Không tìm thấy Không gian làm việc</h3>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#2b1572]/15 pb-2">
          <button
            onClick={() => setActiveTab('boards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'boards'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md shadow-[#2b1572]/20'
                : 'text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572]'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Bảng công việc ({workspace?.boards?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md shadow-[#2b1572]/20'
                : 'text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Thành viên & Lời mời ({workspace?.members?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md shadow-[#2b1572]/20'
                : 'text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Cài đặt Không gian</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'activities'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md shadow-[#2b1572]/20'
                : 'text-[#2b1572]/70 hover:bg-white/40 hover:text-[#2b1572]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử hoạt động ({activities.length})</span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: BOARDS */}
        {/* ==================================================================== */}
        {activeTab === 'boards' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2b1572]/70">
                Các Bảng Kanban đang hoạt động ({workspace?.boards?.length || 0})
              </span>
              <button
                onClick={() => setIsArchivedBoardsOpen(true)}
                className="px-3 py-1.5 btn-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-amber-800"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Bảng đã lưu trữ</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {workspace?.boards?.map((board: any) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="kanban-card p-5 flex flex-col justify-between group min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="badge-info text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        Kanban Board
                      </span>
                      {board.is_favorite && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <h3 className="font-bold text-[#2b1572] text-base group-hover:text-[#4f91cf] transition-colors line-clamp-1">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-[#2b1572]/70 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2b1572]/10 flex items-center justify-between text-xs text-[#2b1572]/60">
                    <span>{board._count?.lists || 0} danh sách</span>
                    <span className="font-semibold text-[#2b1572] group-hover:translate-x-1 transition-transform">
                      Mở Bảng →
                    </span>
                  </div>
                </Link>
              ))}

              <button
                onClick={() => setIsCreateBoardOpen(true)}
                className="p-6 rounded-2xl bg-white/30 hover:bg-white/60 border-2 border-dashed border-[#a6d1fd] transition-all flex flex-col items-center justify-center gap-2 text-[#2b1572] cursor-pointer min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#a6d1fd]/30 flex items-center justify-center text-[#2b1572]">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Tạo Board mới</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: MEMBERS & INVITATIONS */}
        {/* ==================================================================== */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Members Section */}
            <div className="glass-surface p-6 sm:p-8 rounded-2xl border border-white/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2b1572]/10">
                <div>
                  <h3 className="text-base font-bold text-[#2b1572]">Danh sách thành viên hiện tại</h3>
                  <p className="text-xs text-[#2b1572]/65 mt-0.5">
                    Tất cả người dùng có quyền xem và thao tác trên các bảng trong Workspace này
                  </p>
                </div>

                {workspace?.isAdmin && (
                  <div className="flex items-center gap-2">
                    {workspace?.isOwner && (
                      <button
                        onClick={() => setIsTransferOpen(true)}
                        className="px-3 py-1.5 btn-secondary text-xs font-semibold flex items-center gap-1.5 text-amber-800"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                        <span>Chuyển quyền Owner</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsInviteOpen(true)}
                      className="px-3.5 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Mời thành viên</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Members Table */}
              <div className="divide-y divide-[#2b1572]/10 mt-2">
                {workspace?.members?.map((m: any) => {
                  const isCurrent = user?.id === m.user_id;
                  const isItemOwner = m.role === 'OWNER' || m.user_id === workspace.owner_id;
                  const canManageThisUser =
                    workspace.isOwner || (workspace.isAdmin && !isItemOwner && m.role !== 'ADMIN');

                  return (
                    <div key={m.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#2b1572]/10 border border-white/80 flex items-center justify-center text-[#2b1572] font-bold text-sm shadow-sm shrink-0">
                          {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#2b1572] flex items-center gap-2">
                            <span>{m.user?.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-[#2b1572]/60 font-semibold">(Bạn)</span>
                            )}
                            {isItemOwner ? (
                              <span className="badge-ai text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Chủ sở hữu
                              </span>
                            ) : m.role === 'ADMIN' ? (
                              <span className="badge-info text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Quản trị viên
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 text-[#2b1572]/70 font-semibold border border-white/80">
                                Thành viên
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#2b1572]/60 flex items-center gap-2 mt-0.5">
                            <span>{m.user?.email}</span>
                            {m.joined_at && (
                              <>
                                <span>•</span>
                                <span>Tham gia: {new Date(m.joined_at).toLocaleDateString('vi-VN')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Role selection & actions */}
                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        {canManageThisUser && !isCurrent && !isItemOwner ? (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateRole(m.user_id, e.target.value as any)}
                              className="px-2.5 py-1 text-xs glass-input font-semibold text-[#2b1572] cursor-pointer"
                            >
                              <option value="MEMBER">Thành viên</option>
                              <option value="ADMIN">Quản trị viên</option>
                            </select>

                            <button
                              onClick={() => handleRemoveMember(m.user_id, m.user?.name)}
                              className="p-1.5 text-[#2b1572]/40 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-lg transition-colors cursor-pointer"
                              title="Xóa khỏi Workspace"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Invites Section */}
            {workspace?.isAdmin && (
              <div className="glass-surface p-6 sm:p-8 rounded-2xl border border-white/60">
                <div className="pb-4 border-b border-[#2b1572]/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#2b1572]">Lời mời đang chờ ({pendingInvites.length})</h3>
                    <p className="text-xs text-[#2b1572]/65 mt-0.5">
                      Các liên kết mời đã gửi nhưng người nhận chưa kích hoạt
                    </p>
                  </div>
                </div>

                {pendingInvites.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#2b1572]/60">
                    Không có lời mời nào đang chờ xử lý.
                  </div>
                ) : (
                  <div className="divide-y divide-[#2b1572]/10 mt-2">
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#2b1572] flex items-center gap-2">
                              <span>{inv.email}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 font-semibold border border-white/80">
                                Dự kiến: {inv.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#2b1572]/50 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>Hết hạn: {new Date(inv.expired_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleCopyInviteLink(inv.token)}
                            className="px-2.5 py-1 btn-secondary text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3 h-3 text-[#358200]" />
                                <span className="text-[#358200]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Chép link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="p-1.5 text-[#2b1572]/40 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-lg transition-colors cursor-pointer"
                            title="Thu hồi lời mời"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: SETTINGS */}
        {/* ==================================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* General Settings */}
            <div className="glass-surface p-6 sm:p-8 rounded-2xl border border-white/60">
              <div className="pb-4 border-b border-[#2b1572]/10 mb-6">
                <h3 className="text-base font-bold text-[#2b1572]">Thông tin Không gian làm việc</h3>
                <p className="text-xs text-[#2b1572]/65 mt-0.5">
                  Cập nhật tên gọi và mô tả chi tiết của Workspace
                </p>
              </div>

              {settingsMessage && (
                <div className="mb-4 p-3 rounded-xl bg-[#358200]/10 border border-[#358200]/20 text-[#358200] text-xs font-semibold">
                  {settingsMessage}
                </div>
              )}

              {actionError && (
                <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-medium">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
                    Tên Workspace
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!workspace?.isAdmin}
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input font-bold text-[#2b1572]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#2b1572]/80 mb-1.5">
                    Mô tả Workspace
                  </label>
                  <textarea
                    rows={3}
                    disabled={!workspace?.isAdmin}
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input font-medium text-[#2b1572] resize-none"
                  />
                </div>

                {workspace?.isAdmin && (
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 btn-primary text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Lưu thay đổi</span>
                    )}
                  </button>
                )}
              </form>
            </div>

            {/* Leave Workspace Option */}
            <div className="glass-surface p-6 sm:p-8 rounded-2xl border border-white/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#2b1572] flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-[#2b1572]" />
                    <span>Rời khỏi Không gian làm việc</span>
                  </h3>
                  <p className="text-xs text-[#2b1572]/70 mt-1 max-w-xl leading-relaxed">
                    Bạn sẽ mất quyền truy cập vào các Bảng và Thẻ trong Không gian làm việc này. Nếu bạn là Chủ sở hữu, hãy chuyển giao quyền cho thành viên khác trước khi rời đi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLeaveWorkspace}
                  disabled={isLeaving}
                  className="px-4 py-2.5 rounded-xl border border-[#c40000]/40 text-[#c40000] hover:bg-[#c40000]/10 text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  {isLeaving ? 'Đang rời...' : 'Rời Workspace'}
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Workspace (Owner Only) */}
            {workspace?.isOwner && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#c40000]/5 border border-[#c40000]/30 space-y-4">
                <div className="flex items-center gap-2 text-[#c40000]">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-bold">Vùng nguy hiểm: Xóa Không gian làm việc</h3>
                </div>

                <p className="text-xs text-[#c40000]/80 leading-relaxed max-w-2xl">
                  Hành động này sẽ <strong>xóa vĩnh viễn</strong> Không gian làm việc <strong>{workspace.name}</strong> cùng toàn bộ các Bảng Kanban, Cột danh sách, Thẻ công việc, tệp đính kèm và lịch sử hoạt động. Không thể hoàn tác sau khi đã xóa.
                </p>

                <form onSubmit={handleDeleteWorkspace} className="space-y-3 max-w-md pt-2">
                  <label className="block text-xs font-semibold text-[#c40000]">
                    Nhập chính xác tên Workspace (<span className="font-mono font-bold select-all">{workspace.name}</span>) để xác nhận:
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={workspace.name}
                    className="w-full px-3.5 py-2.5 text-xs glass-input border-[#c40000]/40 text-[#c40000] font-semibold"
                  />

                  <button
                    type="submit"
                    disabled={isDeleting || deleteConfirmText.trim() !== workspace.name}
                    className="px-5 py-2.5 bg-[#c40000] hover:bg-[#a00000] text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-sm flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xóa...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Xác nhận xóa vĩnh viễn</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: ACTIVITIES */}
        {/* ==================================================================== */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            {/* Header / Filter Toolbar Card */}
            <div className="glass-surface p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-sm">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#2b1572]">Lịch sử hoạt động</h3>
                </div>
                <p className="text-xs text-[#2b1572]/70 mt-1">
                  Toàn bộ diễn biến thao tác trong Không gian làm việc, bao gồm Bảng Kanban và Thẻ công việc
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchWorkspaceActivities}
                  disabled={isLoadingActivities}
                  className="px-3 py-1.5 rounded-xl border border-white/60 bg-white/40 hover:bg-white/70 text-[#2b1572] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActivities ? 'animate-spin text-[#2b1572]' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActivityFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activityFilter === 'all'
                    ? 'bg-[#2b1572] text-white shadow-xs'
                    : 'glass-surface text-[#2b1572]/80 hover:bg-white/60'
                }`}
              >
                Tất cả ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('board')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activityFilter === 'board'
                    ? 'bg-[#2b1572] text-white shadow-xs'
                    : 'glass-surface text-[#2b1572]/80 hover:bg-white/60'
                }`}
              >
                Bảng & Cột ({activities.filter((a) => a.target_type.startsWith('board:') || a.action.includes('bảng') || a.action.includes('danh sách')).length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('card')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activityFilter === 'card'
                    ? 'bg-[#2b1572] text-white shadow-xs'
                    : 'glass-surface text-[#2b1572]/80 hover:bg-white/60'
                }`}
              >
                Thẻ công việc ({activities.filter((a) => a.target_type.startsWith('card:')).length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('workspace')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activityFilter === 'workspace'
                    ? 'bg-[#2b1572] text-white shadow-xs'
                    : 'glass-surface text-[#2b1572]/80 hover:bg-white/60'
                }`}
              >
                Thành viên & Cài đặt ({activities.filter((a) => a.target_type.startsWith('workspace:') || a.action.includes('thành viên') || a.action.includes('vai trò')).length})
              </button>
            </div>

            {/* Timeline Activities List */}
            {isLoadingActivities ? (
              <div className="glass-surface p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#2b1572]" />
                <span className="text-xs text-[#2b1572]/70 font-medium">Đang tải dòng thời gian hoạt động...</span>
              </div>
            ) : (() => {
              const filtered = activities.filter((act) => {
                if (activityFilter === 'board') {
                  return act.target_type.startsWith('board:') || act.action.includes('bảng') || act.action.includes('danh sách');
                }
                if (activityFilter === 'card') {
                  return act.target_type.startsWith('card:');
                }
                if (activityFilter === 'workspace') {
                  return act.target_type.startsWith('workspace:') || act.action.includes('thành viên') || act.action.includes('vai trò');
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="glass-surface p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/50 flex items-center justify-center text-[#2b1572]/50 shadow-inner">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#2b1572]">Chưa có hoạt động nào</h4>
                      <p className="text-xs text-[#2b1572]/60 mt-1 max-w-sm">
                        Mọi diễn biến tạo bảng, giao việc thẻ hay thay đổi vai trò thành viên sẽ được ghi nhận tại đây.
                      </p>
                    </div>
                  </div>
                );
              }

              const getActivityIcon = (action: string, targetType: string) => {
                if (action.includes('bình luận')) return <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
                if (action.includes('đính kèm')) return <Paperclip className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                if (action.includes('hoàn thành')) return <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                if (action.includes('hạn chót') || action.includes('ngày')) return <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                if (targetType.startsWith('board:') || action.includes('bảng')) return <Kanban className="w-3.5 h-3.5 text-[#2b1572] shrink-0" />;
                if (targetType.startsWith('workspace:') || action.includes('thành viên')) return <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
                return <Sparkles className="w-3.5 h-3.5 text-[#2b1572] shrink-0" />;
              };

              const formatTime = (ts: string) => {
                try {
                  const diff = Date.now() - new Date(ts).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return 'Vừa xong';
                  if (mins < 60) return `${mins} phút trước`;
                  const hours = Math.floor(mins / 60);
                  if (hours < 24) return `${hours} giờ trước`;
                  const days = Math.floor(hours / 24);
                  if (days < 30) return `${days} ngày trước`;
                  return new Date(ts).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                } catch {
                  return '';
                }
              };

              return (
                <div className="space-y-2.5">
                  {filtered.map((act) => {
                    const actorName = act.user?.name || 'Người dùng';
                    const actorAvatar = act.user?.avatar;
                    const isBoard = act.target_type.startsWith('board:');
                    const isCard = act.target_type.startsWith('card:');
                    const boardId = isBoard ? act.target_type.replace('board:', '') : null;

                    return (
                      <div
                        key={act.id}
                        className="glass-surface p-3.5 sm:p-4 rounded-2xl flex items-start gap-3.5 hover:bg-white/60 transition-all border border-white/60 shadow-2xs group"
                      >
                        {actorAvatar ? (
                          <img
                            src={actorAvatar}
                            alt={actorName}
                            className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 shadow-xs ring-1 ring-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#2b1572] text-[#a6d1fd] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-xs font-bold text-[#2b1572] truncate">
                                {actorName}
                              </span>
                              {isBoard && (
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-[#2b1572]/10 text-[#2b1572]">
                                  Bảng
                                </span>
                              )}
                              {isCard && (
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-blue-50 text-blue-700">
                                  Thẻ
                                </span>
                              )}
                              {act.target_type.startsWith('workspace:') && (
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-purple-50 text-purple-700">
                                  Workspace
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-[#2b1572]/50 shrink-0" title={act.created_at}>
                              {formatTime(act.created_at)}
                            </span>
                          </div>

                          <div className="text-xs text-[#2b1572]/85 flex items-start gap-1.5 leading-relaxed break-words">
                            <span className="mt-0.5 shrink-0">{getActivityIcon(act.action, act.target_type)}</span>
                            <span>{act.action}</span>
                          </div>

                          {boardId && (
                            <div className="mt-2">
                              <Link
                                href={`/boards/${boardId}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2b1572] bg-[#a6d1fd]/30 hover:bg-[#a6d1fd]/50 px-2 py-0.5 rounded-lg transition-colors"
                              >
                                <span>Đi đến Bảng</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* MODALS */}
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        workspaceId={workspaceId}
        workspaces={workspace ? [workspace] : []}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreated={() => fetchWorkspace()}
      />

      <EditWorkspaceModal
        isOpen={isEditWsOpen}
        workspace={workspace}
        onClose={() => setIsEditWsOpen(false)}
        onUpdated={() => fetchWorkspace()}
      />

      <InviteMemberModal
        isOpen={isInviteOpen}
        workspaceId={workspaceId}
        workspaceName={workspace?.name}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => {
          fetchWorkspace();
          fetchInvites();
        }}
      />

      <TransferOwnershipModal
        isOpen={isTransferOpen}
        workspaceId={workspaceId}
        workspaceName={workspace?.name}
        members={workspace?.members || []}
        currentUserId={user?.id || ''}
        onClose={() => setIsTransferOpen(false)}
        onTransferred={() => fetchWorkspace()}
      />

      <ArchivedBoardsModal
        isOpen={isArchivedBoardsOpen}
        workspaceId={workspaceId}
        onClose={() => setIsArchivedBoardsOpen(false)}
        onRestored={() => fetchWorkspace()}
      />
    </AppShell>
  );
}
