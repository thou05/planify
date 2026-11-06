'use client';

import { confirmDialog, alertDialog } from '@/components/ui/AppDialog';
import { DragSaveQueue } from '@/lib/drag-save-queue';
import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  canManageBoard,
  canEditBoardContent,
  BoardPermissionContext,
  EditorJoinMode,
  canClaimEditor,
  canRequestEditor,
} from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { createRealtimeClient } from '@/lib/supabase';
import { useShell } from '@/components/layout/ShellContext';
import ListColumn from '@/components/board/ListColumn';
import CreateListModal from '@/components/modals/CreateListModal';
import EditBoardModal from '@/components/modals/EditBoardModal';
import BoardAppearanceModal from '@/components/board/BoardAppearanceModal';
import ShareBoardModal from '@/components/modals/ShareBoardModal';
import CopyBoardModal from '@/components/modals/CopyBoardModal';
import CardDetailModal from '@/components/modals/CardDetailModal';
import CopyListModal from '@/components/modals/CopyListModal';
import MoveListModal from '@/components/modals/MoveListModal';
import MoveCardsModal from '@/components/modals/MoveCardsModal';
import MoveCardModal from '@/components/modals/MoveCardModal';
import CopyCardModal from '@/components/modals/CopyCardModal';
import SaveAsTemplateModal from '@/components/modals/SaveAsTemplateModal';
import ExportBoardModal from '@/components/modals/ExportBoardModal';
import ImportBoardModal from '@/components/modals/ImportBoardModal';
import BoardViewSwitcher, { BoardViewType } from '@/components/board/views/BoardViewSwitcher';
import BoardTableView from '@/components/board/views/BoardTableView';
import BoardCalendarView from '@/components/board/views/BoardCalendarView';
import BoardScheduleView from '@/components/board/views/BoardScheduleView';
import BoardAnalyticsView from '@/components/board/views/BoardAnalyticsView';
import LivePresenceBar, { PresenceUser } from '@/components/board/LivePresenceBar';
import BoardFilterModal, {
  BoardFilterState,
  defaultFilterState,
  getActiveFilterCount,
  checkAssigneeMatchesTarget,
} from '@/components/board/BoardFilterModal';
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
  Download,
  Upload,
  Search,
  Filter,
  BarChart3,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Eye,
  UserCheck,
  Zap,
  Palette,
} from 'lucide-react';
import { ActivityItem } from '@/components/modals/MyActivityModal';
import { BoardRiskScannerModal } from '@/components/board/BoardRiskScannerModal';
import { BoardCopilotDrawer } from '@/components/board/BoardCopilotDrawer';
import { MarkdownRenderer, formatReportForZalo } from '@/components/board/MarkdownRenderer';
import CustomFieldsModal from '@/components/modals/CustomFieldsModal';
import AutomationModal from '@/components/modals/AutomationModal';

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
  const shell = useShell();

  useEffect(() => {
    if (shell?.registerRefreshHandler) {
      return shell.registerRefreshHandler(fetchBoard);
    }
  }, [shell, boardId]);

  const [board, setBoard] = useState<any>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [userWorkspaces, setUserWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  // Active Board View (Kanban, Table, Calendar, Schedule)
  const [activeView, setActiveView] = useState<BoardViewType>('kanban');

  // Modals state
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [boardButtons, setBoardButtons] = useState<any[]>([]);
  const [executingBoardButtonId, setExecutingBoardButtonId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const [realtimeUpdatedCardId, setRealtimeUpdatedCardId] = useState<{ id: string; timestamp: number } | null>(null);

  // Board Visibility Dropdown State
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const visibilityMenuRef = useRef<HTMLDivElement>(null);
  const boardMenuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // Board Editor Join Mode states
  const [editorJoinMode, setEditorJoinMode] = useState<EditorJoinMode>('REQUEST');
  const [hasPendingEditorRequest, setHasPendingEditorRequest] = useState<boolean>(false);
  const [isSubmittingEditorAction, setIsSubmittingEditorAction] = useState<boolean>(false);
  const [editorActionMessage, setEditorActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visibilityMenuRef.current && !visibilityMenuRef.current.contains(e.target as Node)) {
        setIsVisibilityMenuOpen(false);
      }
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setIsBoardMenuOpen(false);
      }
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setIsAiMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAiMenuOpen(false);
        setIsBoardMenuOpen(false);
      }
    };
    if (isVisibilityMenuOpen || isBoardMenuOpen || isAiMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisibilityMenuOpen, isBoardMenuOpen, isAiMenuOpen]);

  const isBoardMember = Boolean(
    board?.isBoardMember ||
      board?.members?.some((m: any) => (m.user_id && m.user_id === user?.id) || (m.user?.id && m.user?.id === user?.id))
  );

  const isWorkspaceAdmin = Boolean(
    board?.isWorkspaceAdmin ||
      board?.isWorkspaceOwner ||
      (user?.id &&
        workspaceMembers.some(
          (wm: any) =>
            (wm.user_id === user.id || wm.user?.id === user.id) &&
            (wm.role === 'ADMIN' || wm.role === 'OWNER')
        ))
  );

  const isWorkspaceMember = Boolean(
    board?.isWorkspaceMember ||
      (user?.id &&
        workspaceMembers.some(
          (wm: any) =>
            (wm.user_id === user.id || wm.user?.id === user.id) &&
            wm.role !== 'GUEST'
        ))
  );

  const isGuest = Boolean(
    board?.isGuest ||
      (board && !board?.isWorkspaceOwner && !isWorkspaceAdmin && !board?.isWorkspaceMember && board?.currentUserBoardRole !== 'ADMIN')
  );

  // Người dùng ở chế độ chỉ xem (VIEWER) hoặc không tham gia vào bảng (không phải board member & không phải workspace admin/owner)
  const isViewer = Boolean(
    !isWorkspaceAdmin &&
      !board?.isWorkspaceOwner &&
      board?.currentUserBoardRole !== 'ADMIN' &&
      (board?.currentUserBoardRole === 'VIEWER' || board?.canEdit === false || !isBoardMember)
  );

  const boardPermCtx: BoardPermissionContext = {
    boardRole: board?.currentUserBoardRole || null,
    isWorkspaceOwner: Boolean(board?.isWorkspaceOwner),
    isWorkspaceAdmin,
    canEdit: board?.canEdit,
    canManageMembers: board?.canManageMembers,
    canInviteMembers: board?.canInviteMembers,
    canDelete: board?.canDelete,
    canChangeVisibility: board?.canChangeVisibility,
    editor_join_mode: (board?.editor_join_mode as EditorJoinMode) || editorJoinMode,
  };

  const handleClaimEditor = async () => {
    if (!boardId || isSubmittingEditorAction) return;
    try {
      setIsSubmittingEditorAction(true);
      setEditorActionMessage(null);
      const res = await apiClient<any>(`/boards/${boardId}/claim-editor`, {
        method: 'POST',
      });
      if (res.success || res.data) {
        setBoard((prev: any) => ({
          ...prev,
          currentUserBoardRole: 'EDITOR',
          canEdit: true,
          canInviteMembers: true,
          isBoardMember: true,
        }));
        setEditorActionMessage('Bạn đã trở thành Biên tập viên của Bảng!');
        setTimeout(() => setEditorActionMessage(null), 5000);
        void fetchBoard(true);
      } else {
        setEditorActionMessage(res.message || 'Không thể tham gia làm Biên tập viên');
      }
    } catch (err: any) {
      setEditorActionMessage(err?.message || 'Có lỗi xảy ra khi tham gia làm Biên tập viên');
    } finally {
      setIsSubmittingEditorAction(false);
    }
  };

  const handleRequestEditor = async () => {
    if (!boardId || isSubmittingEditorAction) return;
    try {
      setIsSubmittingEditorAction(true);
      setEditorActionMessage(null);
      const res = await apiClient<any>(`/boards/${boardId}/request-editor`, {
        method: 'POST',
      });
      if (res.success || res.data) {
        setHasPendingEditorRequest(true);
        setEditorActionMessage('Đã gửi yêu cầu cấp quyền tới Quản trị viên Bảng!');
        setTimeout(() => setEditorActionMessage(null), 5000);
      } else {
        setEditorActionMessage(res.message || 'Không thể gửi yêu cầu');
      }
    } catch (err: any) {
      setEditorActionMessage(err?.message || 'Có lỗi xảy ra khi gửi yêu cầu quyền');
    } finally {
      setIsSubmittingEditorAction(false);
    }
  };

  const canEditBoard = !board?.is_archived && (isWorkspaceAdmin || (!isViewer && canEditBoardContent(boardPermCtx)));

  const canChangeVisibility = Boolean(
    board?.canChangeVisibility ||
      isWorkspaceAdmin ||
      board?.isWorkspaceOwner ||
      canManageBoard(boardPermCtx) ||
      Boolean(board?.canManageMembers)
  );

  const [confirmingVisibility, setConfirmingVisibility] = useState<'WORKSPACE' | 'PRIVATE' | 'PUBLIC' | null>(null);

  const handleRequestUpdateVisibility = (newVisibility: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC') => {
    if (!board || !canChangeVisibility || board.visibility === newVisibility || isUpdatingVisibility) return;
    setIsVisibilityMenuOpen(false);
    setConfirmingVisibility(newVisibility);
  };

  const handleConfirmUpdateVisibility = async () => {
    if (!confirmingVisibility || !board?.id || !canChangeVisibility) return;
    const targetVisibility = confirmingVisibility;
    const previousVisibility = board.visibility;

    setIsUpdatingVisibility(true);
    setConfirmingVisibility(null);
    setBoard((prev: any) => ({ ...prev, visibility: targetVisibility }));

    try {
      const res = await apiClient<any>(`/boards/${boardId}`, {
        method: 'PATCH',
        data: { visibility: targetVisibility },
      });
      if (res.success && res.data) {
        setBoard((prev: any) => ({ ...prev, ...res.data, visibility: targetVisibility }));
      } else {
        setBoard((prev: any) => ({ ...prev, visibility: previousVisibility }));
        fetchBoard(true);
      }
    } catch (err: any) {
      console.error('Lỗi cập nhật quyền hiển thị:', err);
      setBoard((prev: any) => ({ ...prev, visibility: previousVisibility }));
      fetchBoard(true);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  // Board Activity Drawer State
  const [isBoardActivityOpen, setIsBoardActivityOpen] = useState(false);
  const [boardActivities, setBoardActivities] = useState<ActivityItem[]>([]);
  const [isLoadingBoardActivities, setIsLoadingBoardActivities] = useState(false);
  const [isLoadingMoreBoardActivities, setIsLoadingMoreBoardActivities] = useState(false);
  const [boardActivitiesPage, setBoardActivitiesPage] = useState(1);
  const [hasMoreBoardActivities, setHasMoreBoardActivities] = useState(false);
  const [boardActivityFilter, setBoardActivityFilter] = useState<'all' | 'board' | 'card'>('all');

  const fetchBoardActivities = async () => {
    try {
      setIsLoadingBoardActivities(true);
      setBoardActivitiesPage(1);
      const res = await apiClient<ActivityItem[]>(`/boards/${boardId}/activities?limit=15&page=1`);
      if (res.success && Array.isArray(res.data)) {
        setBoardActivities(res.data);
        setHasMoreBoardActivities(res.data.length >= 15);
      } else {
        setBoardActivities([]);
        setHasMoreBoardActivities(false);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBoardActivities(false);
    }
  };

  const handleLoadMoreBoardActivities = async () => {
    if (isLoadingMoreBoardActivities || !hasMoreBoardActivities) return;
    try {
      setIsLoadingMoreBoardActivities(true);
      const nextPage = boardActivitiesPage + 1;
      const res = await apiClient<ActivityItem[]>(`/boards/${boardId}/activities?limit=15&page=${nextPage}`);
      if (res.success && Array.isArray(res.data)) {
        setBoardActivities((prev) => [...prev, ...res.data]);
        setBoardActivitiesPage(nextPage);
        setHasMoreBoardActivities(res.data.length >= 15);
      } else {
        setHasMoreBoardActivities(false);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMoreBoardActivities(false);
    }
  };

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
      const res = await apiClient<{
        boardName?: string;
        totalCards?: number;
        completedCards?: number;
        reportMarkdown?: string;
        generatedAt?: string;
      }>(`/ai/boards/${boardId}/daily-standup`, {
        method: 'POST',
      });
      if (res.success && res.data) {
        setAiStandupData(res.data);
      } else {
        setAiStandupError(res.error || 'Không thể tạo báo cáo AI');
      }
    } catch (err: any) {
      setAiStandupError(err?.message || 'Có lỗi xảy ra khi tạo báo cáo AI');
    } finally {
      setIsLoadingAiStandup(false);
    }
  };

  const handleCopyZalo = () => {
    if (!aiStandupData?.reportMarkdown) return;
    const cleanText = aiStandupData.reportMarkdown
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
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
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [listInsertTarget, setListInsertTarget] = useState<string | null>(null);
  const boardReadVersion = useRef(0);
  const pendingDragSaves = useRef(0);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);
  const [isPersistingDrag, setIsPersistingDrag] = useState(false);
  const [dragSaveError, setDragSaveError] = useState('');
  const dragSaveQueueRef = useRef<DragSaveQueue | null>(null);
  const reconcileDragRef = useRef<() => void>(() => {});
  if (!dragSaveQueueRef.current) dragSaveQueueRef.current = new DragSaveQueue({
    changed: pending => { pendingDragSaves.current = pending; setIsPersistingDrag(pending > 0); },
    failed: error => setDragSaveError(error instanceof Error ? error.message : 'Không thể lưu vị trí'),
    idle: () => { setDragSaveError(''); boardReadVersion.current++; reconcileDragRef.current(); },
  });
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingDragSaves.current > 0) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const listInsertTargetRef = useRef<string | null>(null);
  const draggedListIdRef = useRef<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedSourceListId, setDraggedSourceListId] = useState<string | null>(null);
  // Hit-test layout slots, never the columns animated inside them.
  const updateListInsertion = (x: number) => {
    const viewport = boardViewportRef.current;
    if (!viewport || !draggedListIdRef.current) return;
    const slots = Array.from(viewport.querySelectorAll<HTMLElement>('[data-list-slot]'));
    let closest: HTMLElement | undefined;
    let distance = Infinity;
    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      const d = Math.abs(x - (rect.left + rect.width / 2));
      if (d < distance) { closest = slot; distance = d; }
    }
    const id = closest?.dataset.listSlot;
    if (id && listInsertTargetRef.current !== id) {
      listInsertTargetRef.current = id;
      setListInsertTarget(id);
    }
  };
  useEffect(() => {
    if (!draggedListId && !draggedSourceListId) return;
    let frame = 0;
    let previousTime = 0;
    const track = (event: DragEvent) => { dragPointerRef.current = { x: event.clientX, y: event.clientY }; };
    const stop = () => { dragPointerRef.current = null; };
    const tick = (time: number) => {
      const viewport = boardViewportRef.current;
      const pointer = dragPointerRef.current;
      const dt = previousTime ? Math.min(time - previousTime, 32) / 16.67 : 1;
      previousTime = time;
      if (viewport && pointer) {
        const rect = viewport.getBoundingClientRect();
        const speed = (value: number, start: number, end: number) => value < start + 64 ? -Math.min(14, (start + 64 - value) / 5) : value > end - 64 ? Math.min(14, (value - end + 64) / 5) : 0;
        if (pointer.y >= rect.top && pointer.y <= rect.bottom) {
          viewport.scrollLeft += speed(pointer.x, rect.left, rect.right) * dt;
          if (draggedListIdRef.current) updateListInsertion(pointer.x);
          else for (const scroller of viewport.querySelectorAll<HTMLElement>('[data-card-scroll]')) {
            const bounds = scroller.getBoundingClientRect();
            if (pointer.x >= bounds.left && pointer.x <= bounds.right) scroller.scrollTop += speed(pointer.y, bounds.top, bounds.bottom) * dt;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('dragover', track, true);
    document.addEventListener('drop', stop, true);
    document.addEventListener('dragend', stop, true);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); stop(); document.removeEventListener('dragover', track, true); document.removeEventListener('drop', stop, true); document.removeEventListener('dragend', stop, true); };
  }, [draggedListId, draggedSourceListId]);
  const realtimeChannelRef = useRef<any>(null);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
    if (user?.id) {
      const me: PresenceUser = {
        id: user.id,
        name: user.name || user.email || 'Thành viên',
        avatar: user.avatar || null,
        email: user.email || null,
        isGuest: Boolean(isGuest),
        online_at: new Date().toISOString(),
      };
      setActiveUsersList((prev) => {
        const remaining = prev.filter((u) => u.id !== user.id && !u.id.startsWith('guest_'));
        return [me, ...remaining];
      });
      setActiveUserIds((prev) => new Set([...prev, user.id]));
    }
  }, [user, isGuest]);
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());
  const [activeUsersList, setActiveUsersList] = useState<Array<PresenceUser>>([]);

  // Board in-page comprehensive filter state
  const [boardFilters, setBoardFilters] = useState<BoardFilterState>(defaultFilterState);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const boardSearchInputRef = useRef<HTMLInputElement>(null);

  const activeFilterCount = React.useMemo(() => {
    return getActiveFilterCount(boardFilters);
  }, [boardFilters]);

  const handleResetFilters = () => {
    setBoardFilters(defaultFilterState);
  };

  // Shortcut key '/' to quickly focus board search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (!isInput && e.key === '/') {
        e.preventDefault();
        boardSearchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Board unique labels
  const boardLabels = React.useMemo(() => {
    const labelMap = new Map<string, { id: string; name: string; color: string }>();
    if (Array.isArray(board?.labels)) {
      board.labels.forEach((l: any) => {
        if (l.id) labelMap.set(l.id, l);
      });
    }
    (board?.lists || []).forEach((l: any) => {
      (l.cards || []).forEach((c: any) => {
        (c.card_labels || []).forEach((cl: any) => {
          if (cl.label?.id) {
            labelMap.set(cl.label.id, cl.label);
          }
        });
      });
    });
    return Array.from(labelMap.values());
  }, [board?.labels, board?.lists]);

  const totalAllCards = React.useMemo(() => {
    return (board?.lists || []).reduce(
      (acc: number, l: any) => acc + (l.cards?.length || 0),
      0
    );
  }, [board?.lists]);

  const allBoardCards = React.useMemo(() => {
    return (board?.lists || []).flatMap((l: any) => l.cards || []);
  }, [board?.lists]);

  // Helper to extract assignee user ID reliably
  const getAssigneeUserId = (ca: any): string | undefined => {
    return ca?.user_id || ca?.user?.id || ca?.board_member?.user_id || ca?.board_member?.user?.id;
  };

  // Universal Bidirectional Member Matching maps
  const { memberIdToUserIdMap, userIdToMemberIdMap, memberEmailMap, currentMemberId } = React.useMemo(() => {
    const mToU = new Map<string, string>();
    const uToM = new Map<string, string>();
    const emails = new Map<string, string>();
    let currMemId: string | undefined = undefined;

    (board?.members || []).forEach((m: any) => {
      const uId = m.user_id || m.user?.id;
      const email = m.user?.email;
      if (m.id && uId) {
        mToU.set(m.id, uId);
        uToM.set(uId, m.id);
      }
      if (email) {
        if (uId) emails.set(uId, email);
        if (m.id) emails.set(m.id, email);
      }
      if (user?.id && uId === user.id) {
        currMemId = m.id;
      }
      if (user?.email && email && email.toLowerCase() === user.email.toLowerCase()) {
        currMemId = m.id;
      }
    });

    return {
      memberIdToUserIdMap: mToU,
      userIdToMemberIdMap: uToM,
      memberEmailMap: emails,
      currentMemberId: currMemId,
    };
  }, [board?.members, user?.id, user?.email]);

  // Reactive filtered lists matching multi-criteria filter state
  const filteredLists = React.useMemo(() => {
    if (!board?.lists) return [];
    const activeCount = getActiveFilterCount(boardFilters);
    if (activeCount === 0) {
      return board.lists;
    }

    const now = new Date();
    const nowTime = now.getTime();
    const q = (boardFilters.keyword || '').trim().toLowerCase();

    return board.lists.map((list: any) => {
      const matchingCards = (list.cards || []).filter((card: any) => {
        // 1. Keyword check
        if (q) {
          const titleMatch = (card.title || '').toLowerCase().includes(q);
          const descMatch = (card.description || '').toLowerCase().includes(q);
          const labelMatch = (card.card_labels || []).some((cl: any) =>
            (cl.label?.name || '').toLowerCase().includes(q)
          );
          const memberMatch = (card.card_assignees || []).some((ca: any) => {
            let name = (ca.user?.name || ca.board_member?.user?.name || '').toLowerCase();
            let email = (ca.user?.email || ca.board_member?.user?.email || '').toLowerCase();
            if (!name && !email) {
              const uId = ca.user_id || (ca.board_member_id && memberIdToUserIdMap.get(ca.board_member_id));
              const m = (board?.members || []).find(
                (bm: any) => bm.user_id === uId || bm.user?.id === uId || bm.id === ca.board_member_id
              );
              if (m) {
                name = (m.user?.name || '').toLowerCase();
                email = (m.user?.email || '').toLowerCase();
              }
            }
            return name.includes(q) || email.includes(q);
          });
          if (!titleMatch && !descMatch && !labelMatch && !memberMatch) {
            return false;
          }
        }

        // 2. Members check
        if (boardFilters.members.length > 0) {
          const assignees = card.card_assignees || [];
          const hasNoMembers = assignees.length === 0;

          const checkMember = (targetMemberKey: string) => {
            if (targetMemberKey === 'no_members') {
              return hasNoMembers;
            }
            const targetEmail =
              targetMemberKey === 'assigned_to_me'
                ? user?.email
                : memberEmailMap.get(targetMemberKey);

            return assignees.some((ca: any) =>
              checkAssigneeMatchesTarget(
                ca,
                targetMemberKey,
                user?.id,
                currentMemberId,
                memberIdToUserIdMap,
                userIdToMemberIdMap,
                targetEmail
              )
            );
          };

          if (boardFilters.matchMode === 'all') {
            const allMembersMatch = boardFilters.members.every(checkMember);
            if (!allMembersMatch) return false;
          } else {
            const anyMemberMatch = boardFilters.members.some(checkMember);
            if (!anyMemberMatch) return false;
          }
        }

        // 3. Labels check
        if (boardFilters.labels && boardFilters.labels.length > 0) {
          const hasNoLabels = !card.card_labels || card.card_labels.length === 0;
          const checkLabel = (lId: string) => {
            if (lId === 'no_labels') return hasNoLabels;
            return (card.card_labels || []).some(
              (cl: any) => (cl.label_id || cl.label?.id || cl.id) === lId
            );
          };

          if (boardFilters.matchMode === 'all') {
            if (!boardFilters.labels.every(checkLabel)) return false;
          } else {
            if (!boardFilters.labels.some(checkLabel)) return false;
          }
        }

        // 4. Card Status check
        const isDone = Boolean(card.is_due_date_completed || card.status === 'DONE' || card.status === 'COMPLETED');
        if (boardFilters.cardStatus.length > 0) {
          const statusMatch = boardFilters.cardStatus.some((st) => {
            if (st === 'completed') return isDone;
            if (st === 'not_completed') return !isDone;
            return false;
          });
          if (!statusMatch) return false;
        }

        // 5. Due Date check
        if (boardFilters.dueDates.length > 0) {
          const hasNoDate = !card.due_date;
          const d = card.due_date ? new Date(card.due_date) : null;
          const isDValid = d && !isNaN(d.getTime());

          const dueMatch = boardFilters.dueDates.some((dd) => {
            if (dd === 'no_date') return hasNoDate;
            if (!isDValid || !d) return false;

            if (dd === 'overdue') {
              return d.getTime() < nowTime && !isDone;
            }
            if (dd === 'due_tomorrow') {
              const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
              const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
              return d >= tomorrowStart && d <= tomorrowEnd;
            }
            if (dd === 'due_next_week') {
              const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
              const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
              return d >= weekStart && d <= weekEnd;
            }
            if (dd === 'due_next_month') {
              const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
              const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59);
              return d >= monthStart && d <= monthEnd;
            }
            return false;
          });
          if (!dueMatch) return false;
        }

        // 6. Activity check
        if (boardFilters.activities.length > 0) {
          const cardTime = card.updated_at
            ? new Date(card.updated_at).getTime()
            : card.created_at
              ? new Date(card.created_at).getTime()
              : Date.now();
          const diffDays = (nowTime - cardTime) / (1000 * 60 * 60 * 24);

          const activityMatch = boardFilters.activities.some((act) => {
            if (act === 'past_week') return diffDays <= 7;
            if (act === 'past_2_weeks') return diffDays <= 14;
            if (act === 'past_4_weeks') return diffDays <= 28;
            if (act === 'no_activity_4_weeks') return diffDays > 28;
            return false;
          });
          if (!activityMatch) return false;
        }

        return true;
      });

      return {
        ...list,
        cards: matchingCards,
      };
    });
  }, [
    board?.lists,
    boardFilters,
    user?.id,
    user?.email,
    currentMemberId,
    memberIdToUserIdMap,
    userIdToMemberIdMap,
    memberEmailMap,
    board?.members,
  ]);

  const totalFilteredCards = React.useMemo(() => {
    return filteredLists.reduce(
      (acc: number, l: any) => acc + (l.cards?.length || 0),
      0
    );
  }, [filteredLists]);

  const effectiveBoard = React.useMemo(() => {
    if (!board) return null;
    return {
      ...board,
      lists: filteredLists,
    };
  }, [board, filteredLists]);

  const fetchBoard = async (silent = false) => {
    const version = boardReadVersion.current;
    try {
      if (!silent) setIsLoading(true);
      const res = await apiClient<any>(`/boards/${boardId}`);
      if (version !== boardReadVersion.current || pendingDragSaves.current > 0 || draggedListIdRef.current || draggedCardRef.current) return;
      if (res.success && res.data) {
        setBoard(res.data);
        setAccessDenied(null);
        setEditorJoinMode(res.data.editor_join_mode || 'REQUEST');
        setHasPendingEditorRequest(
          Boolean(res.data.hasPendingEditorRequest ?? res.data.has_pending_editor_request ?? false)
        );
        if (res.data.workspace_id) {
          if (lastFetchedWorkspaceIdRef.current !== res.data.workspace_id || workspaceMembers.length === 0) {
            lastFetchedWorkspaceIdRef.current = res.data.workspace_id;
            fetchWorkspaceData(res.data.workspace_id);
          }
          shell?.setCurrentWorkspaceId(res.data.workspace_id);
        }
      } else {
        setAccessDenied(res.message || 'Không tìm thấy hoặc bạn không có quyền truy cập vào Bảng này.');
      }
    } catch (err: any) {
      if (version !== boardReadVersion.current || pendingDragSaves.current > 0 || draggedListIdRef.current || draggedCardRef.current) return;
      setAccessDenied(err?.message || 'Bạn không có quyền truy cập vào Bảng này hoặc đã bị xóa khỏi nhóm.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  reconcileDragRef.current = () => { void fetchBoard(true); };

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

  const fetchBoardButtons = async () => {
    if (!boardId) return;
    try {
      const res = await apiClient<any[]>(`/boards/${boardId}/automations?type=BOARD_BUTTON`);
      if (res.data && Array.isArray(res.data)) {
        setBoardButtons(res.data.filter((b: any) => b.is_enabled));
      }
    } catch {}
  };

  const handleExecuteBoardButton = async (btn: any) => {
    setExecutingBoardButtonId(btn.id);
    try {
      const res = await apiClient<any>(`/automations/${btn.id}/run`, {
        method: 'POST',
        data: {},
      });
      if (res.data?.success) {
        await fetchBoard(true);
      }
    } catch (err: any) {
      console.error('Error executing board button:', err);
    } finally {
      setExecutingBoardButtonId(null);
    }
  };

  useEffect(() => {
    setBoard(null);
    fetchBoard();
    fetchBoardButtons();
  }, [boardId]);

  // Realtime Dynamic Favicon & Browser Tab Title
  useEffect(() => {
    if (!board) return;

    // 1. Cập nhật Title tab trình duyệt (nếu icon là URL ảnh thì không nối vào title)
    const effectiveIcon =
      board.icon ||
      (board.background &&
      (board.background.startsWith('http://') ||
        board.background.startsWith('https://') ||
        board.background.startsWith('data:image') ||
        board.background.startsWith('blob:'))
        ? board.background
        : null);

    const isImageIcon = Boolean(
      effectiveIcon &&
        (effectiveIcon.startsWith('http://') ||
          effectiveIcon.startsWith('https://') ||
          effectiveIcon.startsWith('data:image') ||
          effectiveIcon.startsWith('blob:'))
    );

    const titlePrefix = board.icon && !isImageIcon ? `${board.icon} ` : '';
    document.title = `${titlePrefix}${board.name || 'Bảng công việc'} | Planify`;

    // 2. Cập nhật Favicon động (hỗ trợ cả emoji SVG và URL ảnh từ thiết bị/hình nền)
    let faviconLink: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    const originalFaviconHref = faviconLink?.href || '/favicon.ico';

    if (effectiveIcon) {
      let faviconUrl = effectiveIcon;
      if (!isImageIcon) {
        const emojiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${effectiveIcon}</text></svg>`;
        faviconUrl = `data:image/svg+xml,${encodeURIComponent(emojiSvg)}`;
      }

      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = faviconUrl;
    }

    return () => {
      document.title = 'Planify — Collaborative Work Management';
      if (faviconLink && originalFaviconHref) {
        faviconLink.href = originalFaviconHref;
      }
    };
  }, [board?.icon, board?.background, board?.name]);

  // Helper tạo danh tính khách tạm thời nếu chưa đăng nhập (Google Docs animal anonymous style)
  const getGuestSessionUser = React.useCallback((): { id: string; name: string; avatar?: string | null; isGuest: true } => {
    if (typeof window === 'undefined') {
      return { id: 'guest_anon', name: 'Khách Ẩn Danh', isGuest: true };
    }
    let guestId = sessionStorage.getItem('planify_guest_id');
    let guestName = sessionStorage.getItem('planify_guest_name');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
      const ANIMAL_NAMES = [
        'Khách Ẩn Danh',
        'Cáo Ẩn Danh',
        'Gấu Ẩn Danh',
        'Sói Ẩn Danh',
        'Mèo Ẩn Danh',
        'Cú Ẩn Danh',
        'Thỏ Ẩn Danh',
        'Chim Cánh Cụt Ẩn Danh',
      ];
      guestName = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
      sessionStorage.setItem('planify_guest_id', guestId);
      sessionStorage.setItem('planify_guest_name', guestName);
    }
    return { id: guestId, name: guestName || 'Khách Ẩn Danh', isGuest: true };
  }, []);

  // Realtime Supabase Broadcast & Presence Subscription (Kênh kết nối WebSocket ổn định)
  useEffect(() => {
    if (!boardId) return;

    let isSubscribed = true;
    let reconnectTimeout: any = null;

    const currentGuest = !userRef.current?.id ? getGuestSessionUser() : null;
    const presenceKey = userRef.current?.id || currentGuest?.id || 'guest_' + Math.random().toString(36).substring(2, 8);

    const realtime = createRealtimeClient();
    const channel = realtime.channel(`board:${boardId}`, {
      config: {
        broadcast: { self: false },
        presence: {
          key: presenceKey,
        },
      },
    });
    realtimeChannelRef.current = channel;

    const getCurrentParticipant = (): PresenceUser => {
      const currentU = userRef.current;
      if (currentU?.id) {
        return {
          id: currentU.id,
          name: currentU.name || currentU.email || 'Thành viên',
          avatar: currentU.avatar || null,
          email: currentU.email || null,
          isGuest: Boolean(isGuest),
          online_at: new Date().toISOString(),
        };
      }
      const g = getGuestSessionUser();
      return {
        id: g.id,
        name: g.name,
        avatar: null,
        email: null,
        isGuest: true,
        online_at: new Date().toISOString(),
      };
    };

    const initialMe = getCurrentParticipant();
    if (initialMe.id) {
      setActiveUsersList((prev) => (prev.some((u) => u.id === initialMe.id) ? prev : [initialMe, ...prev]));
      setActiveUserIds((prev) => new Set([...prev, initialMe.id]));
    }

    const handleSyncPresence = () => {
      const state = channel.presenceState();
      const onlineIds = new Set<string>();
      const onlineUsers: PresenceUser[] = [];

      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          presences.forEach((p: any) => {
            const uid = p.user_id || p.id;
            if (uid) {
              onlineIds.add(uid);
              if (!onlineUsers.some((u) => u.id === uid)) {
                onlineUsers.push({
                  id: uid,
                  name: p.name || (p.isGuest ? 'Khách (Guest)' : 'Thành viên'),
                  avatar: p.avatar,
                  email: p.email,
                  isGuest: Boolean(p.isGuest),
                  color: p.color,
                  online_at: p.online_at,
                });
              }
            }
          });
        }
      });

      const me = getCurrentParticipant();
      if (me.id) {
        onlineIds.add(me.id);
        if (!onlineUsers.some((u) => u.id === me.id)) {
          onlineUsers.push(me);
        }
      }

      setActiveUserIds(onlineIds);
      setActiveUsersList(onlineUsers);
    };

    const trackCurrentPresence = async () => {
      if (!channel) return;
      const me = getCurrentParticipant();
      try {
        await channel.track({
          user_id: me.id,
          name: me.name,
          avatar: me.avatar,
          email: me.email,
          isGuest: me.isGuest,
          online_at: me.online_at,
        });
        channel.send({
          type: 'broadcast',
          event: 'USER_PRESENCE_JOIN',
          payload: {
            user_id: me.id,
            name: me.name,
            avatar: me.avatar,
            email: me.email,
            isGuest: me.isGuest,
          },
        });
      } catch (err) {
        console.warn('[Planify Realtime] Lỗi track presence:', err);
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        handleSyncPresence();
      })
      .on('presence', { event: 'join' }, () => {
        handleSyncPresence();
      })
      .on('presence', { event: 'leave' }, () => {
        handleSyncPresence();
      })
      .on('broadcast', { event: 'USER_PRESENCE_JOIN' }, ({ payload }) => {
        if (!payload?.user_id) return;
        setActiveUserIds((prev) => new Set([...prev, payload.user_id]));
        setActiveUsersList((prev) => {
          if (prev.some((u) => u.id === payload.user_id)) return prev;
          return [
            ...prev,
            {
              id: payload.user_id,
              name: payload.name || (payload.isGuest ? 'Khách (Guest)' : 'Thành viên'),
              avatar: payload.avatar,
              email: payload.email,
              isGuest: Boolean(payload.isGuest),
            },
          ];
        });
        const me = getCurrentParticipant();
        if (me.id && payload.user_id !== me.id) {
          channel.send({
            type: 'broadcast',
            event: 'USER_PRESENCE_PONG',
            payload: {
              user_id: me.id,
              name: me.name,
              avatar: me.avatar,
              email: me.email,
              isGuest: me.isGuest,
            },
          });
        }
      })
      .on('broadcast', { event: 'USER_PRESENCE_PONG' }, ({ payload }) => {
        if (!payload?.user_id) return;
        setActiveUserIds((prev) => new Set([...prev, payload.user_id]));
        setActiveUsersList((prev) => {
          if (prev.some((u) => u.id === payload.user_id)) return prev;
          return [
            ...prev,
            {
              id: payload.user_id,
              name: payload.name || (payload.isGuest ? 'Khách (Guest)' : 'Thành viên'),
              avatar: payload.avatar,
              email: payload.email,
              isGuest: Boolean(payload.isGuest),
            },
          ];
        });
      })
      .on('broadcast', { event: 'USER_PRESENCE_LEAVE' }, ({ payload }) => {
        if (!payload?.user_id) return;
        setActiveUserIds((prev) => {
          const next = new Set(prev);
          next.delete(payload.user_id);
          return next;
        });
        setActiveUsersList((prev) => prev.filter((u) => u.id !== payload.user_id));
      })
      .on('broadcast', { event: 'CARD_MOVED' }, ({ payload }) => {
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) return;
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
        if (draggedListIdRef.current || draggedCardRef.current || pendingDragSaves.current > 0) return;
        const currentU = userRef.current;
        if (payload?.senderId && currentU?.id && payload.senderId === currentU.id) { void fetchBoard(true); return; }
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
      .on('broadcast', { event: 'AUTOMATION_EXECUTED' }, () => fetchBoard(true))
      .on('broadcast', { event: 'AUTOMATION_CREATED' }, () => fetchBoardButtons())
      .on('broadcast', { event: 'AUTOMATION_UPDATED' }, () => fetchBoardButtons())
      .on('broadcast', { event: 'AUTOMATION_DELETED' }, () => fetchBoardButtons())
      .on('broadcast', { event: 'BOARD_MEMBERS_CHANGED' }, ({ payload }) => {
        const currentU = userRef.current;
        if (payload?.targetUserId && currentU?.id && payload.targetUserId === currentU.id) {
          if (payload.role === 'EDITOR' || payload.role === 'ADMIN') {
            setBoard((prev: any) => ({
              ...prev,
              currentUserBoardRole: payload.role,
              canEdit: true,
              canInviteMembers: true,
              isBoardMember: true,
            }));
            setHasPendingEditorRequest(false);
          }
        }
        void fetchBoard(true);
      })
      .on('broadcast', { event: 'MEMBER_ROLE_CHANGED' }, ({ payload }) => {
        const currentU = userRef.current;
        const targetId = payload?.userId || payload?.user_id || payload?.targetUserId;
        if (targetId && currentU?.id && targetId === currentU.id) {
          const newRole = payload?.role;
          if (newRole) {
            setBoard((prev: any) => ({
              ...prev,
              currentUserBoardRole: newRole,
              canEdit: newRole === 'ADMIN' || newRole === 'EDITOR' || newRole === 'MEMBER',
              canInviteMembers: newRole === 'ADMIN' || newRole === 'EDITOR' || newRole === 'MEMBER',
              isBoardMember: true,
            }));
            if (newRole === 'EDITOR' || newRole === 'ADMIN') {
              setHasPendingEditorRequest(false);
            }
          }
        }
        void fetchBoard(true);
      })
      .on('broadcast', { event: 'EDITOR_REQUEST_APPROVED' }, ({ payload }) => {
        const currentU = userRef.current;
        const targetId = payload?.userId || payload?.user_id || payload?.targetUserId;
        if (!targetId || (currentU?.id && targetId === currentU.id)) {
          setBoard((prev: any) => ({
            ...prev,
            currentUserBoardRole: 'EDITOR',
            canEdit: true,
            canInviteMembers: true,
            isBoardMember: true,
          }));
          setHasPendingEditorRequest(false);
        }
        void fetchBoard(true);
      })
      .on('broadcast', { event: 'EDITOR_REQUEST_REJECTED' }, ({ payload }) => {
        const currentU = userRef.current;
        const targetId = payload?.userId || payload?.user_id || payload?.targetUserId;
        if (!targetId || (currentU?.id && targetId === currentU.id)) {
          setHasPendingEditorRequest(false);
        }
        void fetchBoard(true);
      })
      .on('broadcast', { event: 'MEMBER_JOINED' }, () => fetchBoard(true))
      .subscribe(async (status) => {
        if (!isSubscribed) return;
        console.log(`[Planify Realtime] Kênh board:${boardId} trạng thái:`, status);
        if (status === 'SUBSCRIBED') {
          await trackCurrentPresence();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Planify Realtime] Kết nối gặp sự cố (${status}), tự động thử lại sau 3s...`);
          reconnectTimeout = setTimeout(() => {
            if (isSubscribed && realtimeChannelRef.current === channel) {
              channel.subscribe();
            }
          }, 3000);
        }
      });

    const handleBeforeUnload = () => {
      const me = getCurrentParticipant();
      if (me.id && channel) {
        channel.send({
          type: 'broadcast',
          event: 'USER_PRESENCE_LEAVE',
          payload: { user_id: me.id },
        });
        try {
          channel.untrack();
        } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSubscribed) {
        trackCurrentPresence();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleVisibilityChange);

    const heartbeatInterval = setInterval(() => {
      const me = getCurrentParticipant();
      if (me.id && channel) {
        channel.send({
          type: 'broadcast',
          event: 'USER_PRESENCE_PONG',
          payload: {
            user_id: me.id,
            name: me.name,
            avatar: me.avatar,
            email: me.email,
            isGuest: me.isGuest,
          },
        });
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleVisibilityChange);
      clearInterval(heartbeatInterval);

      const me = getCurrentParticipant();
      if (me.id) {
        channel.send({
          type: 'broadcast',
          event: 'USER_PRESENCE_LEAVE',
          payload: { user_id: me.id },
        });
        try {
          channel.untrack();
        } catch {}
      }
      realtime.removeChannel(channel);
      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }
    };
  }, [boardId, isGuest, getGuestSessionUser]);

  // Tự động kích hoạt track presence ngay khi dữ liệu user sẵn sàng (khi đăng nhập xong hoặc token verify xong)
  useEffect(() => {
    if (realtimeChannelRef.current) {
      const me = user?.id
        ? {
            user_id: user.id,
            name: user.name || user.email || 'Thành viên',
            avatar: user.avatar || null,
            email: user.email || null,
            isGuest: Boolean(isGuest),
            online_at: new Date().toISOString(),
          }
        : getGuestSessionUser();

      realtimeChannelRef.current
        .track(me)
        .then(() => {
          realtimeChannelRef.current?.send({
            type: 'broadcast',
            event: 'USER_PRESENCE_JOIN',
            payload: me,
          });
        })
        .catch(() => {});
    }
  }, [user?.id, user?.name, user?.avatar, isGuest, getGuestSessionUser]);

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
      void alertDialog({ message: err.message || 'Không thể tạo danh sách', variant: 'error' });
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleRenameList = async (listId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const previousLists = board?.lists;

    // 0ms Optimistic UI
    setBoard((prev: any) => {
      if (!prev?.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l: any) =>
          l.id === listId ? { ...l, title: trimmed } : l
        ),
      };
    });

    try {
      await apiClient(`/lists/${listId}`, {
        method: 'PATCH',
        data: { title: trimmed },
      });
    } catch (err: any) {
      if (previousLists) {
        setBoard((prev: any) => ({ ...prev, lists: previousLists }));
      }
      void alertDialog({ message: err.message || 'Không thể đổi tên danh sách', variant: 'error' });
    }
  };

  const handleArchiveBoard = async () => {
    if (
      !(await confirmDialog({
        title: 'Lưu trữ Bảng',
        variant: 'warning',
        confirmText: 'Lưu trữ',
        message: 'Bạn có chắc muốn lưu trữ Bảng này? Bảng sẽ chuyển sang chế độ Chỉ xem (Read-only) và ẩn khỏi danh sách chính.',
      }))
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
      void alertDialog({ message: err.message || 'Không thể lưu trữ Bảng', variant: 'error' });
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
      void alertDialog({ message: err.message || 'Không thể khôi phục Bảng', variant: 'error' });
    }
  };

  const handleDeleteBoard = async () => {
    if (
      !(await confirmDialog({
        title: 'Xóa vĩnh viễn Bảng',
        variant: 'danger',
        confirmText: 'Xóa vĩnh viễn',
        message: `Bạn có CHẮC CHẮN muốn xóa vĩnh viễn Bảng "${board?.name}" cùng toàn bộ thẻ công việc? Hành động này KHÔNG thể hoàn tác.`,
      }))
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
      void alertDialog({ message: err.message || 'Không thể xóa Bảng', variant: 'error' });
    }
  };

  const handleLeaveBoard = async () => {
    if (!(await confirmDialog({ title: 'Rời khỏi Bảng', message: 'Bạn có chắc muốn rời khỏi Bảng này?', variant: 'danger', confirmText: 'Rời khỏi' }))) return;

    try {
      const res = await apiClient(`/boards/${boardId}/leave`, {
        method: 'POST',
      });
      if (res.success) {
        router.push(board?.workspace_id ? `/workspaces/${board.workspace_id}` : '/dashboard');
      }
    } catch (err: any) {
      void alertDialog({ message: err.message || 'Không thể rời Bảng', variant: 'error' });
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!(await confirmDialog({ title: 'Xóa danh sách', message: 'Bạn có chắc chắn muốn xóa danh sách này cùng tất cả các thẻ bên trong?', variant: 'danger', confirmText: 'Xóa' }))) {
      return;
    }

    const previousLists = board?.lists;

    // 0ms Optimistic UI
    setBoard((prev: any) => {
      if (!prev?.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.filter((l: any) => l.id !== listId),
      };
    });

    try {
      await apiClient(`/lists/${listId}`, { method: 'DELETE' });
    } catch (err: any) {
      if (previousLists) {
        setBoard((prev: any) => ({ ...prev, lists: previousLists }));
      }
      void alertDialog({ message: err.message || 'Không thể xóa danh sách', variant: 'error' });
    }
  };

  const handleSortCards = async (
    listId: string,
    sortBy: 'due_date' | 'title' | 'created_at',
    order: 'asc' | 'desc' = 'asc'
  ) => {
    const previousLists = board?.lists;

    // 0ms Optimistic local sort
    setBoard((prev: any) => {
      if (!prev?.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l: any) => {
          if (l.id !== listId) return l;
          const sortedCards = [...(l.cards || [])].sort((a: any, b: any) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (sortBy === 'due_date') {
              valA = valA ? new Date(valA).getTime() : (order === 'asc' ? Infinity : -Infinity);
              valB = valB ? new Date(valB).getTime() : (order === 'asc' ? Infinity : -Infinity);
            } else if (sortBy === 'created_at') {
              valA = valA ? new Date(valA).getTime() : 0;
              valB = valB ? new Date(valB).getTime() : 0;
            } else {
              valA = (valA || '').toString().toLowerCase();
              valB = (valB || '').toString().toLowerCase();
            }
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
          });
          return { ...l, cards: sortedCards };
        }),
      };
    });

    try {
      await apiClient(`/lists/${listId}/sort-cards`, {
        method: 'POST',
        data: { sortBy, order },
      });
    } catch (err: any) {
      if (previousLists) {
        setBoard((prev: any) => ({ ...prev, lists: previousLists }));
      }
      void alertDialog({ message: err.message || 'Không thể sắp xếp thẻ', variant: 'error' });
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

  const handleToggleCardComplete = async (cardId: string, nextCompleted: boolean) => {
    let previousCardState: any = null;

    // 0ms Optimistic UI update
    setBoard((prev: any) => {
      if (!prev?.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((list: any) => ({
          ...list,
          cards: (list.cards || []).map((c: any) => {
            if (c.id === cardId) {
              previousCardState = { ...c };
              return {
                ...c,
                is_due_date_completed: nextCompleted,
                status: nextCompleted ? 'DONE' : 'TODO',
              };
            }
            return c;
          }),
        })),
      };
    });

    try {
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: { is_due_date_completed: nextCompleted },
      });
    } catch (err: any) {
      if (previousCardState) {
        setBoard((prev: any) => {
          if (!prev?.lists) return prev;
          return {
            ...prev,
            lists: prev.lists.map((list: any) => ({
              ...list,
              cards: (list.cards || []).map((c: any) =>
                c.id === cardId ? previousCardState : c
              ),
            })),
          };
        });
      }
      void alertDialog({
        message: err.message || 'Không thể cập nhật trạng thái hoàn thành của thẻ',
        variant: 'error',
      });
    }
  };

  const handleCardPartialUpdate = (partialCard?: any) => {
    if (!partialCard?.id) {
      void fetchBoard(true);
      return;
    }
    setBoard((prev: any) => {
      if (!prev?.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l: any) => ({
          ...l,
          cards: (l.cards || []).map((c: any) =>
            c.id === partialCard.id ? { ...c, ...partialCard } : c
          ),
        })),
      };
    });
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!canEditBoard) return;
    if (!(await confirmDialog({ title: 'Xóa thẻ', message: 'Bạn có chắc chắn muốn xóa thẻ này?', variant: 'danger', confirmText: 'Xóa' }))) return;

    const previousLists = board?.lists;

    // 0ms Optimistic delete
    setBoard((prev: any) => {
      if (!prev?.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((list: any) => ({
          ...list,
          cards: (list.cards || []).filter((c: any) => c.id !== cardId),
        })),
      };
    });

    try {
      await apiClient(`/cards/${cardId}`, { method: 'DELETE' });
    } catch (err: any) {
      console.error('Lỗi xóa thẻ:', err);
      if (previousLists) {
        setBoard((prev: any) => ({ ...prev, lists: previousLists }));
      }
      void alertDialog({ message: 'Không thể xóa thẻ, đang khôi phục dữ liệu...', variant: 'error' });
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
    if (!canEditBoard || draggedCardRef.current) {
      e.preventDefault();
      return;
    }
    boardReadVersion.current++;
    listInsertTargetRef.current = listId;
    draggedListIdRef.current = listId;
    setDraggedListId(listId);
    setListInsertTarget(listId);
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'list', listId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleListDragEnd = () => {
    draggedListIdRef.current = null;
    setDraggedListId(null);
    setListInsertTarget(null);
  };

  const handleListDrop = async (e: React.DragEvent, targetListId: string) => {
    if (!canEditBoard) return;
    const sourceListId = draggedListIdRef.current;
    targetListId = listInsertTargetRef.current || targetListId;
    if (!sourceListId || sourceListId === targetListId) { handleListDragEnd(); return; }

    draggedListIdRef.current = null;
    setDraggedListId(null);
    setListInsertTarget(null);

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


    boardReadVersion.current++;
      const listIds = currentLists.map((l) => l.id);
      dragSaveQueueRef.current!.enqueue('lists', () => apiClient(`/boards/${boardId}/lists/reorder`, { method: 'PATCH', data: { listIds } }));
  };

  // 4. CARD DRAG & DROP HANDLERS (Both inside same list and across lists)
  const handleCardDragStart = (
    e: React.DragEvent,
    cardId: string,
    sourceListId: string
  ) => {
    e.stopPropagation();
    if (!canEditBoard) {
      e.preventDefault();
      return;
    }
    boardReadVersion.current++;
    draggedCardRef.current = { cardId, sourceListId };
    setDraggedSourceListId(sourceListId);
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'card', cardId, sourceListId }));
    e.dataTransfer.setData('application/x-planify-card', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragEnd = () => {
    draggedCardRef.current = null;
    setDraggedSourceListId(null);
    setDraggedCardId(null);
  };

  const handleCardDrop = async (
    e: React.DragEvent,
    targetListId: string,
    targetPosition?: number
  ) => {
    if (!canEditBoard) return;
    const data = draggedCardRef.current;
    draggedCardRef.current = null;
    setDraggedSourceListId(null);
    setDraggedCardId(null);
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


    boardReadVersion.current++;
      dragSaveQueueRef.current!.enqueue(`card:${cardId}`, () => apiClient(`/cards/${cardId}/move`, { method: 'PATCH', data: { targetListId, position: finalTargetPosition } }));
  };

  const targetWorkspaceId =
    board?.workspace_id ||
    userWorkspaces.find((w) => (w.boards || []).some((b: any) => b.id === boardId))?.id;

  if ((accessDenied || (!board && !isLoading))) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 sm:p-10 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="w-14 h-14 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Không thể truy cập Bảng làm việc
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {accessDenied || 'Bạn hiện không phải là thành viên hoặc đã bị xóa khỏi Bảng / Không gian làm việc này.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold rounded-md flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay về Bảng điều khiển (Dashboard)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPhotoBg = Boolean(
    board?.background &&
      (board.background.startsWith('http') || board.background.startsWith('data:'))
  );

  return (
    <>
      <div
        className="h-full min-h-0 flex flex-col overflow-hidden relative bg-dot-pattern"
        style={{
          background: isPhotoBg ? undefined : board?.background || undefined,
          backgroundImage: isPhotoBg ? `url("${board.background}")` : undefined,
          backgroundSize: isPhotoBg ? 'cover' : undefined,
          backgroundPosition: isPhotoBg ? 'center' : undefined,
        }}
      >
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
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục Bảng</span>
                </button>
                <button
                  onClick={handleDeleteBoard}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa vĩnh viễn</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Board Top Navigation Bar */}
        <div
          className={`h-14 px-6 border-b flex items-center justify-between shrink-0 select-none transition-colors duration-200 relative z-20 ${
            board?.background
              ? 'border-white/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Isolated Background Layer (Fixes Chromium backdrop-filter child stacking/clipping bug) */}
          {board?.background && (
            <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md pointer-events-none -z-10" />
          )}
          {/* Left: Back button & Board Name & Badges */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={!isGuest && targetWorkspaceId ? `/workspaces/${targetWorkspaceId}` : '/dashboard'}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title={isGuest ? 'Quay lại Tổng quan (Các bảng dạng khách)' : 'Quay lại Không gian làm việc'}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-2 min-w-0">
              {/* Quick Board Icon / Favicon Button */}
              {canEditBoard && !board?.is_archived ? (
                <button
                  type="button"
                  onClick={() => setIsAppearanceOpen(true)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-base sm:text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs overflow-hidden"
                  title="Nhấp để đổi biểu tượng hoặc hình nền Bảng"
                >
                  {board?.icon &&
                  (board.icon.startsWith('http') ||
                    board.icon.startsWith('data:image') ||
                    board.icon.startsWith('blob:')) ? (
                    <img src={board.icon} alt="" className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <span>{board?.icon || '🎨'}</span>
                  )}
                </button>
              ) : board?.icon ? (
                board.icon.startsWith('http') ||
                board.icon.startsWith('data:image') ||
                board.icon.startsWith('blob:') ? (
                  <img src={board.icon} alt="" className="w-5 h-5 rounded object-cover shrink-0" title="Biểu tượng Bảng" />
                ) : (
                  <span className="text-base sm:text-lg leading-none shrink-0" title="Biểu tượng Bảng">
                    {board.icon}
                  </span>
                )
              ) : null}

              <div className="relative group/boardTitle flex items-center min-w-0">
                <h1
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[130px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[280px] cursor-default"
                >
                  {board?.name || 'Đang tải Bảng...'}
                </h1>

                {/* Styled Tooltip on hover */}
                {board?.name && (
                  <div className="absolute left-0 top-full mt-1.5 z-30 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-md shadow-md pointer-events-none opacity-0 group-hover/boardTitle:opacity-100 transition-opacity duration-150 whitespace-normal min-w-max max-w-xs break-words">
                    {board.name}
                  </div>
                )}
              </div>

              {/* Guest & Viewer Status Badges */}
              {isGuest && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0"
                  title="Bạn đang truy cập bảng này với tư cách Khách"
                >
                  <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Khách</span>
                </span>
              )}

              {isViewer && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0"
                  title="Chế độ chỉ xem (Không có quyền chỉnh sửa nội dung)"
                >
                  <Eye className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>Chỉ xem</span>
                </span>
              )}

              {/* Favorite Star Button */}
              <button
                onClick={handleToggleFavorite}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 dark:text-slate-500 hover:text-amber-500"
                title={board?.is_favorite ? 'Bỏ gắn sao' : 'Gắn sao yêu thích'}
              >
                <Star
                  className={`w-3.5 h-3.5 transition-transform active:scale-125 ${board?.is_favorite ? 'text-amber-500 fill-amber-500' : ''
                    }`}
                />
              </button>

              {/* Interactive Visibility Dropdown */}
              <div className="relative shrink-0" ref={visibilityMenuRef}>
                <button
                  type="button"
                  disabled={isUpdatingVisibility || !canChangeVisibility}
                  onClick={() => {
                    if (canChangeVisibility) {
                      setIsVisibilityMenuOpen(!isVisibilityMenuOpen);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                    canChangeVisibility
                      ? 'cursor-pointer hover:shadow-2xs active:scale-95'
                      : 'cursor-default opacity-85'
                  } ${
                    board?.visibility === 'PRIVATE'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100/70 dark:hover:bg-rose-900/60'
                      : board?.visibility === 'PUBLIC'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                  }`}
                  title={
                    canChangeVisibility
                      ? 'Nhấp để thay đổi quyền hiển thị Bảng'
                      : 'Quyền hiển thị Bảng (Chỉ Quản trị viên Board hoặc Quản trị viên / Chủ sở hữu Workspace mới có quyền đổi)'
                  }
                >
                  {board?.visibility === 'PRIVATE' ? (
                    <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : board?.visibility === 'PUBLIC' ? (
                    <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Users className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0" />
                  )}
                  <span>
                    {board?.visibility === 'PRIVATE'
                      ? 'Riêng tư'
                      : board?.visibility === 'PUBLIC'
                      ? 'Công khai'
                      : 'Không gian'}
                  </span>
                  {canChangeVisibility && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform text-slate-400 shrink-0 ${
                        isVisibilityMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Dropdown Popover */}
                {isVisibilityMenuOpen && canChangeVisibility && (
                  <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Quyền hiển thị Bảng
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Ai có thể tìm thấy và truy cập Bảng này
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* WORKSPACE */}
                      <button
                        type="button"
                        onClick={() => handleRequestUpdateVisibility('WORKSPACE')}
                        className={`w-full text-left p-2 rounded-md transition-colors flex items-start gap-2.5 cursor-pointer ${
                          board.visibility === 'WORKSPACE'
                            ? 'bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-slate-300 dark:ring-slate-700'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Không gian làm việc</span>
                            {board.visibility === 'WORKSPACE' && (
                              <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                            Mọi thành viên trong Workspace đều có thể xem và làm việc trên bảng này.
                          </p>
                        </div>
                      </button>

                      {/* PRIVATE */}
                      <button
                        type="button"
                        onClick={() => handleRequestUpdateVisibility('PRIVATE')}
                        className={`w-full text-left p-2 rounded-md transition-colors flex items-start gap-2.5 cursor-pointer ${
                          board.visibility === 'PRIVATE'
                            ? 'bg-rose-50/90 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-300 dark:ring-rose-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0 mt-0.5 text-rose-600 dark:text-rose-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Riêng tư (Private)</span>
                            {board.visibility === 'PRIVATE' && (
                              <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                            Chỉ những thành viên được mời trực tiếp vào Bảng mới có quyền truy cập.
                          </p>
                        </div>
                      </button>

                      {/* PUBLIC */}
                      <button
                        type="button"
                        onClick={() => handleRequestUpdateVisibility('PUBLIC')}
                        className={`w-full text-left p-2 rounded-md transition-colors flex items-start gap-2.5 cursor-pointer ${
                          board.visibility === 'PUBLIC'
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-300 dark:ring-emerald-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Công khai (Public)</span>
                            {board.visibility === 'PUBLIC' && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                            Bất kỳ ai có đường link đều có thể xem bảng này (chỉ xem đối với người ngoài).
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* View Switcher Dropdown */}
            <div className="hidden sm:block h-4 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />
            <BoardViewSwitcher
              activeView={activeView}
              onViewChange={setActiveView}
            />

            {/* Standalone Analytics Button */}
            <button
              type="button"
              onClick={() => setActiveView(activeView === 'analytics' ? 'kanban' : 'analytics')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 border ${
                activeView === 'analytics'
                  ? 'shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              style={
                activeView === 'analytics'
                  ? {
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-contrast, #ffffff)',
                      borderColor: 'var(--color-primary-dark)',
                    }
                  : undefined
              }
              title="Xem thống kê và phân tích bảng"
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Thống kê</span>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Button */}
            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setIsFilterModalOpen((open) => !open)}
              aria-expanded={isFilterModalOpen}
              aria-controls="board-filter-panel"
              aria-haspopup="dialog"
              className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border ${
                activeFilterCount > 0
                  ? 'shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              style={
                activeFilterCount > 0
                  ? {
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-contrast, #ffffff)',
                      borderColor: 'var(--color-primary-dark)',
                    }
                  : undefined
              }
              title="Mở bảng Lọc"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lọc</span>
              {activeFilterCount > 0 && (
                <span className="min-w-[15px] h-3.5 px-1 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* AI tools */}
            <div className="relative" ref={aiMenuRef}>
              <button
                type="button"
                onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
                className="h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 aria-expanded:bg-slate-100 dark:aria-expanded:bg-slate-700 aria-expanded:text-slate-900 dark:aria-expanded:text-white"
                title="Mở công cụ AI"
                aria-expanded={isAiMenuOpen}
                aria-controls="board-ai-tools"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {isAiMenuOpen && (
                <div id="board-ai-tools" className="absolute right-0 top-full mt-1.5 w-64 p-1 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 space-y-0.5 text-xs select-none z-30">
                  <button
                    onClick={() => {
                      setIsAiMenuOpen(false);
                      setIsCopilotOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>AI Copilot (Hỏi đáp)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAiMenuOpen(false);
                      setIsRiskScannerOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>AI Quét rủi ro & Điểm nghẽn</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAiMenuOpen(false);
                      setIsAiStandupOpen(true);
                      if (!aiStandupData) handleGenerateDailyStandup();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>AI Daily Standup</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter / Result count badge */}
            {activeFilterCount > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium">
                <span>{totalFilteredCards}/{totalAllCards} thẻ</span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Xóa tất cả bộ lọc"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Active Board Buttons */}
            {boardButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleExecuteBoardButton(btn)}
                disabled={executingBoardButtonId === btn.id}
                className="h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer border bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 shadow-2xs disabled:opacity-50"
                title={`Thực thi: ${btn.name}`}
              >
                {executingBoardButtonId === btn.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>{btn.button_label || btn.name}</span>
              </button>
            ))}

            {/* Automation Button */}
            {canEditBoard && (
              <button
                type="button"
                onClick={() => setIsAutomationModalOpen(true)}
                className="h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                title="Mở bảng Tự động hóa (Automation)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="hidden sm:inline">Tự động hóa</span>
              </button>
            )}

            <div className="hidden sm:block h-4 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />

            {/* Google Docs-Style Live Presence Bar (Avatars for active members and guests) */}
            <LivePresenceBar
              activeUsers={activeUsersList}
              currentUserId={user?.id}
              onOpenShareModal={() => setIsShareOpen(true)}
            />

            {/* Share Button */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="px-2.5 py-1 btn-secondary text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>

            {/* Board Settings & Options Dropdown Menu */}
            <div className="relative" ref={boardMenuRef}>
              <button
                type="button"
                onClick={() => setIsBoardMenuOpen(!isBoardMenuOpen)}
                className="h-7 w-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 aria-expanded:bg-slate-100 dark:aria-expanded:bg-slate-700 aria-expanded:text-slate-900 dark:aria-expanded:text-white"
                title="Tùy chọn Bảng"
                aria-expanded={isBoardMenuOpen}
                aria-controls="board-options-panel"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isBoardMenuOpen && (
                <div id="board-options-panel" className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-xs select-none z-30 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
                    Tùy chọn bảng
                  </div>
                  <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        setIsBoardActivityOpen(true);
                        fetchBoardActivities();
                      }}
                      className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                    >
                      <History className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span>Lịch sử hoạt động Bảng</span>
                    </button>

                    {canEditBoard && (
                      <button
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          setIsAutomationModalOpen(true);
                        }}
                        className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500 fill-amber-500" />
                        <span>Tự động hóa (Automation)</span>
                      </button>
                    )}

                    {canEditBoard && (
                      <button
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          setIsCustomFieldsModalOpen(true);
                        }}
                        className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>Trường tùy chỉnh (Custom Fields)</span>
                      </button>
                    )}

                    {canEditBoard && !board?.is_archived && (
                      <>
                        <button
                          onClick={() => {
                            setIsBoardMenuOpen(false);
                            setIsAppearanceOpen(true);
                          }}
                          className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                        >
                          <Palette className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                          <span>Đổi hình nền & Biểu tượng</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsBoardMenuOpen(false);
                            setIsEditOpen(true);
                          }}
                          className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                          <span>Chỉnh sửa thông tin Bảng</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        setIsCopyOpen(true);
                      }}
                      className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span>Nhân bản Bảng (Copy)</span>
                    </button>

                    {!isGuest && (
                      <button
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          setIsSaveAsTemplateOpen(true);
                        }}
                        className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>Lưu thành Mẫu (Template)</span>
                      </button>
                    )}

                    {canEditBoard && (
                      <button
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          setIsImportModalOpen(true);
                        }}
                        className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>Nhập dữ liệu (Import)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        setIsExportModalOpen(true);
                      }}
                      className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span>Xuất dữ liệu (Export)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        setIsShareOpen(true);
                      }}
                      className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span>Quản lý thành viên & Quyền</span>
                    </button>

                    {board?.canDelete && !isGuest && (
                      <>
                        <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                        {board.is_archived ? (
                          <button
                            onClick={() => {
                              setIsBoardMenuOpen(false);
                              handleRestoreBoard();
                            }}
                            className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>Khôi phục Bảng</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleArchiveBoard}
                            className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>Lưu trữ Bảng (Archive)</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setIsBoardMenuOpen(false);
                            handleDeleteBoard();
                          }}
                          className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-[#dc2626] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0 text-[#dc2626] dark:text-rose-400" />
                          <span>Xóa Bảng vĩnh viễn</span>
                        </button>
                      </>
                    )}

                    {!board?.canDelete && (
                      <>
                        <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                        <button
                          onClick={() => {
                            setIsBoardMenuOpen(false);
                            handleLeaveBoard();
                          }}
                          className="w-full min-h-7 text-left px-2.5 py-1 rounded-md font-medium text-[#dc2626] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 leading-4 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 shrink-0 text-[#dc2626] dark:text-rose-400" />
                          <span>Rời khỏi Bảng</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Viewer Action Bar */}
        {isViewer && !board?.is_archived && (
          <div className="bg-gradient-to-r from-blue-50/95 via-indigo-50/90 to-sky-50/95 border-b border-blue-200/60 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 z-15 backdrop-blur-xs transition-all shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-900">Chế độ xem:</span>{' '}
                <span className="text-slate-600">
                  Bạn đang xem bảng này với quyền Chỉ xem (Viewer).
                </span>
                {editorActionMessage && (
                  <span className="ml-2 font-medium text-emerald-600 animate-in fade-in">
                    • {editorActionMessage}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canClaimEditor({
                editor_join_mode: editorJoinMode,
                boardRole: 'VIEWER',
                isWorkspaceMember,
                isGuest,
              }) ? (
                <button
                  type="button"
                  onClick={handleClaimEditor}
                  disabled={isSubmittingEditorAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-60"
                  title="Tự động gia nhập bảng với quyền Biên tập viên"
                >
                  {isSubmittingEditorAction ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  )}
                  <span>Tham gia làm Biên tập viên</span>
                </button>
              ) : hasPendingEditorRequest ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-amber-800 bg-amber-100/80 border border-amber-300/70 select-none">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Đã gửi yêu cầu quyền Biên tập (Đang chờ Admin duyệt)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestEditor}
                  disabled={isSubmittingEditorAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 active:scale-98 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60"
                  title="Gửi yêu cầu tới Quản trị viên Bảng để được cấp quyền Biên tập viên"
                >
                  {isSubmittingEditorAction ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  ) : (
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Yêu cầu quyền Biên tập viên</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Multi-view Container */}
        {activeView === 'kanban' && (
          <div ref={boardViewportRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-6 relative z-10"
            onDragOverCapture={(e) => {
              if (!draggedListIdRef.current && !draggedCardRef.current) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              dragPointerRef.current = { x: e.clientX, y: e.clientY };
              if (draggedListIdRef.current) { e.stopPropagation(); updateListInsertion(e.clientX); }
            }}
            onDropCapture={(e) => {
              if (draggedListIdRef.current) {
                e.preventDefault(); e.stopPropagation();
                updateListInsertion(e.clientX);
                void handleListDrop(e, listInsertTargetRef.current || draggedListIdRef.current);
                return;
              }
              if (!draggedCardRef.current) return;
              e.preventDefault(); e.stopPropagation();
              const slots = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-list-slot]'));
              const slot = slots.reduce<HTMLElement | null>((best, candidate) => {
                const rect = candidate.getBoundingClientRect();
                const distance = Math.abs(e.clientX - (rect.left + rect.width / 2));
                if (!best) return candidate;
                const previous = best.getBoundingClientRect();
                return distance < Math.abs(e.clientX - (previous.left + previous.width / 2)) ? candidate : best;
              }, null);
              const targetId = slot?.dataset.listSlot;
              if (!slot || !targetId) return;
              const hoveredCard = Array.from(slot.querySelectorAll<HTMLElement>('[data-kanban-card]')).find(el => {
                const rect = el.getBoundingClientRect(); return e.clientY < rect.top + rect.height / 2;
              });
              const targetList = board?.lists?.find((list: any) => list.id === targetId);
              const position = hoveredCard ? targetList?.cards?.findIndex((card: any) => card.id === hoveredCard.dataset.kanbanCard) : targetList?.cards?.length;
              void handleCardDrop(e, targetId, position >= 0 ? position : targetList?.cards?.length);
            }}
          >
            {dragSaveError && <div role="alert" className="absolute left-6 top-1 z-30 rounded border border-red-200 bg-white px-3 py-2 text-xs text-red-700">Chưa đồng bộ: {dragSaveError}. Vị trí đang giữ trên máy này. <button className="underline" onClick={() => { setDragSaveError(''); dragSaveQueueRef.current?.retry(); }}>Thử lại</button></div>}
            {isPersistingDrag && <div role="status" className="absolute right-6 top-1 z-30 rounded bg-white px-2 py-1 text-xs text-slate-500">Đang đồng bộ… Bạn có thể kéo tiếp.</div>}
            {isLoading ? (
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-72 h-96 rounded-lg bg-slate-100/80 border border-slate-200 animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-5 h-full select-none">
                {/* Render List Columns */}
                {filteredLists.map((list: any) => (
                  <ListColumn
                    key={list.id}
                    list={list}
                    isListDragActive={draggedListId !== null}
                    isDraggingList={draggedListId === list.id}
                    listShift={(() => {
                      const source = filteredLists.findIndex((l: any) => l.id === draggedListId);
                      const target = filteredLists.findIndex((l: any) => l.id === listInsertTarget);
                      const index = filteredLists.findIndex((l: any) => l.id === list.id);
                      if (source < 0 || target < 0 || index === source) return 0;
                      if (source < target && index > source && index <= target) return -308;
                      if (source > target && index >= target && index < source) return 308;
                      return 0;
                    })()}
                    boardLists={board.lists}
                    canEdit={canEditBoard}
                    onOpenCardDetail={handleOpenCardDetail}
                    onRefreshBoard={() => fetchBoard(true)}
                    onToggleCardComplete={handleToggleCardComplete}
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
                    draggedCardId={draggedCardId}
                    draggedSourceListId={draggedSourceListId}
                    activeUserIds={activeUserIds}
                  />
                ))}

                {/* Add New List Column at End */}
                {!board?.is_archived && canEditBoard && (
                  <div className="w-72 shrink-0">
                    {isAddingListInline ? (
                      <form
                        onSubmit={handleCreateInlineList}
                        className="p-3 bg-[#f1f5f9] border border-slate-200 rounded-lg space-y-2 animate-in fade-in duration-100"
                      >
                        <input
                          ref={addListInputRef}
                          type="text"
                          value={inlineListTitle}
                          onChange={(e) => setInlineListTitle(e.target.value)}
                          placeholder="Nhập tên danh sách mới..."
                          className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:border-[#87ceeb]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="submit"
                            disabled={!inlineListTitle.trim() || isSubmittingList}
                            className="px-2.5 py-1 bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            {isSubmittingList ? 'Đang thêm...' : 'Thêm danh sách'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingListInline(false);
                              setInlineListTitle('');
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingListInline(true)}
                        className="w-full p-3 bg-white/70 hover:bg-white border border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
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
          <div className="flex-1 min-h-0 overflow-hidden relative z-10">
            <BoardTableView
              board={effectiveBoard || board}
              onOpenCardDetail={handleOpenCardDetail}
              onRefreshBoard={() => fetchBoard(true)}
              onDeleteCard={handleDeleteCard}
            />
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="flex-1 min-h-0 overflow-hidden relative z-10">
            <BoardCalendarView
              board={effectiveBoard || board}
              onOpenCardDetail={handleOpenCardDetail}
              onRefreshBoard={() => fetchBoard(true)}
            />
          </div>
        )}

        {/* Schedule / Timeline View */}
        {activeView === 'schedule' && (
          <div className="flex-1 min-h-0 overflow-hidden relative z-10">
            <BoardScheduleView
              board={effectiveBoard || board}
              onOpenCardDetail={handleOpenCardDetail}
              onRefreshBoard={() => fetchBoard(true)}
            />
          </div>
        )}

        {/* Analytics / Statistics View */}
        {activeView === 'analytics' && (
          <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
            <BoardAnalyticsView
              boardId={boardId}
              onCardClick={handleOpenCardDetail}
            />
          </div>
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
        activeUserIds={activeUserIds}
        onClose={() => setIsShareOpen(false)}
        onUpdated={() => fetchBoard()}
      />

      <EditBoardModal
        isOpen={isEditOpen}
        board={board}
        onClose={() => setIsEditOpen(false)}
        onUpdated={() => fetchBoard()}
        onOpenAppearance={() => setIsAppearanceOpen(true)}
      />

      <BoardAppearanceModal
        isOpen={isAppearanceOpen}
        board={board}
        onClose={() => setIsAppearanceOpen(false)}
        onUpdated={() => fetchBoard(true)}
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

      <ExportBoardModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        boardId={boardId}
        boardTitle={board?.name}
      />

      <ImportBoardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        workspaceId={board?.workspace_id}
        currentBoardId={boardId}
        currentBoardTitle={board?.name}
        onSuccess={(targetId) => {
          if (targetId && targetId !== boardId) {
            router.push(`/boards/${targetId}`);
          } else {
            fetchBoard();
          }
        }}
      />

      {/* Confirmation Modal for Visibility Change */}
      {confirmingVisibility && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 sm:p-6 relative animate-in zoom-in-95 duration-150 space-y-4">
            <button
              type="button"
              onClick={() => setConfirmingVisibility(null)}
              className="absolute top-3.5 right-3.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  confirmingVisibility === 'PRIVATE'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmingVisibility === 'PUBLIC'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-[#ffc0cb]/30 text-[#d86969]'
                }`}
              >
                {confirmingVisibility === 'PRIVATE' ? (
                  <Lock className="w-5 h-5" />
                ) : confirmingVisibility === 'PUBLIC' ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmingVisibility === 'PRIVATE'
                    ? 'Đổi sang Riêng tư (Private)?'
                    : confirmingVisibility === 'PUBLIC'
                    ? 'Đổi sang Công khai (Public)?'
                    : 'Đổi sang Không gian làm việc?'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Xác nhận thay đổi quyền hiển thị của Bảng
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
              {confirmingVisibility === 'PRIVATE' && (
                <span>
                  Chỉ những thành viên <strong>được mời trực tiếp</strong> vào Bảng mới có thể xem và truy cập. Các thành viên khác trong Workspace sẽ không thể thấy hoặc mở bảng này nữa.
                </span>
              )}
              {confirmingVisibility === 'PUBLIC' && (
                <span>
                  Bất kỳ ai có đường liên kết đều có thể <strong>xem nội dung</strong> của Bảng này (chế độ chỉ xem đối với người ngoài). Hãy đảm bảo Bảng không chứa dữ liệu nhạy cảm.
                </span>
              )}
              {confirmingVisibility === 'WORKSPACE' && (
                <span>
                  <strong>Mọi thành viên</strong> trong Không gian làm việc này đều có quyền tìm thấy, xem và làm việc trên Bảng này.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmingVisibility(null)}
                disabled={isUpdatingVisibility}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isUpdatingVisibility}
                onClick={handleConfirmUpdateVisibility}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  confirmingVisibility === 'PRIVATE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmingVisibility === 'PUBLIC'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#f28d8d] hover:bg-[#e57a7a]'
                }`}
              >
                {isUpdatingVisibility && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>
                  {confirmingVisibility === 'PRIVATE'
                    ? 'Chuyển sang Riêng tư'
                    : confirmingVisibility === 'PUBLIC'
                    ? 'Chuyển sang Công khai'
                    : 'Chuyển sang Không gian'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Card Detail Modal */}
      <CardDetailModal
        cardId={selectedCardId}
        boardId={boardId}
        boardVisibility={board?.visibility}
        workspaceMembers={workspaceMembers}
        workspaceId={board?.workspace_id}
        realtimeUpdatedCardId={realtimeUpdatedCardId}
        isOpen={isCardDetailOpen}
        onClose={handleCloseCardDetail}
        onCardUpdated={(partial) => {
          if (partial) {
            handleCardPartialUpdate(partial);
          } else {
            void fetchBoard(true);
          }
        }}
        onMoveRequest={(c) => setMovingCard(c)}
        onCopyRequest={(c) => setCopyingCard(c)}
        onSelectCard={(cId) => setSelectedCardId(cId)}
        activeUserIds={activeUserIds}
        canEdit={canEditBoard}
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
        <div className="fixed inset-0 z-70 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsAiStandupOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-lg border border-slate-300 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#f28d8d] text-white flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>AI Daily Standup & Báo Cáo Tiến Độ</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-[#ffc0cb]/30 text-[#d86969] border border-[#ffc0cb]/80 font-mono">Gemini 3.6 Flash</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bảng: <strong className="text-slate-800">{board?.name}</strong> • Tổng hợp từ trạng thái thẻ & hoạt động
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAiStandupOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Ribbon */}
            {aiStandupData && (
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Tổng số thẻ:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.2 rounded-xs border border-slate-200">
                      {aiStandupData.totalCards ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Đã hoàn thành:</span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-xs border border-emerald-200">
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
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Tạo lại báo cáo mới nhất"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAiStandup ? 'animate-spin' : ''}`} />
                  <span>Cập nhật</span>
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {isLoadingAiStandup ? (
                <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-[#f28d8d] animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800">Gemini đang phân tích dữ liệu Bảng...</h4>
                    <p className="text-[11px] text-slate-500 max-w-sm">
                      Đang đọc danh sách thẻ, tiến độ hoàn thành và lịch sử 25 hoạt động gần đây nhất để tạo báo cáo Daily Standup.
                    </p>
                  </div>
                </div>
              ) : aiStandupError ? (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Không thể tạo báo cáo AI</span>
                  </div>
                  <p className="leading-relaxed">{aiStandupError}</p>
                  <button
                    onClick={handleGenerateDailyStandup}
                    className="px-3 py-1 bg-rose-600 text-white rounded-md font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : aiStandupData?.reportMarkdown ? (
                <div className="bg-white p-4 rounded-md border border-slate-200">
                  <MarkdownRenderer content={aiStandupData.reportMarkdown} />
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-slate-400" />
                  <p>Bấm nút bên dưới để tạo báo cáo Daily Standup tự động.</p>
                  <button
                    onClick={handleGenerateDailyStandup}
                    className="px-3.5 py-1.5 bg-[#f28d8d] hover:bg-[#e57a7a] text-white font-semibold rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    Tạo báo cáo ngay
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              {aiStandupData?.reportMarkdown ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Button 1: Copy for Zalo (Clean, formatted memo) */}
                  <button
                    onClick={handleCopyZalo}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      copyMode === 'zalo'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#f28d8d] hover:bg-[#e57a7a] text-white shadow-2xs'
                    }`}
                    title="Sao chép báo cáo sạch đẹp, phù hợp dán vào Zalo / Teams / Messenger"
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
                    className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      copyMode === 'markdown'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
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
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
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
                  <div className="w-8 h-8 rounded-md bg-[#87ceeb] flex items-center justify-center text-slate-900 shadow-2xs">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Hoạt động Bảng</h3>
                    <p className="text-[11px] text-slate-400">
                      Lịch sử thao tác trên bảng và các thẻ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchBoardActivities}
                    disabled={isLoadingBoardActivities}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Làm mới"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingBoardActivities ? 'animate-spin text-[#f28d8d]' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsBoardActivityOpen(false)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setBoardActivityFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${boardActivityFilter === 'all'
                    ? 'bg-[#87ceeb] text-slate-900 border border-[#72bde0] shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Tất cả ({boardActivities.length})
                </button>
                <button
                  onClick={() => setBoardActivityFilter('card')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${boardActivityFilter === 'card'
                    ? 'bg-[#87ceeb] text-slate-900 border border-[#72bde0] shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Thẻ ({boardActivities.filter((a) => a.target_type.startsWith('card:')).length})
                </button>
                <button
                  onClick={() => setBoardActivityFilter('board')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${boardActivityFilter === 'board'
                    ? 'bg-[#87ceeb] text-slate-900 border border-[#72bde0] shadow-2xs'
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
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-700" />
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
                      <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 p-6">
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
                    return <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
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

                  const activityBlocks = filtered.map((act) => {
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
                        className={`p-3 rounded-md border transition-all ${cardId
                          ? 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-2xs hover:shadow-xs cursor-pointer hover:border-slate-300'
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
                            <div className="w-7 h-7 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                              {actorName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-slate-900 truncate">
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
                              <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 w-fit px-2 py-0.5 rounded-xs transition-colors">
                                <span>Xem chi tiết thẻ</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });

                  return (
                    <>
                      {activityBlocks}
                      {hasMoreBoardActivities && (
                        <div className="pt-2 flex justify-center">
                          <button
                            onClick={handleLoadMoreBoardActivities}
                            disabled={isLoadingMoreBoardActivities}
                            className="px-4 py-2 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                          >
                            {isLoadingMoreBoardActivities && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{isLoadingMoreBoardActivities ? 'Đang tải thêm...' : 'Tải thêm hoạt động cũ hơn'}</span>
                          </button>
                        </div>
                      )}

                      {!hasMoreBoardActivities && boardActivities.length > 0 && (
                        <div className="py-2 text-center text-[11px] text-slate-400 font-medium">
                          Đã hiển thị tất cả hoạt động
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Copilot Trigger */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-30 px-3.5 py-2 rounded-md shadow-md transition-all flex items-center gap-2 cursor-pointer group hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-primary-contrast, #ffffff)',
          border: '1px solid var(--color-primary-dark)',
        }}
        title="Mở Trợ lý AI Copilot"
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span className="text-xs font-semibold tracking-wide">AI Copilot</span>
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

      {/* Comprehensive Board Filter Modal matching Trello design */}
      <BoardFilterModal
        isOpen={isFilterModalOpen}
        anchorRef={filterButtonRef}
        onClose={() => setIsFilterModalOpen(false)}
        filters={boardFilters}
        onChangeFilters={setBoardFilters}
        onResetFilters={handleResetFilters}
        boardMembers={board?.members || []}
        boardLabels={boardLabels}
        currentUser={user}
        totalFilteredCards={totalFilteredCards}
        totalAllCards={totalAllCards}
        allCards={allBoardCards}
      />

      {/* Custom Fields Modal */}
      {isCustomFieldsModalOpen && (
        <CustomFieldsModal
          boardId={boardId}
          isOpen={isCustomFieldsModalOpen}
          onClose={() => setIsCustomFieldsModalOpen(false)}
          onFieldsChange={fetchBoard}
        />
      )}

      {/* Automation Modal */}
      {isAutomationModalOpen && (
        <AutomationModal
          boardId={boardId}
          isOpen={isAutomationModalOpen}
          onClose={() => setIsAutomationModalOpen(false)}
          boardLists={board?.lists || []}
          boardLabels={boardLabels}
          boardMembers={board?.members || []}
          onAutomationsChanged={() => {
            fetchBoard(true);
            fetchBoardButtons();
          }}
        />
      )}

    </>
  );
}
