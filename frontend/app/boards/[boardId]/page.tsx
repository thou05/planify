'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/layout/AppShell';
import ListColumn from '@/components/board/ListColumn';
import CreateListModal from '@/components/modals/CreateListModal';
import EditBoardModal from '@/components/modals/EditBoardModal';
import ShareBoardModal from '@/components/modals/ShareBoardModal';
import CopyBoardModal from '@/components/modals/CopyBoardModal';
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
  MoreHorizontal,
  Trash2,
  Users,
  Share2,
  Lock,
  Globe,
  Archive,
  RotateCcw,
  Copy,
  Edit3,
  LogOut,
  X,
  History,
  RefreshCw,
  Clock,
  CheckSquare,
  Paperclip,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { ActivityItem } from '@/components/modals/MyActivityModal';

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const resolvedParams = use(params);
  const boardId = resolvedParams.boardId;
  const searchParams = useSearchParams();
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);

  // Board Activity Drawer State
  const [isBoardActivityOpen, setIsBoardActivityOpen] = useState(false);
  const [boardActivities, setBoardActivities] = useState<ActivityItem[]>([]);
  const [isLoadingBoardActivities, setIsLoadingBoardActivities] = useState(false);
  const [boardActivityFilter, setBoardActivityFilter] = useState<'all' | 'board' | 'card'>('all');

  const fetchBoardActivities = async () => {
    try {
      setIsLoadingBoardActivities(true);
      const res = await apiClient<ActivityItem[]>(`/boards/${boardId}/activities`);
      if (res.success && Array.isArray(res.data)) {
        setBoardActivities(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBoardActivities(false);
    }
  };

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

  // Drag and Drop refs & state
  const draggedCardRef = useRef<{ cardId: string; sourceListId: string } | null>(null);
  const draggedListIdRef = useRef<string | null>(null);
  const [draggedSourceListId, setDraggedSourceListId] = useState<string | null>(null);

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
      // Handle error
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
        const members = [...(wsRes.data.members || [])];
        if (wsRes.data.owner && !members.some((m: any) => (m.user?.id || m.user_id) === wsRes.data.owner_id)) {
          members.unshift({
            id: wsRes.data.owner.id,
            user_id: wsRes.data.owner.id,
            role: 'OWNER',
            user: wsRes.data.owner,
          });
        }
        setWorkspaceMembers(members);
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
      await apiClient(`/boards/${boardId}/favorite`, {
        method: 'POST',
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

  const handleArchiveBoard = async () => {
    if (
      !confirm(
        'Bạn có chắc muốn lưu trữ Bảng này? Bảng sẽ chuyển sang chế độ Chỉ xem (Read-only) và ẩn khỏi danh sách chính.'
      )
    ) {
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
    if (
      !confirm(
        `Bạn có CHẮC CHẮN muốn xóa vĩnh viễn Bảng "${board?.name}" cùng toàn bộ thẻ công việc? Hành động này KHÔNG thể hoàn tác.`
      )
    ) {
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
    const targetList = board?.lists?.find((l: any) => l.id === listId);
    if (targetList?.limit && (targetList.cards?.length || 0) >= targetList.limit) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
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
      console.error('Không thể tạo thẻ:', err);
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
      console.error('Lỗi cập nhật tên thẻ:', err);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thẻ này?')) return;
    try {
      await apiClient(`/cards/${cardId}`, { method: 'DELETE' });
      await fetchBoard();
    } catch (err: any) {
      console.error('Lỗi xóa thẻ:', err);
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
    setDraggedSourceListId(sourceListId);
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'card', cardId, sourceListId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragEnd = () => {
    draggedCardRef.current = null;
    setDraggedSourceListId(null);
  };

  const handleCardDrop = async (
    e: React.DragEvent,
    targetListId: string,
    targetPosition?: number
  ) => {
    const data = draggedCardRef.current;
    draggedCardRef.current = null;
    setDraggedSourceListId(null);
    if (!data) return;

    const { cardId, sourceListId } = data;

    const targetList = board?.lists?.find((l: any) => l.id === targetListId);
    if (!targetList) return;

    const isSameList = sourceListId === targetListId;

    // Disallow moving cards from other lists if target list reached its WIP limit
    if (!isSameList && targetList.limit && (targetList.cards?.length || 0) >= targetList.limit) {
      return;
    }

    let finalTargetPosition: number;

    if (typeof targetPosition === 'number') {
      if (isSameList) {
        const sourceIndex = targetList.cards?.findIndex((c: any) => c.id === cardId) ?? -1;
        if (sourceIndex !== -1 && sourceIndex < targetPosition) {
          finalTargetPosition = Math.max(0, targetPosition - 1);
        } else {
          finalTargetPosition = targetPosition;
        }
      } else {
        finalTargetPosition = targetPosition;
      }
    } else {
      finalTargetPosition = targetList.cards?.length || 0;
    }

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
    } catch {
      await fetchBoard();
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

        {/* Board Top Navigation Bar */}
        <div className="h-16 px-6 glass-surface !rounded-none !border-x-0 !border-t-0 border-b border-white/40 flex items-center justify-between shrink-0 select-none">
          {/* Left: Back button & Board Name & Badges */}
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
                  className={`w-4 h-4 transition-transform active:scale-125 ${board?.is_favorite ? 'text-amber-500 fill-amber-500' : ''
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

            {/* Board Activity Button */}
            <button
              onClick={() => {
                setIsBoardActivityOpen(true);
                fetchBoardActivities();
              }}
              className="px-3 py-1.5 btn-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Xem lịch sử hoạt động của bảng"
            >
              <History className="w-3.5 h-3.5 text-[#2b1572]" />
              <span className="hidden sm:inline">Hoạt động</span>
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
                  <button
                    onClick={() => {
                      setIsBoardMenuOpen(false);
                      setIsBoardActivityOpen(true);
                      fetchBoardActivities();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Lịch sử hoạt động Bảng</span>
                  </button>

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

        {/* Kanban Board Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-72 h-96 glass-weak animate-pulse rounded-2xl shrink-0" />
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
                  draggedSourceListId={draggedSourceListId}
                />
              ))}

              {/* Add New List Column at End */}
              {!board?.is_archived && board?.canEdit && (
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Create List Modal */}
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

      {/* 2. Card Detail Modal */}
      <CardDetailModal
        cardId={selectedCardId}
        isOpen={isCardDetailOpen}
        onClose={handleCloseCardDetail}
        onCardUpdated={() => fetchBoard()}
        onMoveRequest={(c) => setMovingCard(c)}
        onCopyRequest={(c) => setCopyingCard(c)}
        onSelectCard={(cId) => setSelectedCardId(cId)}
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

      {/* 8. Board Activity Slide-Over Drawer */}
      {isBoardActivityOpen && (
        <div className="fixed inset-0 z-60 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsBoardActivityOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-sm">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2b1572]">Hoạt động Bảng</h3>
                    <p className="text-[11px] text-slate-400">
                      Lịch sử thao tác trên bảng và các thẻ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchBoardActivities}
                    disabled={isLoadingBoardActivities}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#2b1572] hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Làm mới"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingBoardActivities ? 'animate-spin text-[#2b1572]' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsBoardActivityOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setBoardActivityFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${boardActivityFilter === 'all'
                      ? 'bg-[#2b1572] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Tất cả ({boardActivities.length})
                </button>
                <button
                  onClick={() => setBoardActivityFilter('card')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${boardActivityFilter === 'card'
                      ? 'bg-[#2b1572] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Thẻ ({boardActivities.filter((a) => a.target_type.startsWith('card:')).length})
                </button>
                <button
                  onClick={() => setBoardActivityFilter('board')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${boardActivityFilter === 'board'
                      ? 'bg-[#2b1572] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Bảng ({boardActivities.filter((a) => a.target_type.startsWith('board:')).length})
                </button>
              </div>

              {/* Activity Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {isLoadingBoardActivities ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#2b1572]" />
                    <span className="text-xs">Đang tải hoạt động...</span>
                  </div>
                ) : (() => {
                  const filtered = boardActivities.filter((act) => {
                    if (boardActivityFilter === 'card') return act.target_type.startsWith('card:');
                    if (boardActivityFilter === 'board') return act.target_type.startsWith('board:');
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <History className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-600">Chưa có hoạt động nào</span>
                        <span className="text-[11px] text-slate-400 max-w-[220px]">
                          Các thao tác trên bảng và thẻ sẽ hiển thị tại đây theo thời gian thực.
                        </span>
                      </div>
                    );
                  }

                  const getActionIcon = (action: string) => {
                    if (action.includes('bình luận')) return <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
                    if (action.includes('đính kèm')) return <Paperclip className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                    if (action.includes('hoàn thành')) return <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                    if (action.includes('hạn chót') || action.includes('ngày')) return <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                    return <History className="w-3.5 h-3.5 text-[#2b1572] shrink-0" />;
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

                  return filtered.map((act) => {
                    const isCard = act.target_type.startsWith('card:');
                    const cardId = isCard ? act.target_type.replace('card:', '') : null;
                    const actorName = act.user?.name || 'Người dùng';
                    const actorAvatar = act.user?.avatar;

                    return (
                      <div
                        key={act.id}
                        onClick={() => {
                          if (cardId) {
                            setSelectedCardId(cardId);
                            setIsCardDetailOpen(true);
                            setIsBoardActivityOpen(false);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all ${cardId
                            ? 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-2xs hover:shadow-xs cursor-pointer hover:border-[#a6d1fd]'
                            : 'bg-slate-50/80 border-slate-200/80'
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {actorAvatar ? (
                            <img
                              src={actorAvatar}
                              alt={actorName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 shadow-2xs"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#2b1572] text-[#a6d1fd] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                              {actorName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-[#2b1572] truncate">
                                {actorName}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0" title={act.created_at}>
                                {formatTime(act.created_at)}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed break-words">
                              <span className="mt-0.5 shrink-0">{getActionIcon(act.action)}</span>
                              <span>{act.action}</span>
                            </div>

                            {cardId && (
                              <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#2b1572] bg-[#a6d1fd]/30 hover:bg-[#a6d1fd]/50 w-fit px-2 py-0.5 rounded-lg transition-colors">
                                <span>Xem chi tiết thẻ</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
