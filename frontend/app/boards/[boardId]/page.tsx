'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import AppShell from '@/components/layout/AppShell';
import ListColumn from '@/components/board/ListColumn';
import CreateListModal from '@/components/modals/CreateListModal';
import CardDetailModal from '@/components/modals/CardDetailModal';
import CopyListModal from '@/components/modals/CopyListModal';
import MoveListModal from '@/components/modals/MoveListModal';
import MoveCardsModal from '@/components/modals/MoveCardsModal';
import MoveCardModal from '@/components/modals/MoveCardModal';
import CopyCardModal from '@/components/modals/CopyCardModal';
import {
  Star,
  Plus,
  ArrowLeft,
  X,
} from 'lucide-react';

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const resolvedParams = use(params);
  const boardId = resolvedParams.boardId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [board, setBoard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);

  // Sub-modals state
  const [copyingList, setCopyingList] = useState<any>(null);
  const [movingList, setMovingList] = useState<any>(null);
  const [movingCardsList, setMovingCardsList] = useState<any>(null);
  const [movingCard, setMovingCard] = useState<any>(null);
  const [copyingCard, setCopyingCard] = useState<any>(null);

  // Inline Add List state at the end of Kanban board
  const [isAddingListInline, setIsAddingListInline] = useState(false);
  const [inlineListTitle, setInlineListTitle] = useState('');
  const [isSubmittingList, setIsSubmittingList] = useState(false);
  const addListInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop refs
  const draggedCardRef = useRef<{ cardId: string; sourceListId: string } | null>(null);
  const draggedListIdRef = useRef<string | null>(null);

  const fetchBoard = async () => {
    try {
      const res = await apiClient<any>(`/boards/${boardId}`);
      if (res.success && res.data) {
        setBoard(res.data);
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  // Deep linking: check URL query for ?cardId=...
  useEffect(() => {
    const cardIdParam = searchParams.get('cardId');
    if (cardIdParam) {
      setSelectedCardId(cardIdParam);
      setIsCardDetailOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAddingListInline) {
      addListInputRef.current?.focus();
    }
  }, [isAddingListInline]);

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
      setBoard({ ...board, is_favorite: !newFav });
    }
  };

  // 1. LIST ACTIONS
  const handleCreateInlineList = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inlineListTitle.trim();
    if (!trimmed || isSubmittingList) return;

    try {
      setIsSubmittingList(true);
      await apiClient(`/boards/${boardId}/lists`, {
        method: 'POST',
        data: { title: trimmed },
      });
      setInlineListTitle('');
      setIsAddingListInline(false);
      await fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Không thể tạo danh sách');
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleRenameList = async (listId: string, newTitle: string) => {
    try {
      await apiClient(`/lists/${listId}`, {
        method: 'PATCH',
        data: { title: newTitle },
      });
      await fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Không thể đổi tên danh sách');
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh sách này cùng tất cả các thẻ bên trong?')) {
      return;
    }

    try {
      await apiClient(`/lists/${listId}`, { method: 'DELETE' });
      await fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa danh sách');
    }
  };

  const handleSortCards = async (
    listId: string,
    sortBy: 'due_date' | 'title' | 'created_at',
    order: 'asc' | 'desc' = 'asc'
  ) => {
    try {
      await apiClient(`/lists/${listId}/sort-cards`, {
        method: 'POST',
        data: { sortBy, order },
      });
      await fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Không thể sắp xếp thẻ');
    }
  };

  // 2. CARD ACTIONS
  const handleQuickAddCard = async (listId: string, title: string) => {
    const tempId = `temp-${Date.now()}`;
    const targetList = board?.lists?.find((l: any) => l.id === listId);
    const newPos = targetList?.cards?.length || 0;

    const optimisticCard = {
      id: tempId,
      list_id: listId,
      title: title.trim(),
      description: null,
      position: newPos,
      status: 'TODO',
      due_date: null,
      is_due_date_completed: false,
      checklists: [],
      card_labels: [],
      comments: [],
      card_assignees: [],
    };

    // 1. Cập nhật giao diện tức thời (0ms)
    setBoard((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        lists: prev.lists.map((list: any) => {
          if (list.id === listId) {
            return {
              ...list,
              cards: [...(list.cards || []), optimisticCard],
            };
          }
          return list;
        }),
      };
    });

    // 2. Gọi API ngầm trong nền
    try {
      const res = await apiClient<any>(`/lists/${listId}/cards`, {
        method: 'POST',
        data: { title: title.trim(), position: newPos },
      });

      if (res.success && res.data) {
        const realCard = res.data;
        setBoard((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            lists: prev.lists.map((list: any) => {
              if (list.id === listId) {
                return {
                  ...list,
                  cards: (list.cards || []).map((c: any) =>
                    c.id === tempId ? realCard : c
                  ),
                };
              }
              return list;
            }),
          };
        });
      }
    } catch (err: any) {
      // Revert nếu có lỗi
      setBoard((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((list: any) => {
            if (list.id === listId) {
              return {
                ...list,
                cards: (list.cards || []).filter((c: any) => c.id !== tempId),
              };
            }
            return list;
          }),
        };
      });
      alert(err.message || 'Không thể tạo thẻ mới');
    }
  };

  const handleQuickEditCardTitle = async (cardId: string, newTitle: string) => {
    // Optimistic title update
    setBoard((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        lists: prev.lists.map((list: any) => ({
          ...list,
          cards: (list.cards || []).map((c: any) =>
            c.id === cardId ? { ...c, title: newTitle } : c
          ),
        })),
      };
    });

    try {
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: { title: newTitle },
      });
    } catch (err: any) {
      await fetchBoard();
      alert(err.message || 'Không thể sửa tên thẻ');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thẻ này?')) return;
    try {
      await apiClient(`/cards/${cardId}`, { method: 'DELETE' });
      await fetchBoard();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa thẻ');
    }
  };

  const handleOpenCardDetail = (cardId: string) => {
    setSelectedCardId(cardId);
    setIsCardDetailOpen(true);
  };

  const handleCloseCardDetail = () => {
    setIsCardDetailOpen(false);
    setSelectedCardId(null);
    if (searchParams.get('cardId')) {
      router.replace(`/boards/${boardId}`);
    }
  };

  // 3. LIST DRAG & DROP HANDLERS
  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    if (draggedCardRef.current) return;
    draggedListIdRef.current = listId;
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'list', listId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleListDragEnd = () => {
    draggedListIdRef.current = null;
  };

  const handleListDrop = async (e: React.DragEvent, targetListId: string) => {
    const sourceListId = draggedListIdRef.current;
    if (!sourceListId || sourceListId === targetListId) return;

    draggedListIdRef.current = null;

    const currentLists = [...(board?.lists || [])];
    const sourceIndex = currentLists.findIndex((l) => l.id === sourceListId);
    const targetIndex = currentLists.findIndex((l) => l.id === targetListId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Optimistic reorder
    const [movedList] = currentLists.splice(sourceIndex, 1);
    currentLists.splice(targetIndex, 0, movedList);

    setBoard((prev: any) => ({
      ...prev,
      lists: currentLists,
    }));

    try {
      const listIds = currentLists.map((l) => l.id);
      await apiClient(`/boards/${boardId}/lists/reorder`, {
        method: 'PATCH',
        data: { listIds },
      });
    } catch {
      await fetchBoard();
    }
  };

  // 4. CARD DRAG & DROP HANDLERS (Both inside same list and across lists)
  const handleCardDragStart = (
    e: React.DragEvent,
    cardId: string,
    sourceListId: string
  ) => {
    e.stopPropagation();
    draggedCardRef.current = { cardId, sourceListId };
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'card', cardId, sourceListId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragEnd = () => {
    draggedCardRef.current = null;
  };

  const handleCardDrop = async (
    e: React.DragEvent,
    targetListId: string,
    targetPosition?: number
  ) => {
    const data = draggedCardRef.current;
    if (!data) return;

    const { cardId, sourceListId } = data;
    draggedCardRef.current = null;

    const targetList = board?.lists?.find((l: any) => l.id === targetListId);
    if (!targetList) return;

    const finalTargetPosition =
      typeof targetPosition === 'number'
        ? targetPosition
        : targetList.cards?.length || 0;

    // Optimistic UI update for manual sorting
    setBoard((prev: any) => {
      if (!prev) return prev;
      let movedCard: any = null;

      const newLists = prev.lists.map((list: any) => {
        if (list.id === sourceListId) {
          const newCards = [...(list.cards || [])].filter((c: any) => {
            if (c.id === cardId) {
              movedCard = { ...c, list_id: targetListId };
              return false;
            }
            return true;
          });
          return { ...list, cards: newCards };
        }
        return { ...list, cards: [...(list.cards || [])] };
      });

      if (!movedCard) return prev;

      const targetListIndex = newLists.findIndex((l: any) => l.id === targetListId);
      if (targetListIndex === -1) return prev;

      const targetCards = newLists[targetListIndex].cards;
      const insertIndex = Math.min(Math.max(0, finalTargetPosition), targetCards.length);
      targetCards.splice(insertIndex, 0, movedCard);

      return {
        ...prev,
        lists: newLists,
      };
    });

    try {
      await apiClient(`/cards/${cardId}/move`, {
        method: 'PATCH',
        data: {
          targetListId,
          position: finalTargetPosition,
        },
      });
      await fetchBoard();
    } catch {
      await fetchBoard();
    }
  };

  return (
    <AppShell activeWorkspaceId={board?.workspace_id} onRefresh={fetchBoard}>
      <div className="h-full flex flex-col -m-6">
        {/* Board Top Navigation Bar */}
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
            {/* Board Members */}
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
              onClick={() => setIsCreateListModalOpen(true)}
              className="px-3 py-1.5 btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Danh sách</span>
            </button>
          </div>
        </div>

        {/* Kanban Board Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          {isLoading ? (
            <div className="flex items-center gap-5 h-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-72 h-96 kanban-list animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-5 h-full select-none">
              {/* Render List Columns */}
              {board?.lists?.map((list: any) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  boardLists={board.lists}
                  onOpenCardDetail={handleOpenCardDetail}
                  onRefreshBoard={fetchBoard}
                  onRenameList={handleRenameList}
                  onDeleteList={handleDeleteList}
                  onCopyListRequest={(l) => setCopyingList(l)}
                  onMoveListRequest={(l) => setMovingList(l)}
                  onMoveAllCardsRequest={(l) => setMovingCardsList(l)}
                  onSortCards={handleSortCards}
                  onQuickAddCard={handleQuickAddCard}
                  onQuickEditCardTitle={handleQuickEditCardTitle}
                  onMoveCardRequest={(c) => setMovingCard(c)}
                  onCopyCardRequest={(c) => setCopyingCard(c)}
                  onDeleteCard={handleDeleteCard}
                  onCardDragStart={handleCardDragStart}
                  onCardDragEnd={handleCardDragEnd}
                  onCardDrop={handleCardDrop}
                  onListDragStart={handleListDragStart}
                  onListDragEnd={handleListDragEnd}
                  onListDrop={handleListDrop}
                />
              ))}

              {/* Add New List Column at End */}
              <div className="w-72 shrink-0">
                {isAddingListInline ? (
                  <form
                    onSubmit={handleCreateInlineList}
                    className="p-3.5 kanban-list bg-white/80 border border-white/60 shadow-md space-y-2.5 animate-in fade-in duration-100"
                  >
                    <input
                      ref={addListInputRef}
                      type="text"
                      value={inlineListTitle}
                      onChange={(e) => setInlineListTitle(e.target.value)}
                      placeholder="Nhập tên danh sách mới..."
                      className="w-full text-xs font-semibold text-[#2b1572] bg-white border border-[#2b1572]/30 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/20"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!inlineListTitle.trim() || isSubmittingList}
                        className="px-3.5 py-1.5 bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        {isSubmittingList ? 'Đang thêm...' : 'Thêm danh sách'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingListInline(false);
                          setInlineListTitle('');
                        }}
                        className="p-1.5 text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
                        title="Hủy"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingListInline(true)}
                    className="w-full p-4 kanban-list flex items-center justify-center gap-2 text-xs font-bold text-[#2b1572]/80 hover:text-[#2b1572] hover:bg-white/50 transition-all cursor-pointer border-dashed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Danh sách khác</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Create List Modal */}
      <CreateListModal
        isOpen={isCreateListModalOpen}
        boardId={boardId}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreated={() => fetchBoard()}
      />

      {/* 2. Card Detail Modal */}
      <CardDetailModal
        cardId={selectedCardId}
        isOpen={isCardDetailOpen}
        onClose={handleCloseCardDetail}
        onCardUpdated={() => fetchBoard()}
        onMoveRequest={(c) => setMovingCard(c)}
        onCopyRequest={(c) => setCopyingCard(c)}
      />

      {/* 3. Copy List Modal */}
      <CopyListModal
        list={copyingList}
        isOpen={!!copyingList}
        onClose={() => setCopyingList(null)}
        onCopied={() => fetchBoard()}
      />

      {/* 4. Move List Modal */}
      <MoveListModal
        list={movingList}
        boardId={boardId}
        boardLists={board?.lists || []}
        isOpen={!!movingList}
        onClose={() => setMovingList(null)}
        onMoved={() => fetchBoard()}
      />

      {/* 5. Move All Cards Modal */}
      <MoveCardsModal
        sourceList={movingCardsList}
        boardLists={board?.lists || []}
        isOpen={!!movingCardsList}
        onClose={() => setMovingCardsList(null)}
        onMoved={() => fetchBoard()}
      />

      {/* 6. Move Single Card Modal */}
      <MoveCardModal
        card={movingCard}
        boardLists={board?.lists || []}
        isOpen={!!movingCard}
        onClose={() => setMovingCard(null)}
        onMoved={() => fetchBoard()}
      />

      {/* 7. Copy Single Card Modal */}
      <CopyCardModal
        card={copyingCard}
        boardLists={board?.lists || []}
        isOpen={!!copyingCard}
        onClose={() => setCopyingCard(null)}
        onCopied={() => fetchBoard()}
      />
    </AppShell>
  );
}
