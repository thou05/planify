'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import AppShell from '@/components/layout/AppShell';
import CreateListModal from '@/components/modals/CreateListModal';
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
} from 'lucide-react';

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const resolvedParams = use(params);
  const boardId = resolvedParams.boardId;

  const [board, setBoard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);

  // Quick inline add card state for each list: { [listId]: string }
  const [inlineCardTitles, setInlineCardTitles] = useState<Record<string, string>>({});
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);

  const fetchBoard = async () => {
    try {
      const res = await apiClient<any>(`/boards/${boardId}`);
      if (res.success && res.data) {
        setBoard(res.data);
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false);
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
      await apiClient(`/boards/${boardId}`, {
        method: 'PATCH',
        data: { is_favorite: newFav },
      });
    } catch {
      // Revert on error
      setBoard({ ...board, is_favorite: !newFav });
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

  return (
    <AppShell activeWorkspaceId={board?.workspace_id} onRefresh={fetchBoard}>
      <div className="h-full flex flex-col -m-6">
        {/* Board Header (Section 29) */}
        <div className="h-16 px-6 glass-surface !rounded-none !border-x-0 !border-t-0 border-b border-white/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={board?.workspace_id ? `/workspaces/${board.workspace_id}` : '/dashboard'}
              className="p-1.5 rounded-lg hover:bg-white/50 text-[#2b1572]/70 hover:text-[#2b1572] transition-colors cursor-pointer"
              title="Quay lại Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="h-5 w-[1px] bg-[#2b1572]/15" />

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#2b1572]">
                {board?.name || 'Đang tải...'}
              </h1>
              <button
                onClick={handleToggleFavorite}
                className="p-1 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
                title={board?.is_favorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
              >
                <Star
                  className={`w-4 h-4 ${
                    board?.is_favorite
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-[#2b1572]/40 hover:text-amber-500'
                  }`}
                />
              </button>
            </div>

            {board?.workspace?.name && (
              <span className="badge-info text-[11px] px-2.5 py-0.5 rounded-full font-semibold hidden md:inline">
                {board.workspace.name}
              </span>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Members Avatars */}
            <div className="flex items-center -space-x-2">
              {board?.members?.slice(0, 4).map((m: any) => (
                <div
                  key={m.id}
                  className="w-7 h-7 rounded-full bg-[#2b1572] border-2 border-white flex items-center justify-center text-[#a6d1fd] text-[10px] font-bold shadow-xs"
                  title={m.user?.name}
                >
                  {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              ))}
              {board?.members?.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-white/70 border-2 border-white flex items-center justify-center text-[#2b1572] text-[10px] font-bold shadow-xs">
                  +{board.members.length - 4}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCreateListOpen(true)}
              className="px-3 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Danh sách</span>
            </button>
          </div>
        </div>

        {/* Kanban Canvas Area (Section 15) */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          {isLoading ? (
            <div className="flex items-center gap-5 h-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-72 h-96 kanban-list animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-5 h-full select-none">
              {board?.lists?.map((list: any) => {
                const cardCount = list.cards?.length || 0;
                const isOverWip = list.limit && cardCount > list.limit;

                return (
                  <div
                    key={list.id}
                    className="w-72 max-h-full kanban-list flex flex-col shrink-0 p-3"
                  >
                    {/* List Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#2b1572]">{list.title}</h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isOverWip
                              ? 'badge-error'
                              : 'bg-white/60 text-[#2b1572]/70'
                          }`}
                        >
                          {cardCount}
                          {list.limit ? ` / ${list.limit}` : ''}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="p-1 text-[#2b1572]/40 hover:text-[#c40000] hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa danh sách"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                      {list.cards?.length > 0 ? (
                        list.cards.map((card: any) => (
                          <div
                            key={card.id}
                            className="kanban-card p-3.5 cursor-pointer group"
                          >
                            <h4 className="text-xs font-semibold text-[#2b1572] leading-snug">
                              {card.title}
                            </h4>

                            {card.description && (
                              <p className="text-[11px] text-[#2b1572]/60 mt-1 line-clamp-2">
                                {card.description}
                              </p>
                            )}

                            {/* Card Badges footer */}
                            <div className="mt-2.5 flex items-center gap-3 text-[11px] text-[#2b1572]/50">
                              {card.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(card.due_date).toLocaleDateString()}</span>
                                </span>
                              )}
                              {card.checklists?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3" />
                                  <span>Checklist</span>
                                </span>
                              )}
                              {card._count?.comments > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{card._count.comments}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-[11px] text-[#2b1572]/40 bg-white/15 rounded-xl border border-dashed border-white/30">
                          Chưa có thẻ nào trong cột
                        </div>
                      )}
                    </div>

                    {/* Bottom Add Card Button */}
                    <div className="mt-2 pt-2 border-t border-white/30">
                      <button
                        onClick={() => alert('Chức năng thêm và kéo thả thẻ Kanban đầy đủ sẽ được hoàn thiện trong Giai đoạn 3 (Kanban & Cards)!')}
                        className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-[#2b1572]/70 hover:text-[#2b1572] hover:bg-white/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm thẻ</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add New List Button Column */}
              <button
                onClick={() => setIsCreateListOpen(true)}
                className="w-72 p-4 kanban-list flex items-center justify-center gap-2 text-xs font-bold text-[#2b1572]/80 hover:text-[#2b1572] hover:bg-white/50 transition-all cursor-pointer shrink-0 border-dashed"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Danh sách khác</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <CreateListModal
        isOpen={isCreateListOpen}
        boardId={boardId}
        onClose={() => setIsCreateListOpen(false)}
        onCreated={() => fetchBoard()}
      />
    </AppShell>
  );
}
