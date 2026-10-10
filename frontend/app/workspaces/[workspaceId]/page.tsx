'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useShell } from '@/components/layout/ShellContext';
import CreateBoardModal from '@/components/modals/CreateBoardModal';
import EditWorkspaceModal from '@/components/modals/EditWorkspaceModal';
import InviteMemberModal from '@/components/modals/InviteMemberModal';
import TransferOwnershipModal from '@/components/modals/TransferOwnershipModal';
import ArchivedBoardsModal from '@/components/modals/ArchivedBoardsModal';
import ImportBoardModal from '@/components/modals/ImportBoardModal';
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
  Upload,
  UserCheck,
  Info,
  HelpCircle,
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
  const shell = useShell();

  useEffect(() => {
    if (shell?.registerRefreshHandler) {
      return shell.registerRefreshHandler(fetchWorkspace);
    }
  }, [shell, workspaceId]);

  const [workspace, setWorkspace] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'boards' | 'members' | 'settings' | 'activities'>('boards');

  // Sub-tabs in Member Management
  const [memberSubTab, setMemberSubTab] = useState<'members' | 'single_guests' | 'multi_guests' | 'invites'>('members');
  const [actionGuestId, setActionGuestId] = useState<string | null>(null);

  // Workspace Activities State
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'board' | 'card' | 'workspace'>('all');

  const fetchWorkspaceActivities = async () => {
    try {
      setIsLoadingActivities(true);
      setActivitiesPage(1);
      const res = await apiClient<ActivityItem[]>(`/workspaces/${workspaceId}/activities?limit=15&page=1`);
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
        setHasMoreActivities(res.data.length >= 15);
      } else {
        setActivities([]);
        setHasMoreActivities(false);
      }
    } catch (err: any) {
      if (err?.message?.includes('quyền') || err?.message?.includes('xóa')) {
        setAccessDenied('Bạn đã bị xóa hoặc không có quyền truy cập hoạt động của Không gian làm việc này.');
      }
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handleLoadMoreActivities = async () => {
    if (isLoadingMoreActivities || !hasMoreActivities) return;
    try {
      setIsLoadingMoreActivities(true);
      const nextPage = activitiesPage + 1;
      const res = await apiClient<ActivityItem[]>(`/workspaces/${workspaceId}/activities?limit=15&page=${nextPage}`);
      if (res.success && Array.isArray(res.data)) {
        setActivities((prev) => [...prev, ...res.data]);
        setActivitiesPage(nextPage);
        setHasMoreActivities(res.data.length >= 15);
      } else {
        setHasMoreActivities(false);
      }
    } catch (err: any) {
      if (err?.message?.includes('quyền') || err?.message?.includes('xóa')) {
        setAccessDenied('Bạn đã bị xóa hoặc không có quyền truy cập hoạt động của Không gian làm việc này.');
      }
    } finally {
      setIsLoadingMoreActivities(false);
    }
  };

  // Modals state
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isImportBoardOpen, setIsImportBoardOpen] = useState(false);
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
        setAccessDenied(null);
        setSettingsName(res.data.name || '');
        setSettingsDescription(res.data.description || '');
        shell?.setCurrentWorkspaceId(workspaceId);
      } else {
        setAccessDenied(res.message || 'Không tìm thấy hoặc bạn không có quyền truy cập vào Không gian làm việc này.');
      }
    } catch (err: any) {
      setAccessDenied(err?.message || 'Bạn không có quyền truy cập vào Không gian làm việc này hoặc đã bị xóa.');
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
    setWorkspace(null);
    setIsLoading(true);
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

  const handleConvertGuest = async (guestUserId: string, role: string = 'MEMBER') => {
    try {
      setActionGuestId(guestUserId);
      const res = await apiClient(`/workspaces/${workspaceId}/guests/${guestUserId}/convert`, {
        method: 'POST',
        data: { role },
      });
      if (res.success) {
        await fetchWorkspace();
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể chuyển đổi khách thành thành viên');
    } finally {
      setActionGuestId(null);
    }
  };

  const handleRemoveGuest = async (guestUserId: string, guestName?: string) => {
    const confirmMsg = `Bạn có chắc chắn muốn xóa khách "${guestName || 'này'}" khỏi toàn bộ các Bảng trong Không gian làm việc không?`;
    if (!confirm(confirmMsg)) return;

    try {
      setActionGuestId(guestUserId);
      const res = await apiClient(`/workspaces/${workspaceId}/guests/${guestUserId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await fetchWorkspace();
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa khách');
    } finally {
      setActionGuestId(null);
    }
  };

  const handleUpdateBoardGuestRole = async (boardId: string, guestUserId: string, newRole: string) => {
    try {
      setActionGuestId(guestUserId);
      const res = await apiClient(`/boards/${boardId}/members/${guestUserId}`, {
        method: 'PATCH',
        data: { role: newRole },
      });
      if (res.success) {
        await fetchWorkspace();
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể thay đổi vai trò trong Bảng');
    } finally {
      setActionGuestId(null);
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

  if ((accessDenied || (!workspace && !isLoading))) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 sm:p-10 rounded-lg border border-slate-200 shadow-sm space-y-5">
          <div className="w-12 h-12 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">
              Không thể truy cập Không gian làm việc
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {accessDenied || 'Bạn hiện không phải là thành viên hoặc đã bị xóa khỏi Không gian làm việc này.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold rounded-md flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay về Bảng điều khiển</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-800 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{workspace?.name || 'Workspace'}</span>
        </div>

        {/* Workspace Hero Header */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 h-36 animate-pulse rounded-xl shadow-xs" />
        ) : workspace ? (
          <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-[#f28d8d] flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-xs">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {workspace.name}
                    </h1>
                    {workspace.isOwner ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-[#ffc0cb]/30 text-[#d86969] border border-[#ffc0cb]/70 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        Owner
                      </span>
                    ) : workspace.isAdmin ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-sky-600" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Thành viên
                      </span>
                    )}
                  </div>

                  {workspace.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {workspace.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-2.5 font-normal">
                    <span>Chủ sở hữu: <strong className="text-slate-700">{workspace.owner?.name}</strong></span>
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
                      className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                      <span>Mời thành viên</span>
                    </button>
                    <button
                      onClick={() => setIsEditWsOpen(true)}
                      className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Chỉnh sửa</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsCreateBoardOpen(true)}
                  className="px-3.5 py-1.5 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Board mới</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 text-center rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-rose-600">Không tìm thấy Không gian làm việc</h3>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('boards')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
              activeTab === 'boards'
                ? 'bg-[#f28d8d] text-white border-[#d86969] shadow-2xs font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Bảng công việc ({workspace?.boards?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
              activeTab === 'members'
                ? 'bg-[#f28d8d] text-white border-[#d86969] shadow-2xs font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              Thành viên & Khách ({(workspace?.members?.length || 0) + (workspace?.guestCount || 0)})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
              activeTab === 'settings'
                ? 'bg-[#f28d8d] text-white border-[#d86969] shadow-2xs font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài đặt Không gian</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
              activeTab === 'activities'
                ? 'bg-[#f28d8d] text-white border-[#d86969] shadow-2xs font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử hoạt động ({activities.length})</span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: BOARDS */}
        {/* ==================================================================== */}
        {activeTab === 'boards' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Các Bảng Kanban đang hoạt động ({workspace?.boards?.length || 0})
              </span>
              <button
                onClick={() => setIsArchivedBoardsOpen(true)}
                className="px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Bảng đã lưu trữ</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {workspace?.boards?.map((board: any) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="p-4.5 rounded-xl border border-slate-200/90 hover:border-[#f28d8d] bg-white shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group min-h-[130px] hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-semibold bg-[#ffc0cb]/30 text-[#d86969] border border-[#ffc0cb]/70">
                        Kanban Board
                      </span>
                      {board.is_favorite && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm group-hover:text-[#f28d8d] transition-colors line-clamp-1">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{board._count?.lists || 0} danh sách</span>
                    <span className="font-semibold text-slate-700 group-hover:text-[#f28d8d] group-hover:translate-x-0.5 transition-transform">
                      Mở Bảng →
                    </span>
                  </div>
                </Link>
              ))}

              <button
                onClick={() => setIsCreateBoardOpen(true)}
                className="p-5 rounded-xl bg-white hover:bg-[#ffc0cb]/20 border border-dashed border-slate-300 hover:border-[#f28d8d] transition-colors flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-[#d86969] cursor-pointer min-h-[130px] shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-md bg-[#ffc0cb]/30 flex items-center justify-center text-[#f28d8d] group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">Tạo Board mới</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: MEMBERS & GUESTS */}
        {/* ==================================================================== */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Sub-tab navigation */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-md bg-slate-100 border border-slate-200">
              <button
                onClick={() => setMemberSubTab('members')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
                  memberSubTab === 'members'
                    ? 'bg-white text-slate-900 border-slate-300 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Thành viên Không gian ({workspace?.members?.length || 0})</span>
              </button>

              <button
                onClick={() => setMemberSubTab('single_guests')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
                  memberSubTab === 'single_guests'
                    ? 'bg-white text-amber-900 border-amber-300 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Khách 1 bảng ({workspace?.singleBoardGuestsCount || 0})</span>
              </button>

              <button
                onClick={() => setMemberSubTab('multi_guests')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
                  memberSubTab === 'multi_guests'
                    ? 'bg-white text-purple-900 border-purple-300 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Khách đa bảng ({workspace?.multiBoardGuestsCount || 0})</span>
              </button>

              {workspace?.isAdmin && (
                <button
                  onClick={() => setMemberSubTab('invites')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
                    memberSubTab === 'invites'
                      ? 'bg-white text-slate-900 border-slate-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Lời mời chờ ({pendingInvites.length})</span>
                </button>
              )}
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 1: WORKSPACE MEMBERS */}
            {/* ------------------------------------------------------------------ */}
            {memberSubTab === 'members' && (
              <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Danh sách thành viên chính thức</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thành viên có quyền xem và truy cập tất cả các Bảng thuộc Không gian làm việc này
                    </p>
                  </div>

                  {workspace?.isAdmin && (
                    <div className="flex items-center gap-2">
                      {workspace?.isOwner && (
                        <button
                          onClick={() => setIsTransferOpen(true)}
                          className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-amber-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-600" />
                          <span>Chuyển quyền Owner</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsInviteOpen(true)}
                        className="px-3 py-1.5 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Mời thành viên</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Members Table */}
                <div className="divide-y divide-slate-100 mt-1">
                  {workspace?.members?.map((m: any) => {
                    const isCurrent = user?.id === m.user_id;
                    const isItemOwner = m.role === 'OWNER' || m.user_id === workspace.owner_id;
                    const canManageThisUser =
                      workspace.isOwner || (workspace.isAdmin && !isItemOwner && m.role !== 'ADMIN');

                    return (
                      <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                              <span>{m.user?.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] text-slate-400 font-normal">(Bạn)</span>
                              )}
                              {isItemOwner ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  Chủ sở hữu
                                </span>
                              ) : m.role === 'ADMIN' ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Quản trị viên
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Thành viên
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
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
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {canManageThisUser && !isCurrent && !isItemOwner ? (
                            <>
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m.user_id, e.target.value as any)}
                                className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer focus:outline-none focus:border-slate-400"
                              >
                                <option value="MEMBER">Thành viên</option>
                                <option value="ADMIN">Quản trị viên</option>
                              </select>

                              <button
                                onClick={() => handleRemoveMember(m.user_id, m.user?.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 2: SINGLE-BOARD GUESTS */}
            {/* ------------------------------------------------------------------ */}
            {memberSubTab === 'single_guests' && (
              <div className="space-y-4">
                <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 space-y-4">
                  <div className="pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-xs bg-amber-50 text-amber-700 border border-amber-200">
                        <Kanban className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Khách một bảng ({workspace?.singleBoardGuestsCount || 0})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Người dùng bên ngoài chỉ tham gia vào duy nhất đúng 1 Bảng trong Không gian làm việc này
                    </p>
                  </div>

                  {/* Single Guests Table */}
                  {(() => {
                    const singleGuests: any[] = workspace?.singleBoardGuests || (workspace?.guests || []).filter((g: any) => g.guestType === 'SINGLE_BOARD');

                    if (singleGuests.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                          <p className="font-semibold text-sm text-slate-800">Không có khách một bảng nào</p>
                          <p>Hiện tại không có người dùng bên ngoài nào chỉ tham gia 1 bảng trong Không gian này.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-slate-100">
                        {singleGuests.map((g: any) => {
                          const isProcessing = actionGuestId === g.user_id;

                          return (
                            <div
                              key={g.id}
                              className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs shrink-0">
                                  {g.user?.name?.charAt(0).toUpperCase() || 'K'}
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-900 truncate">
                                      {g.user?.name}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                      <Kanban className="w-3 h-3" />
                                      Khách 1 bảng
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-500">
                                    {g.user?.email}
                                  </div>

                                  {/* List of boards guest is in */}
                                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] text-slate-400 font-medium">Bảng tham gia:</span>
                                    {g.boards?.map((b: any) => (
                                      <Link
                                        key={b.id}
                                        href={`/boards/${b.id}`}
                                        className="px-2 py-0.5 rounded-xs bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors"
                                        title="Mở bảng"
                                      >
                                        <Kanban className="w-3 h-3 text-slate-500" />
                                        <span>{b.name}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded-xs bg-slate-200 text-slate-700 font-semibold">
                                          {b.role === 'ADMIN' ? 'Admin' : b.role === 'VIEWER' ? 'Chỉ xem' : 'Thành viên'}
                                        </span>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Guest Actions (Admin only) */}
                              {workspace?.isAdmin && (
                                <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                                  {/* Change Role in Board */}
                                  {g.boards?.length > 0 && (
                                    <select
                                      value={g.boards[0]?.role === 'MEMBER' ? 'EDITOR' : g.boards[0]?.role || 'EDITOR'}
                                      disabled={isProcessing}
                                      onChange={(e) => handleUpdateBoardGuestRole(g.boards[0]?.id, g.user_id, e.target.value)}
                                      className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer focus:outline-none focus:border-slate-400"
                                      title="Thay đổi quyền của khách trong Bảng"
                                    >
                                      <option value="EDITOR">Thành viên (Chỉnh sửa)</option>
                                      <option value="ADMIN">Quản trị viên Bảng</option>
                                      <option value="VIEWER">Chỉ xem</option>
                                    </select>
                                  )}

                                  <button
                                    onClick={() => handleConvertGuest(g.user_id, 'MEMBER')}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-emerald-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                                    title="Nâng cấp khách thành Thành viên chính thức của Workspace"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                    <span>Thêm vào Workspace</span>
                                  </button>

                                  <button
                                    onClick={() => handleRemoveGuest(g.user_id, g.user?.name)}
                                    disabled={isProcessing}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                    title="Xóa khách khỏi Bảng trong Không gian làm việc"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 3: MULTI-BOARD GUESTS */}
            {/* ------------------------------------------------------------------ */}
            {memberSubTab === 'multi_guests' && (
              <div className="space-y-4">
                <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200 space-y-4">
                  <div className="pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-xs bg-purple-50 text-purple-700 border border-purple-200">
                        <Layers className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Khách đa bảng ({workspace?.multiBoardGuestsCount || 0})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Người dùng bên ngoài được mời tham gia vào từ 2 Bảng trở lên trong Không gian làm việc này
                    </p>
                  </div>

                  {/* Multi Guests Table */}
                  {(() => {
                    const multiGuests: any[] = workspace?.multiBoardGuests || (workspace?.guests || []).filter((g: any) => g.guestType === 'MULTI_BOARD');

                    if (multiGuests.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                          <p className="font-semibold text-sm text-slate-800">Không có khách đa bảng nào</p>
                          <p>Hiện tại không có người dùng bên ngoài nào tham gia từ 2 bảng trở lên trong Không gian này.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-slate-100">
                        {multiGuests.map((g: any) => {
                          const isProcessing = actionGuestId === g.user_id;

                          return (
                            <div
                              key={g.id}
                              className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-800 font-bold text-xs shrink-0">
                                  {g.user?.name?.charAt(0).toUpperCase() || 'K'}
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-900 truncate">
                                      {g.user?.name}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                      <Layers className="w-3 h-3" />
                                      Khách đa bảng ({g.boardCount} bảng)
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-500">
                                    {g.user?.email}
                                  </div>

                                  {/* List of boards guest is in with role changer */}
                                  <div className="pt-1 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] text-slate-400 font-medium">Bảng tham gia:</span>
                                    {g.boards?.map((b: any) => (
                                      <div
                                        key={b.id}
                                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-slate-50 border border-slate-200 transition-colors"
                                      >
                                        <Link
                                          href={`/boards/${b.id}`}
                                          className="text-[11px] font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1"
                                          title="Mở bảng"
                                        >
                                          <Kanban className="w-3 h-3 text-slate-400" />
                                          <span>{b.name}</span>
                                        </Link>

                                        {workspace?.isAdmin ? (
                                          <select
                                            value={b.role === 'MEMBER' ? 'EDITOR' : b.role || 'EDITOR'}
                                            disabled={isProcessing}
                                            onChange={(e) => handleUpdateBoardGuestRole(b.id, g.user_id, e.target.value)}
                                            className="text-[10px] font-medium bg-white border border-slate-200 rounded px-1 py-0.5 cursor-pointer text-slate-700"
                                            title="Thay đổi quyền trong Bảng này"
                                          >
                                            <option value="EDITOR">Thành viên</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="VIEWER">Chỉ xem</option>
                                          </select>
                                        ) : (
                                          <span className="text-[9px] px-1 py-0.2 rounded-xs bg-slate-200 text-slate-700 font-semibold">
                                            {b.role === 'ADMIN' ? 'Admin' : b.role === 'VIEWER' ? 'Chỉ xem' : 'Thành viên'}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Guest Actions (Admin only) */}
                              {workspace?.isAdmin && (
                                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                  <button
                                    onClick={() => handleConvertGuest(g.user_id, 'MEMBER')}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-emerald-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                                    title="Nâng cấp khách thành Thành viên chính thức của Workspace"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                    <span>Thêm vào Workspace</span>
                                  </button>

                                  <button
                                    onClick={() => handleRemoveGuest(g.user_id, g.user?.name)}
                                    disabled={isProcessing}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                    title="Xóa khách khỏi toàn bộ các Bảng trong Không gian làm việc"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 4: PENDING INVITATIONS */}
            {/* ------------------------------------------------------------------ */}
            {memberSubTab === 'invites' && workspace?.isAdmin && (
              <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200">
                <div className="pb-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Lời mời đang chờ ({pendingInvites.length})</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Các liên kết mời đã gửi nhưng người nhận chưa kích hoạt
                    </p>
                  </div>
                </div>

                {pendingInvites.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Không có lời mời nào đang chờ xử lý.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 mt-1">
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                              <span>{inv.email}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-slate-100 font-medium text-slate-600 border border-slate-200">
                                Dự kiến: {inv.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>Hết hạn: {new Date(inv.expired_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleCopyInviteLink(inv.token)}
                            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Đã chép</span>
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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
          <div className="space-y-4">
            {/* General Settings */}
            <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200">
              <div className="pb-3.5 border-b border-slate-100 mb-5">
                <h3 className="text-sm font-bold text-slate-900">Thông tin Không gian làm việc</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật tên gọi và mô tả chi tiết của Workspace
                </p>
              </div>

              {settingsMessage && (
                <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {settingsMessage}
                </div>
              )}

              {actionError && (
                <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-3.5 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Workspace
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!workspace?.isAdmin}
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả Workspace
                  </label>
                  <textarea
                    rows={3}
                    disabled={!workspace?.isAdmin}
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md font-normal text-slate-800 resize-none focus:outline-none focus:border-slate-400"
                  />
                </div>

                {workspace?.isAdmin && (
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-4 py-2 bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
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
            <div className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-slate-600" />
                    <span>Rời khỏi Không gian làm việc</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                    Bạn sẽ mất quyền truy cập vào các Bảng và Thẻ trong Không gian làm việc này. Nếu bạn là Chủ sở hữu, hãy chuyển giao quyền cho thành viên khác trước khi rời đi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLeaveWorkspace}
                  disabled={isLeaving}
                  className="px-3.5 py-1.5 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  {isLeaving ? 'Đang rời...' : 'Rời Workspace'}
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Workspace (Owner Only) */}
            {workspace?.isOwner && (
              <div className="p-5 sm:p-6 rounded-lg bg-rose-50/50 border border-rose-200 space-y-3.5">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <h3 className="text-sm font-bold">Vùng nguy hiểm: Xóa Không gian làm việc</h3>
                </div>

                <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">
                  Hành động này sẽ <strong>xóa vĩnh viễn</strong> Không gian làm việc <strong>{workspace.name}</strong> cùng toàn bộ các Bảng Kanban, Cột danh sách, Thẻ công việc, tệp đính kèm và lịch sử hoạt động. Không thể hoàn tác sau khi đã xóa.
                </p>

                <form onSubmit={handleDeleteWorkspace} className="space-y-3 max-w-md pt-1">
                  <label className="block text-xs font-medium text-rose-800">
                    Nhập chính xác tên Workspace (<span className="font-mono font-bold select-all">{workspace.name}</span>) để xác nhận:
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={workspace.name}
                    className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-md text-rose-900 font-medium focus:outline-none focus:border-rose-500"
                  />

                  <button
                    type="submit"
                    disabled={isDeleting || deleteConfirmText.trim() !== workspace.name}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-2"
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
          <div className="space-y-4">
            {/* Header / Filter Toolbar Card */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#87ceeb] flex items-center justify-center text-slate-900 shadow-2xs">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Lịch sử hoạt động</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Toàn bộ diễn biến thao tác trong Không gian làm việc, bao gồm Bảng Kanban và Thẻ công việc
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchWorkspaceActivities}
                  disabled={isLoadingActivities}
                  className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActivities ? 'animate-spin text-[#f28d8d]' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActivityFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                  activityFilter === 'all'
                    ? 'bg-[#87ceeb] text-slate-900 border-[#72bde0] shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tất cả ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('board')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                  activityFilter === 'board'
                    ? 'bg-[#87ceeb] text-slate-900 border-[#72bde0] shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Bảng & Cột ({activities.filter((a) => a.target_type.startsWith('board:') || a.action.includes('bảng') || a.action.includes('danh sách')).length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('card')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                  activityFilter === 'card'
                    ? 'bg-[#87ceeb] text-slate-900 border-[#72bde0] shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Thẻ công việc ({activities.filter((a) => a.target_type.startsWith('card:')).length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('workspace')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                  activityFilter === 'workspace'
                    ? 'bg-[#87ceeb] text-slate-900 border-[#72bde0] shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Thành viên & Cài đặt ({activities.filter((a) => a.target_type.startsWith('workspace:') || a.action.includes('thành viên') || a.action.includes('vai trò')).length})
              </button>
            </div>

            {/* Timeline Activities List */}
            {isLoadingActivities ? (
              <div className="bg-white p-12 text-center rounded-lg border border-slate-200 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
                <span className="text-xs text-slate-500 font-medium">Đang tải dòng thời gian hoạt động...</span>
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
                  <div className="bg-white p-12 text-center rounded-lg border border-slate-200 flex flex-col items-center justify-center gap-2.5">
                    <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Chưa có hoạt động nào</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
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
                if (targetType.startsWith('board:') || action.includes('bảng')) return <Kanban className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
                if (targetType.startsWith('workspace:') || action.includes('thành viên')) return <Users className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
                return <Sparkles className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
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

              const handleActivityClick = (act: ActivityItem) => {
                if (act.target_type.startsWith('card:')) {
                  const cardId = act.target_meta?.card_id || act.target_type.replace('card:', '');
                  const boardId = act.target_meta?.board_id;
                  if (boardId) {
                    router.push(`/boards/${boardId}?cardId=${cardId}`);
                  }
                } else if (act.target_type.startsWith('board:')) {
                  const boardId = act.target_meta?.board_id || act.target_type.replace('board:', '');
                  router.push(`/boards/${boardId}`);
                } else if (act.target_type.startsWith('workspace:') || act.workspace_id) {
                  if (act.action.includes('thành viên') || act.action.includes('vai trò') || act.action.includes('lời mời')) {
                    setActiveTab('members');
                  } else if (act.action.includes('cài đặt') || act.action.includes('tên') || act.action.includes('mô tả')) {
                    setActiveTab('settings');
                  } else {
                    setActiveTab('boards');
                  }
                }
              };

              return (
                <div className="space-y-2">
                  {filtered.map((act) => {
                    const actorName = act.user?.name || 'Người dùng';
                    const actorAvatar = act.user?.avatar;
                    const isBoard = act.target_type.startsWith('board:');
                    const isCard = act.target_type.startsWith('card:');
                    const boardId = act.target_meta?.board_id || (isBoard ? act.target_type.replace('board:', '') : null);
                    const cardId = act.target_meta?.card_id || (isCard ? act.target_type.replace('card:', '') : null);

                    return (
                      <div
                        key={act.id}
                        onClick={() => handleActivityClick(act)}
                        className="bg-white p-3.5 rounded-md border border-slate-200 hover:border-slate-300 flex items-start gap-3 transition-colors group cursor-pointer"
                      >
                        {actorAvatar ? (
                          <img
                            src={actorAvatar}
                            alt={actorName}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {actorName}
                              </span>
                              {isBoard && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-xs bg-slate-100 text-slate-700 border border-slate-200">
                                  Bảng{act.target_meta?.board_name ? `: ${act.target_meta.board_name}` : ''}
                                </span>
                              )}
                              {isCard && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-xs bg-blue-50 text-blue-700 border border-blue-200">
                                  Thẻ{act.target_meta?.board_name ? ` • ${act.target_meta.board_name}` : ''}
                                </span>
                              )}
                              {act.target_type.startsWith('workspace:') && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-xs bg-purple-50 text-purple-700 border border-purple-200">
                                  Workspace
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-400 shrink-0" title={act.created_at}>
                              {formatTime(act.created_at)}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 flex items-start gap-1.5 leading-relaxed break-words">
                            <span className="mt-0.5 shrink-0">{getActivityIcon(act.action, act.target_type)}</span>
                            <span>{act.action}</span>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            {isCard && boardId && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-xs transition-colors border border-slate-200">
                                <span>Xem chi tiết thẻ</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                            {isBoard && boardId && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-xs transition-colors border border-slate-200">
                                <span>Đi đến Bảng</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                            {act.target_type.startsWith('workspace:') && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-xs transition-colors border border-purple-200">
                                <span>Xem chi tiết</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {hasMoreActivities && (
                    <div className="pt-2 flex justify-center">
                      <button
                        onClick={handleLoadMoreActivities}
                        disabled={isLoadingMoreActivities}
                        className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingMoreActivities && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isLoadingMoreActivities ? 'Đang tải thêm...' : 'Tải thêm hoạt động cũ hơn'}</span>
                      </button>
                    </div>
                  )}

                  {!hasMoreActivities && activities.length > 0 && (
                    <div className="py-2 text-center text-[11px] text-slate-400 font-medium">
                      Đã hiển thị tất cả hoạt động
                    </div>
                  )}
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
        onOpenImport={() => setIsImportBoardOpen(true)}
      />

      <ImportBoardModal
        isOpen={isImportBoardOpen}
        workspaceId={workspaceId}
        onClose={() => setIsImportBoardOpen(false)}
        onSuccess={(newBoardId) => {
          if (newBoardId) {
            router.push(`/boards/${newBoardId}`);
          } else {
            fetchWorkspace();
          }
        }}
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
    </>
  );
}
