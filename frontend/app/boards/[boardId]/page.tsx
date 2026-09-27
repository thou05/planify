'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
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
import SaveAsTemplateModal from '@/components/modals/SaveAsTemplateModal';
import BoardViewSwitcher, { BoardViewType } from '@/components/board/views/BoardViewSwitcher';
import BoardTableView from '@/components/board/views/BoardTableView';
import BoardCalendarView from '@/components/board/views/BoardCalendarView';
import BoardScheduleView from '@/components/board/views/BoardScheduleView';
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
  LayoutTemplate,
  Sparkles,
  Wand2,
  FileText,
  Check,
  Bot,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { ActivityItem } from '@/components/modals/MyActivityModal';
import { BoardRiskScannerModal } from '@/components/board/BoardRiskScannerModal';
import { BoardCopilotDrawer } from '@/components/board/BoardCopilotDrawer';
import { MarkdownRenderer, formatReportForZalo } from '@/components/board/MarkdownRenderer';

function applyCardMove(
  prevBoard: any,
  cardId: string,
  sourceListId: string,
  targetListId: string,
  position: number
) {
  if (!prevBoard?.lists) return prevBoard;
  let movedCard: any = null;

  const newLists = prevBoard.lists.map((list: any) => {
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

  // Nếu không tìm thấy trong sourceListId, tìm trong toàn bộ lists
  if (!movedCard) {
    for (const list of newLists) {
      const idx = (list.cards || []).findIndex((c: any) => c.id === cardId);
      if (idx !== -1) {
        movedCard = { ...list.cards[idx], list_id: targetListId };
        list.cards = list.cards.filter((c: any) => c.id !== cardId);
        break;
      }
    }
  }

  if (!movedCard) return prevBoard;

  const targetListIndex = newLists.findIndex((l: any) => l.id === targetListId);
  if (targetListIndex === -1) return prevBoard;

  const targetCards = [...(newLists[targetListIndex].cards || [])];
  const insertIndex = Math.min(Math.max(0, position), targetCards.length);
  targetCards.splice(insertIndex, 0, movedCard);
  newLists[targetListIndex].cards = targetCards;

  return {
    ...prevBoard,
    lists: newLists,
  };
}

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

  // Active Board View (Kanban, Table, Calendar, Schedule)
  const [activeView, setActiveView] = useState<BoardViewType>('kanban');

  // Modals state
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const [realtimeUpdatedCardId, setRealtimeUpdatedCardId] = useState<{ id: string; timestamp: number } | null>(null);

  // Board Activity Drawer State
  const [isBoardActivityOpen, setIsBoardActivityOpen] = useState(false);
  const [boardActivities, setBoardActivities] = useState<ActivityItem[]>([]);
  const [isLoadingBoardActivities, setIsLoadingBoardActivities] = useState(false);
  const [boardActivityFilter, setBoardActivityFilter] = useState<'all' | 'board' | 'card'>('all');

  // AI Features State
  const [isAiStandupOpen, setIsAiStandupOpen] = useState(false);
  const [isRiskScannerOpen, setIsRiskScannerOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isLoadingAiStandup, setIsLoadingAiStandup] = useState(false);
  const [aiStandupData, setAiStandupData] = useState<{
    boardName?: string;
    totalCards?: number;
    completedCards?: number;
    reportMarkdown?: string;
    generatedAt?: string;
  } | null>(null);
  const [aiStandupError, setAiStandupError] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState<'zalo' | 'markdown' | null>(null);

  const handleGenerateDailyStandup = async () => {
    try {
      setIsLoadingAiStandup(true);
      setAiStandupError(null);
      const res = await apiClient<any>(`/ai/boards/${boardId}/daily-standup`, {
        method: 'POST',
      });
      if (res.success && res.data) {
        setAiStandupData(res.data);
      } else {
        setAiStandupError(res.error || res.message || 'Không thể tạo báo cáo Standup với AI');
      }
    } catch (err: any) {
      setAiStandupError(err.message || 'Lỗi khi kết nối với AI');
    } finally {
      setIsLoadingAiStandup(false);
    }
  };

  const handleCopyZalo = () => {
    if (!aiStandupData?.reportMarkdown) return;
    const cleanText = formatReportForZalo(aiStandupData.reportMarkdown);
    navigator.clipboard.writeText(cleanText);
    setCopyMode('zalo');
    setTimeout(() => setCopyMode(null), 2500);
  };

  const handleCopyMarkdown = () => {
    if (!aiStandupData?.reportMarkdown) return;
    navigator.clipboard.writeText(aiStandupData.reportMarkdown);
    setCopyMode('markdown');
    setTimeout(() => setCopyMode(null), 2500);
  };

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
  const realtimeChannelRef = useRef<any>(null);

  const fetchBoard = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
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

  // Realtime Supabase Broadcast Subscription (Tối ưu hóa độ trễ <50ms với Direct State Patching)
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase.channel(`board:${boardId}`, {
      config: {
        broadcast: { self: false },
      },
    });
    realtimeChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'CARD_MOVED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.cardId) return;
        setBoard((prev: any) =>
          applyCardMove(
            prev,
            payload.cardId,
            payload.sourceListId,
            payload.targetListId,
            payload.position ?? 0
          )
        );
      })
      .on('broadcast', { event: 'CARD_DELETED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.cardId) return;
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          return {
            ...prev,
            lists: prev.lists.map((l: any) => ({
              ...l,
              cards: (l.cards || []).filter((c: any) => c.id !== payload.cardId),
            })),
          };
        });
      })
      .on('broadcast', { event: 'CARD_CREATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.card) {
          fetchBoard(true);
          return;
        }
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          const targetListId = payload.listId || payload.card.list_id;
          return {
            ...prev,
            lists: prev.lists.map((l: any) => {
              if (l.id === targetListId) {
                const exists = (l.cards || []).some((c: any) => c.id === payload.card.id);
                if (exists) return l;
                return {
                  ...l,
                  cards: [...(l.cards || []), payload.card],
                };
              }
              return l;
            }),
          };
        });
      })
      .on('broadcast', { event: 'CARD_UPDATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (payload?.cardId) {
          setRealtimeUpdatedCardId({ id: payload.cardId, timestamp: Date.now() });
          setBoard((prev: any) => {
            if (!prev?.lists) return prev;
            return {
              ...prev,
              lists: prev.lists.map((l: any) => ({
                ...l,
                cards: (l.cards || []).map((c: any) => {
                  if (c.id === payload.cardId) {
                    return { ...c, ...(payload.updated || {}) };
                  }
                  return c;
                }),
              })),
            };
          });
        }
      })
      .on('broadcast', { event: 'LIST_CREATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.list) {
          fetchBoard(true);
          return;
        }
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          const exists = prev.lists.some((l: any) => l.id === payload.list.id);
          if (exists) return prev;
          return {
            ...prev,
            lists: [...prev.lists, payload.list],
          };
        });
      })
      .on('broadcast', { event: 'LIST_UPDATED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.list) {
          fetchBoard(true);
          return;
        }
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          return {
            ...prev,
            lists: prev.lists.map((l: any) =>
              l.id === payload.list.id ? { ...l, ...payload.list } : l
            ),
          };
        });
      })
      .on('broadcast', { event: 'LIST_DELETED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.listId) return;
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          return {
            ...prev,
            lists: prev.lists.filter((l: any) => l.id !== payload.listId),
          };
        });
      })
      .on('broadcast', { event: 'LISTS_REORDERED' }, ({ payload }) => {
        if (payload?.senderId && user?.id && payload.senderId === user.id) return;
        if (!payload?.listIds) {
          fetchBoard(true);
          return;
        }
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          const map = new Map(prev.lists.map((l: any) => [l.id, l]));
          const reordered = payload.listIds.map((id: string) => map.get(id)).filter(Boolean);
          return {
            ...prev,
            lists: reordered,
          };
        });
      })
      .on('broadcast', { event: 'BOARD_UPDATED' }, () => fetchBoard(true))
      .on('broadcast', { event: 'BOARD_REFRESH' }, () => fetchBoard(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [boardId, user?.id, isBoardActivityOpen]);

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

    // Broadcast sắp xếp danh sách tức thì cho các thành viên khác
    realtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'LISTS_REORDERED',
      payload: {
        listIds: currentLists.map((l) => l.id),
        senderId: user?.id,
      },
    });

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
    setBoard((prev: any) => applyCardMove(prev, cardId, sourceListId, targetListId, finalTargetPosition));

    // Zero-latency broadcast tức thì tới mọi tab khác ngay lúc nhả chuột (<5ms)
    realtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'CARD_MOVED',
      payload: {
        cardId,
        sourceListId,
        targetListId,
        position: finalTargetPosition,
        senderId: user?.id,
      },
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

            {/* View Switcher Controls */}
            <div className="hidden sm:block h-5 w-[1px] bg-[#2b1572]/15" />
            <BoardViewSwitcher
              activeView={activeView}
              onViewChange={setActiveView}
            />
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

            {/* AI Daily Standup & Summary Button */}
            <button
              onClick={() => {
                setIsAiStandupOpen(true);
                if (!aiStandupData) {
                  handleGenerateDailyStandup();
                }
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:shadow-md"
              title="Tạo báo cáo Daily Standup và Đánh giá tiến độ bằng AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Standup</span>
            </button>

            {/* AI Risk & Bottleneck Scanner Button */}
            <button
              onClick={() => setIsRiskScannerOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:shadow-md"
              title="Dùng AI quét điểm nghẽn và rủi ro quá hạn"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Quét rủi ro</span>
            </button>

            {/* AI Board Copilot Button */}
            <button
              onClick={() => setIsCopilotOpen(true)}
              className="px-3 py-1.5 bg-[#2b1572] hover:bg-[#1e1050] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:shadow-md border border-white/20"
              title="Trợ lý AI Copilot hỏi đáp về bảng"
            >
              <Bot className="w-3.5 h-3.5 text-[#a6d1fd]" />
              <span className="hidden md:inline">AI Copilot</span>
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
              <span className="hidden lg:inline">Hoạt động</span>
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
                      setIsCopilotOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Copilot (Hỏi đáp)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsBoardMenuOpen(false);
                      setIsRiskScannerOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI Quét rủi ro & Điểm nghẽn</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsBoardMenuOpen(false);
                      setIsAiStandupOpen(true);
                      if (!aiStandupData) handleGenerateDailyStandup();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI Daily Standup</span>
                  </button>

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
                      setIsSaveAsTemplateOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-[#2b1572] hover:bg-white/60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 text-[#2b1572]" />
                    <span>Lưu thành Mẫu (Template)</span>
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

        {/* Multi-view Container */}
        {activeView === 'kanban' && (
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
        )}

        {/* Table View */}
        {activeView === 'table' && (
          <BoardTableView
            board={board}
            onOpenCardDetail={handleOpenCardDetail}
            onRefreshBoard={fetchBoard}
            onDeleteCard={handleDeleteCard}
          />
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <BoardCalendarView
            board={board}
            onOpenCardDetail={handleOpenCardDetail}
            onRefreshBoard={fetchBoard}
          />
        )}

        {/* Schedule / Timeline View */}
        {activeView === 'schedule' && (
          <BoardScheduleView
            board={board}
            onOpenCardDetail={handleOpenCardDetail}
            onRefreshBoard={fetchBoard}
          />
        )}
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

      <SaveAsTemplateModal
        isOpen={isSaveAsTemplateOpen}
        board={board}
        onClose={() => setIsSaveAsTemplateOpen(false)}
      />

      {/* 2. Card Detail Modal */}
      <CardDetailModal
        cardId={selectedCardId}
        boardId={boardId}
        realtimeUpdatedCardId={realtimeUpdatedCardId}
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

      {/* AI DAILY STANDUP & SUMMARY MODAL */}
      {isAiStandupOpen && (
        <div className="fixed inset-0 z-60 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsAiStandupOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-purple-200/80 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2b1572] flex items-center gap-2">
                    <span>AI Daily Standup & Báo Cáo Tiến Độ</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">Gemini 3.6 Flash</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bảng: <strong className="text-purple-900">{board?.name}</strong> • Tổng hợp từ trạng thái thẻ & lịch sử hoạt động
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAiStandupOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Ribbon */}
            {aiStandupData && (
              <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Tổng số thẻ:</span>
                    <span className="font-bold text-[#2b1572] bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      {aiStandupData.totalCards ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Đã hoàn thành:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {aiStandupData.completedCards ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Tạo lúc: {aiStandupData.generatedAt ? new Date(aiStandupData.generatedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateDailyStandup}
                  disabled={isLoadingAiStandup}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-100/60 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Tạo lại báo cáo mới nhất"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAiStandup ? 'animate-spin' : ''}`} />
                  <span>Cập nhật</span>
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isLoadingAiStandup ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xl animate-bounce">
                      <Sparkles className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#2b1572]">Gemini đang phân tích dữ liệu Bảng...</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Đang đọc danh sách thẻ, tiến độ hoàn thành và lịch sử 25 hoạt động gần đây nhất để tạo báo cáo Daily Standup.
                    </p>
                  </div>
                </div>
              ) : aiStandupError ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Không thể tạo báo cáo AI</span>
                  </div>
                  <p className="leading-relaxed">{aiStandupError}</p>
                  <button
                    onClick={handleGenerateDailyStandup}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : aiStandupData?.reportMarkdown ? (
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <MarkdownRenderer content={aiStandupData.reportMarkdown} />
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                  <FileText className="w-10 h-10 text-slate-300" />
                  <p>Bấm nút bên dưới để tạo báo cáo Daily Standup tự động bằng AI.</p>
                  <button
                    onClick={handleGenerateDailyStandup}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    Tạo báo cáo ngay
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              {aiStandupData?.reportMarkdown ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Button 1: Copy for Zalo (Clean, formatted memo) */}
                  <button
                    onClick={handleCopyZalo}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      copyMode === 'zalo'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:shadow-md'
                    }`}
                    title="Sao chép báo cáo sạch đẹp (đã loại bỏ ký tự ## và **), phù hợp dán vào Zalo / Teams / Messenger"
                  >
                    {copyMode === 'zalo' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã sao chép cho Zalo / Tin nhắn!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép gửi Zalo / Tin nhắn</span>
                      </>
                    )}
                  </button>

                  {/* Button 2: Copy Markdown (Slack / Notion) */}
                  <button
                    onClick={handleCopyMarkdown}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border ${
                      copyMode === 'markdown'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Sao chép định dạng Markdown gốc cho Slack, Notion hoặc Discord"
                  >
                    {copyMode === 'markdown' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã sao chép Markdown!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sao chép Markdown (Slack)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : <div />}

              <button
                onClick={() => setIsAiStandupOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Floating AI Copilot Trigger */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#2b1572] via-purple-700 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-2 border-white/40 group backdrop-blur-md"
        title="Mở Trợ lý AI Copilot"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        <span className="text-xs font-bold tracking-wide">AI Copilot</span>
      </button>

      {/* AI Risk Scanner Modal */}
      <BoardRiskScannerModal
        isOpen={isRiskScannerOpen}
        onClose={() => setIsRiskScannerOpen(false)}
        boardId={boardId}
        boardTitle={board?.name}
        onOpenCard={(cardId) => {
          setSelectedCardId(cardId);
          setIsCardDetailOpen(true);
        }}
      />

      {/* AI Board Copilot Drawer */}
      <BoardCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        boardId={boardId}
        boardTitle={board?.name}
        onOpenCard={(cardId) => {
          setSelectedCardId(cardId);
          setIsCardDetailOpen(true);
        }}
      />

    </AppShell>
  );
}
