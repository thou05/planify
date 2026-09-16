'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/layout/AppShell';
import CreateBoardModal from '@/components/modals/CreateBoardModal';
import {
  Layers,
  Kanban,
  Users,
  Plus,
  Star,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  ArrowLeft,
  Mail,
} from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  // Add member form state
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');

  const fetchWorkspace = async () => {
    try {
      const res = await apiClient<any>(`/workspaces/${workspaceId}`);
      if (res.success && res.data) {
        setWorkspace(res.data);
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    setAddMemberError('');
    setAddMemberSuccess('');
    setAddMemberLoading(true);

    try {
      const res = await apiClient(`/workspaces/${workspaceId}/members`, {
        data: {
          email: memberEmail.trim(),
          role: memberRole,
        },
      });

      if (res.success) {
        setAddMemberSuccess('Đã thêm thành viên thành công!');
        setMemberEmail('');
        fetchWorkspace();
      }
    } catch (err: any) {
      setAddMemberError(err.message || 'Không thể thêm thành viên');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi Workspace?')) return;

    try {
      await apiClient(`/workspaces/${workspaceId}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      fetchWorkspace();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa thành viên');
    }
  };

  return (
    <AppShell activeWorkspaceId={workspaceId} onRefresh={fetchWorkspace}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2b1572]/60">
          <Link href="/dashboard" className="hover:text-[#2b1572] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-[#2b1572]">{workspace?.name || 'Workspace'}</span>
        </div>

        {/* Workspace Header */}
        {isLoading ? (
          <div className="glass-surface h-36 animate-pulse rounded-2xl" />
        ) : workspace ? (
          <div className="glass-surface p-6 sm:p-8 relative overflow-hidden rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] font-bold text-xl shadow-md shrink-0">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-extrabold text-[#2b1572]">{workspace.name}</h1>
                    <span className="badge-info text-xs px-2.5 py-0.5 rounded-full font-semibold">
                      Workspace
                    </span>
                  </div>
                  {workspace.description && (
                    <p className="text-xs text-[#2b1572]/70 mt-1 max-w-2xl">
                      {workspace.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[#2b1572]/60 mt-3 font-medium">
                    <span>Chủ sở hữu: <strong>{workspace.owner?.name}</strong></span>
                    <span>•</span>
                    <span>{workspace.members?.length || 1} thành viên</span>
                    <span>•</span>
                    <span>{workspace.boards?.length || 0} bảng</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
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
          <div className="glass-surface p-8 text-center rounded-2xl">
            <h3 className="text-base font-bold text-[#c40000]">Không tìm thấy Workspace</h3>
          </div>
        )}

        {/* Boards Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Kanban className="w-5 h-5 text-[#2b1572]" />
              <h2 className="text-lg font-bold text-[#2b1572]">Các Bảng (Boards)</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {workspace?.boards?.map((board: any) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="kanban-card p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="badge-info text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Kanban
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

        {/* Workspace Members Management Section */}
        <div className="glass-surface p-6 sm:p-8 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2b1572]/10">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2b1572]" />
                <h2 className="text-lg font-bold text-[#2b1572]">Thành viên Workspace</h2>
              </div>
              <p className="text-xs text-[#2b1572]/60 mt-0.5">
                Quản lý các thành viên có quyền truy cập vào không gian làm việc này
              </p>
            </div>
          </div>

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="my-6 p-4 rounded-xl bg-white/40 border border-white/60">
            <div className="text-xs font-bold text-[#2b1572] mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#2b1572]" />
              <span>Mời hoặc thêm thành viên mới</span>
            </div>

            {addMemberError && (
              <div className="mb-3 p-2.5 rounded-lg bg-[#c40000]/10 text-[#c40000] text-xs font-medium">
                {addMemberError}
              </div>
            )}

            {addMemberSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-[#358200]/10 text-[#358200] text-xs font-medium">
                {addMemberSuccess}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2b1572]/40" />
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Nhập email thành viên cần thêm..."
                  className="w-full pl-9 pr-3 py-2 text-xs glass-input font-medium"
                />
              </div>

              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as any)}
                className="px-3 py-2 text-xs glass-input font-medium w-full sm:w-36"
              >
                <option value="MEMBER">Thành viên (Member)</option>
                <option value="ADMIN">Quản trị (Admin)</option>
              </select>

              <button
                type="submit"
                disabled={addMemberLoading}
                className="px-4 py-2 btn-primary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {addMemberLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Thêm</span>
              </button>
            </div>
          </form>

          {/* Members Table / List */}
          <div className="divide-y divide-[#2b1572]/10">
            {workspace?.members?.map((m: any) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2b1572]/10 border border-white/80 flex items-center justify-center text-[#2b1572] font-bold text-xs shadow-sm">
                    {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#2b1572] flex items-center gap-2">
                      <span>{m.user?.name}</span>
                      {m.role === 'OWNER' ? (
                        <span className="badge-ai text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Owner
                        </span>
                      ) : m.role === 'ADMIN' ? (
                        <span className="badge-info text-[10px] px-2 py-0.5 rounded-full font-bold">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 text-[#2b1572]/70 font-semibold border border-white/80">
                          Member
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#2b1572]/60">{m.user?.email}</div>
                  </div>
                </div>

                {m.role !== 'OWNER' && user?.id !== m.user_id && (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="p-2 text-[#2b1572]/40 hover:text-[#c40000] hover:bg-[#c40000]/10 rounded-lg transition-colors cursor-pointer"
                    title="Xóa thành viên"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        workspaceId={workspaceId}
        workspaces={workspace ? [workspace] : []}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreated={() => fetchWorkspace()}
      />
    </AppShell>
  );
}
