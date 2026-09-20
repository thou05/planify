'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/layout/AppShell';
import CreateListModal from '@/components/modals/CreateListModal';
import EditBoardModal from '@/components/modals/EditBoardModal';
import ShareBoardModal from '@/components/modals/ShareBoardModal';
import CopyBoardModal from '@/components/modals/CopyBoardModal';
import {
  Kanban,
  Star,
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Users,
  Sparkles,
  Share2,
  Lock,
  Globe,
  Archive,
  RotateCcw,
  Copy,
  Edit3,
  LogOut,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const resolvedParams = use(params);
  const boardId = resolvedParams.boardId;
  const router = useRouter();
  const { user } = useAuth();

  const [board, setBoard] = useState<any>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [userWorkspaces, setUserWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);

  // Quick inline add card state
  const [inlineCardTitles, setInlineCardTitles] = useState<Record<string, string>>({});
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);

  const fetchBoard = async () => {
    try {
      const res = await apiClient<any>(`/boards/${boardId}`);
      if (res.success && res.data) {
        setBoard(res.data);
        if (res.data.workspace_id) {
          fetchWorkspaceData(res.data.workspace_id);
        }
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkspaceData = async (workspaceId: string) => {
    try {
      const [wsRes, allWsRes] = await Promise.all([
        apiClient<any>(`/workspaces/${workspaceId}`),
        apiClient<any[]>(`/workspaces`),
      ]);

      if (wsRes.success && wsRes.data) {
        setWorkspaceMembers(wsRes.data.members || []);
      }
      if (allWsRes.success && allWsRes.data) {
        setUserWorkspaces(allWsRes.data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const handleToggleFavorite = async () => {
    if (!board) return;
    const newFav = !board.is_favorite;
    setBoard({ ...board, is_favorite: newFav });

    try {
      await apiClient(`/boards/${boardId}/favorite`, {
        method: 'POST',
      });
    } catch {
      setBoard({ ...board, is_favorite: !newFav });
    }
  };

  const handleArchiveBoard = async () => {
    if (!confirm('Bạn có chắc muốn lưu trữ Bảng này? Bảng sẽ chuyển sang chế độ Chỉ xem (Read-only) và ẩn khỏi danh sách chính.')) {
      return;
    }

    try {
      const res = await apiClient(`/boards/${boardId}/archive`, {
        method: 'POST',
      });
      if (res.success) {
        setIsBoardMenuOpen(false);
        fetchBoard();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể lưu trữ Bảng');
    }
  };

  const handleRestoreBoard = async () => {
    try {
      const res = await apiClient(`/boards/${boardId}/restore`, {
        method: 'POST',
      });
      if (res.success) {
        fetchBoard();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể khôi phục Bảng');
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm(`Bạn có CHẮC CHẮN muốn xóa vĩnh viễn Bảng "${board?.name}" cùng toàn bộ thẻ công việc? Hành động này KHÔNG thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await apiClient(`/boards/${boardId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        router.push(board?.workspace_id ? `/workspaces/${board.workspace_id}` : '/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa Bảng');
    }
  };

  const handleLeaveBoard = async () => {
    if (!confirm('Bạn có chắc muốn rời khỏi Bảng này?')) return;

    try {
      const res = await apiClient(`/boards/${boardId}/leave`, {
        method: 'POST',
      });
      if (res.success) {
        router.push(board?.workspace_id ? `/workspaces/${board.workspace_id}` : '/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Không thể rời Bảng');
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Bạn có chắc muốn xóa danh sách này cùng các thẻ bên trong?')) return;

    try {
      await apiClient(`/lists/${listId}`, {
        method: 'DELETE',
      });
      fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa danh sách');
    }
  };

  const handleQuickAddCard = async (listId: string) => {
    const title = inlineCardTitles[listId]?.trim();
    if (!title) return;

    try {
      await apiClient('/cards', {
        method: 'POST',
        data: {
          list_id: listId,
          title,
        },
      });
      setInlineCardTitles((prev) => ({ ...prev, [listId]: '' }));
      setAddingCardListId(null);
      fetchBoard();
    } catch {
      // Fallback
      alert('Chức năng tạo thẻ nhanh sẽ được cập nhật đồng bộ.');
    }
  };

  return (
    <AppShell activeWorkspaceId={board?.workspace_id} onRefresh={fetchBoard}>
      <div className="h-full flex flex-col -m-6 relative">
        {/* Archived Banner Warning */}
        {board?.is_archived && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between gap-4 z-20 text-amber-900 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bảng này đang ở trạng thái <strong>Lưu trữ (Archived)</strong>. Các tính năng chỉnh sửa bị vô hiệu hóa.
              </span>
            </div>

            {board.canDelete && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRestoreBoard}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục Bảng</span>
                </button>
                <button
                  onClick={handleDeleteBoard}
                  className="px-3 py-1 bg-[#c40000] hover:bg-[#a00000] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa vĩnh viễn</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Board Header (Section 29) */}
        <div className="h-16 px-6 glass-surface !rounded-none !border-x-0 !border-t-0 border-b border-white/40 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={board?.workspace_id ? `/workspaces/${board.workspace_id}` : '/dashboard'}
              className="p-1.5 rounded-lg hover:bg-white/50 text-[#2b1572]/70 hover:text-[#2b1572] transition-colors cursor-pointer"
              title="Quay lại Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="h-5 w-[1px] bg-[#2b1572]/15" />

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#2b1572] tracking-tight truncate">
                {board?.name || 'Đang tải Bảng...'}
              </h1>

              {/* Favorite Star Button */}
              <button
                onClick={handleToggleFavorite}
                className="p-1.5 rounded-lg hover:bg-white/50 transition-all cursor-pointer text-[#2b1572]/50 hover:text-amber-500"
                title={board?.is_favorite ? 'Bỏ gắn sao' : 'Gắn sao yêu thích'}
              >
                <Star
                  className={`w-4 h-4 transition-transform active:scale-125 ${
                    board?.is_favorite ? 'text-amber-500 fill-amber-500' : ''
                  }`}
                />
              </button>

              {/* Visibility Badge */}
              {board?.visibility === 'PRIVATE' ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-[#2b1572] border border-white/80">
                  <Lock className="w-3 h-3" />
                  <span>Riêng tư</span>
                </span>
              ) : board?.visibility === 'PUBLIC' ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-[#2b1572] border border-white/80">
                  <Globe className="w-3 h-3" />
                  <span>Công khai</span>
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-[#2b1572] border border-white/80">
                  <Users className="w-3 h-3" />
                  <span>Workspace</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Member Avatar Stack */}
            <div
              onClick={() => setIsShareOpen(true)}
              className="flex items-center -space-x-2 hover:opacity-80 transition-opacity cursor-pointer mr-1"
              title="Xem và quản lý thành viên"
            >
              {(board?.members || []).slice(0, 4).map((m: any, idx: number) => (
                <div
                  key={m.id || idx}
                  className="w-7 h-7 rounded-full bg-[#2b1572] text-[#a6d1fd] border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-xs"
                >
                  {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              ))}
              {(board?.members?.length || 0) > 4 && (
                <div className="w-7 h-7 rounded-full bg-white/90 text-[#2b1572] border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  +{board.members.length - 4}
                </div>
              )}
            </div>

            {/* Share Button */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="px-3 py-1.5 btn-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-[#2b1572]" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>

            {/* Board Settings & Options Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsBoardMenuOpen(!isBoardMenuOpen)}
                className="p-2 rounded-xl hover:bg-white/60 text-[#2b1572]/70 hover:text-[#2b1572] transition-colors cursor-pointer border border-transparent hover:border-white/50"
                title="Tùy chọn Bảng"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isBoardMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 p-1.5 glass-strong z-50 shadow-xl border border-white/70 space-y-1 text-xs select-none">
                  {board?.canEdit && !board?.is_archived && (
                    <button
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        setIsEditOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa thông tin Bảng</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsBoardMenuOpen(false);
                      setIsCopyOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Nhân bản Bảng (Copy)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsBoardMenuOpen(false);
                      setIsShareOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Quản lý thành viên & Quyền</span>
                  </button>

                  {board?.canDelete && (
                    <>
                      <div className="h-[1px] bg-[#2b1572]/10 my-1" />
                      {board.is_archived ? (
                        <button
                          onClick={() => {
                            setIsBoardMenuOpen(false);
                            handleRestoreBoard();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg font-semibold text-amber-700 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Khôi phục Bảng</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleArchiveBoard}
                          className="w-full text-left px-3 py-2 rounded-lg font-semibold text-amber-700 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-600" />
                          <span>Lưu trữ Bảng (Archive)</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          handleDeleteBoard();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#c40000] hover:bg-[#c40000]/10 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#c40000]" />
                        <span>Xóa Bảng vĩnh viễn</span>
                      </button>
                    </>
                  )}

                  {!board?.canDelete && (
                    <>
                      <div className="h-[1px] bg-[#2b1572]/10 my-1" />
                      <button
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          handleLeaveBoard();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#c40000] hover:bg-[#c40000]/10 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#c40000]" />
                        <span>Rời khỏi Bảng</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban Board Horizontal Scroll Container (Section 15) */}
        <div className="flex-1 overflow-x-auto p-6 flex items-start gap-4 select-none">
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-72 h-96 glass-weak animate-pulse rounded-2xl shrink-0" />
              ))}
            </div>
          ) : (
            <>
              {board?.lists?.map((list: any) => {
                const isOverLimit = list.limit && (list.cards?.length || 0) >= list.limit;

                return (
                  <div key={list.id} className="kanban-list flex flex-col max-h-full">
                    {/* List Header */}
                    <div className="p-3.5 flex items-center justify-between border-b border-white/30 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#2b1572] text-sm tracking-tight">
                          {list.title}
                        </h3>
                        <span className="text-[11px] font-bold text-[#2b1572]/60 px-2 py-0.5 rounded-full bg-white/50 border border-white/60">
                          {list.cards?.length || 0}
                          {list.limit ? ` / ${list.limit}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isOverLimit && (
                          <span className="badge-danger text-[10px] px-1.5 py-0.5 rounded font-bold" title="Đã đạt giới hạn WIP Limit">
                            WIP Max
                          </span>
                        )}
                        {!board?.is_archived && board?.canEdit && (
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            className="p-1 rounded hover:bg-white/40 text-[#2b1572]/40 hover:text-[#c40000] transition-colors cursor-pointer"
                            title="Xóa cột"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div className="p-3 flex-1 overflow-y-auto space-y-3">
                      {list.cards?.map((card: any) => (
                        <div
                          key={card.id}
                          className="kanban-card p-3.5 space-y-2.5 cursor-grab active:cursor-grabbing group transition-all"
                        >
                          {/* Labels */}
                          {card.card_labels && card.card_labels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {card.card_labels.map((cl: any, idx: number) => {
                                const lbl = cl.label || cl;
                                return (
                                  <span
                                    key={lbl.id || idx}
                                    style={{ backgroundColor: `${lbl.color}20`, color: lbl.color }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-current"
                                  >
                                    {lbl.name}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Title */}
                          <h4 className="text-xs font-bold text-[#2b1572] leading-snug group-hover:text-[#4f91cf] transition-colors">
                            {card.title}
                          </h4>

                          {/* Description preview */}
                          {card.description && (
                            <p className="text-[11px] text-[#2b1572]/70 line-clamp-2 leading-relaxed">
                              {card.description}
                            </p>
                          )}

                          {/* Card Footer Badges */}
                          <div className="pt-2 border-t border-[#2b1572]/10 flex items-center justify-between text-[11px] text-[#2b1572]/60">
                            <div className="flex items-center gap-3">
                              {card.due_date && (
                                <span
                                  className={`flex items-center gap-1 font-semibold ${
                                    card.is_due_date_completed
                                      ? 'text-[#358200]'
                                      : new Date(card.due_date) < new Date()
                                      ? 'text-[#c40000]'
                                      : ''
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(card.due_date).toLocaleDateString('vi-VN')}</span>
                                </span>
                              )}

                              {card.checklists && card.checklists.length > 0 && (
                                <span className="flex items-center gap-1 font-semibold">
                                  <CheckSquare className="w-3 h-3" />
                                  <span>
                                    {card.checklists.reduce(
                                      (acc: number, cl: any) =>
                                        acc + (cl.items?.filter((i: any) => i.is_completed).length || 0),
                                      0
                                    )}
                                    /
                                    {card.checklists.reduce(
                                      (acc: number, cl: any) => acc + (cl.items?.length || 0),
                                      0
                                    )}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Inline Add Card */}
                      {!board?.is_archived && board?.canEdit && (
                        addingCardListId === list.id ? (
                          <div className="p-2.5 rounded-xl bg-white/60 border border-white/70 space-y-2">
                            <textarea
                              rows={2}
                              autoFocus
                              value={inlineCardTitles[list.id] || ''}
                              onChange={(e) =>
                                setInlineCardTitles((prev) => ({
                                  ...prev,
                                  [list.id]: e.target.value,
                                }))
                              }
                              placeholder="Nhập tiêu đề thẻ công việc..."
                              className="w-full text-xs glass-input p-2 font-medium text-[#2b1572] resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setAddingCardListId(null)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#2b1572]/70 hover:text-[#2b1572]"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => handleQuickAddCard(list.id)}
                                className="px-3 py-1 btn-primary text-xs font-semibold"
                              >
                                Thêm thẻ
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingCardListId(list.id)}
                            className="w-full py-2 px-3 rounded-xl hover:bg-white/50 text-[#2b1572]/70 hover:text-[#2b1572] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm thẻ mới</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add List Column Button */}
              {!board?.is_archived && board?.canEdit && (
                <button
                  onClick={() => setIsCreateListOpen(true)}
                  className="w-72 h-14 shrink-0 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 transition-all flex items-center justify-center gap-2 text-xs font-bold text-[#2b1572] cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm danh sách cột mới</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      <CreateListModal
        isOpen={isCreateListOpen}
        boardId={boardId}
        onClose={() => setIsCreateListOpen(false)}
        onCreated={() => fetchBoard()}
      />

      <ShareBoardModal
        isOpen={isShareOpen}
        board={board}
        workspaceMembers={workspaceMembers}
        currentUserId={user?.id}
        onClose={() => setIsShareOpen(false)}
        onUpdated={() => fetchBoard()}
      />

      <EditBoardModal
        isOpen={isEditOpen}
        board={board}
        onClose={() => setIsEditOpen(false)}
        onUpdated={() => fetchBoard()}
      />

      <CopyBoardModal
        isOpen={isCopyOpen}
        board={board}
        workspaces={userWorkspaces}
        onClose={() => setIsCopyOpen(false)}
      />
    </AppShell>
  );
}
