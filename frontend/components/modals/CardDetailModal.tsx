'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  X,
  Eye,
  Calendar,
  CheckSquare,
  Copy,
  Link as LinkIcon,
  ArrowRightLeft,
  Trash2,
  AlignLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  Tag,
  Check,
  Plus,
  Edit2,
  ListTodo,
  ChevronDown,
  Bell,
  BellOff,
  Users,
  UserPlus,
  Search,
  ArrowLeft,
  MessageSquare,
  Send,
  AtSign,
  CornerDownLeft,
  MessageCircle,
  Paperclip,
  FileText,
  File,
  Download,
  ExternalLink,
  Image as ImageIcon,
  FileCode,
  FileArchive,
  Upload,
  Maximize2,
  History,
  RefreshCw,
  GitBranch,
  Link2,
  Unlink,
  ShieldAlert,
  FolderTree,
  Layers,
  CopyCheck,
  ChevronRight,
  Sparkles,
  Wand2,
  Bot,
  SlidersHorizontal,
  Hash,
  Square,
  Type,
  Star,
  Percent,
  DollarSign,
  Mail,
  Phone,
  ListFilter,
  Settings2,
  Loader2,
} from 'lucide-react';
import { ActivityItem } from '@/components/modals/MyActivityModal';
import CustomFieldsModal, { CustomField, FIELD_TYPE_CONFIG } from '@/components/modals/CustomFieldsModal';

export interface CardRelationItem {
  id: string;
  card_id: string;
  related_card_id: string;
  type: 'BLOCKS' | 'BLOCKED_BY' | 'PARENT' | 'SUBTASK' | 'RELATES_TO' | 'DUPLICATE';
  related_card?: {
    id: string;
    title: string;
    status: string;
    start_date?: string | null;
    due_date?: string | null;
    is_due_date_completed?: boolean;
    list_id: string;
    list?: {
      id: string;
      title?: string;
      name?: string;
      board_id: string;
      board?: {
        id: string;
        name: string;
        workspace_id: string;
      };
    };
    card_assignees?: Array<{
      user?: {
        id: string;
        name: string;
        avatar?: string | null;
        email?: string;
      };
    }>;
    card_labels?: Array<{
      label?: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  };
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_completed: boolean;
  position: number;
  due_date?: string | null;
  user_id?: string | null;
  user?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  } | null;
  member_id?: string | null;
  member?: {
    id: string;
    role?: string;
    user?: {
      id: string;
      name: string;
      email?: string;
      avatar?: string;
    };
  } | null;
}

interface Checklist {
  id: string;
  card_id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
}

interface CommentUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface CardComment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: CommentUser;
}

export interface CardAttachment {
  id: string;
  card_id: string;
  file_name?: string | null;
  file_url?: string | null;
  file_size?: number | null;
  created_at?: string | null;
}

interface CardDetailModalProps {
  cardId: string | null;
  boardId?: string;
  boardVisibility?: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC';
  realtimeUpdatedCardId?: { id: string; timestamp: number } | null;
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated: () => void;
  onMoveRequest: (card: any) => void;
  onCopyRequest: (card: any) => void;
  workspaceMembers?: any[];
  workspaceId?: string;
  onSelectCard?: (cardId: string) => void;
  activeUserIds?: Set<string>;
  canEdit?: boolean;
}

const LABEL_COLOR_PALETTE = [
  { color: '#10b981', name: 'Xanh lá' },
  { color: '#3b82f6', name: 'Xanh dương' },
  { color: '#0ea5e9', name: 'Xanh da trời' },
  { color: '#8b5cf6', name: 'Tím hoa cà' },
  { color: '#ec4899', name: 'Hồng phấn' },
  { color: '#ef4444', name: 'Đỏ' },
  { color: '#f59e0b', name: 'Vàng' },
  { color: '#f97316', name: 'Cam sáng' },
  { color: '#6366f1', name: 'Chàm' },
  { color: '#64748b', name: 'Xám đá' },
];

const REMINDER_OPTIONS = [
  { value: -1, label: 'Không có lời nhắc' },
  { value: 0, label: 'Vào thời điểm hết hạn' },
  { value: 5, label: 'Trước 5 phút' },
  { value: 10, label: 'Trước 10 phút' },
  { value: 15, label: 'Trước 15 phút' },
  { value: 60, label: 'Trước 1 giờ' },
  { value: 120, label: 'Trước 2 giờ' },
  { value: 1440, label: 'Trước 1 ngày' },
  { value: 2880, label: 'Trước 2 ngày' },
];

const DROPDOWN_PRESET_OPTIONS: Record<string, string[]> = {
  'Mức độ ưu tiên': ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'],
  'Ưu tiên': ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'],
  'Priority': ['Low', 'Medium', 'High', 'Urgent'],
  'Môi trường': ['Production', 'Staging', 'Develop', 'Testing'],
  'Nền tảng thiết kế': ['Figma', 'Web UI', 'Mobile App', 'Design System'],
  'Giai đoạn': ['Tiếp cận', 'Demo/Báo giá', 'Thương lượng', 'Đã chốt'],
  'Kênh triển khai': ['Facebook Ads', 'Google Ads', 'SEO/Blog', 'Email Marketing', 'Tiktok'],
  'Trạng thái phê duyệt': ['Chờ duyệt', 'Đã duyệt', 'Cần sửa đổi', 'Từ chối'],
};

function getDropdownOptionsForField(fieldName: string): string[] {
  for (const [key, opts] of Object.entries(DROPDOWN_PRESET_OPTIONS)) {
    if (fieldName.toLowerCase().includes(key.toLowerCase())) {
      return opts;
    }
  }
  return ['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3'];
}

function toLocalDatetimeString(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultDueDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 0, 0, 0);
  return toLocalDatetimeString(tomorrow);
}

function formatRelativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return 'vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${hours}:${mins} ${d}/${m}/${y}`;
}

function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function CardDetailModal({
  cardId,
  boardId,
  boardVisibility: boardVisibilityProp,
  realtimeUpdatedCardId,
  isOpen,
  onClose,
  onCardUpdated,
  onMoveRequest,
  onCopyRequest,
  workspaceMembers: externalWsMembers = [],
  workspaceId: externalWorkspaceId,
  onSelectCard,
  activeUserIds,
  canEdit = true,
}: CardDetailModalProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(cardId);

  useEffect(() => {
    setActiveCardId(cardId);
  }, [cardId]);

  const [card, setCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- CARD RELATIONS STATE ---
  const [relations, setRelations] = useState<CardRelationItem[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [isRelationsModalOpen, setIsRelationsModalOpen] = useState(false);
  const [relationTypeToCreate, setRelationTypeToCreate] = useState<
    'BLOCKS' | 'BLOCKED_BY' | 'PARENT' | 'SUBTASK' | 'RELATES_TO' | 'DUPLICATE'
  >('RELATES_TO');
  const [candidateCards, setCandidateCards] = useState<any[]>([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateCardId, setSelectedCandidateCardId] = useState<string | null>(null);
  const [isCreatingRelation, setIsCreatingRelation] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [isDeletingRelationId, setIsDeletingRelationId] = useState<string | null>(null);
  const [blockedPopup, setBlockedPopup] = useState<{
    isOpen: boolean;
    blockers: CardRelationItem[];
  }>({
    isOpen: false,
    blockers: [],
  });

  // Editable card fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState<number>(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // Members state
  const [assignees, setAssignees] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [workspaceMembersList, setWorkspaceMembersList] = useState<any[]>(externalWsMembers || []);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const lastLoadedBoardIdRef = useRef<string | null>(null);
  const lastLoadedWsIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (externalWsMembers && externalWsMembers.length > 0) {
      setWorkspaceMembersList(externalWsMembers);
    }
  }, [externalWsMembers]);

  // Board visibility & Private board logic
  const boardVisibility: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC' =
    boardVisibilityProp || card?.list?.board?.visibility || 'WORKSPACE';
  const isPrivateBoard = boardVisibility === 'PRIVATE';

  // Thành viên có thể phân công (CHỈ các thành viên trong Bảng với vai trò ADMIN hoặc EDITOR)
  const assignableMembers = React.useMemo(() => {
    return (boardMembers || []).map((m) => {
      const uId = m.user?.id || m.user_id;
      return {
        id: m.id || uId,
        board_member_id: m.id,
        user_id: uId,
        user: m.user || { id: uId, name: 'Thành viên' },
        role: m.role || 'EDITOR',
        isBoardMember: true,
      };
    });
  }, [boardMembers]);

  // Không hiển thị thành viên ngoài Bảng trong danh sách phân công
  const suggestedWorkspaceMembers = React.useMemo<any[]>(() => [], []);

  // Thành viên có thể tag Mention (trong bình luận)
  const mentionableMembers = React.useMemo(() => {
    return assignableMembers;
  }, [assignableMembers]);

  const [addingBoardMemberId, setAddingBoardMemberId] = useState<string | null>(null);

  const handleAddMemberToBoard = async (userToAddId: string) => {
    const effectiveBoardId = card?.list?.board_id || boardId;
    if (!effectiveBoardId || addingBoardMemberId) return;

    try {
      setAddingBoardMemberId(userToAddId);
      const res = await apiClient<any>(`/boards/${effectiveBoardId}/members`, {
        method: 'POST',
        data: { userId: userToAddId, role: 'EDITOR' },
      });
      if (res.success) {
        await fetchBoardMembers(effectiveBoardId);
        onCardUpdated();
      } else {
        alert(res.error || res.message || 'Không thể thêm thành viên vào bảng');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thêm thành viên vào bảng');
    } finally {
      setAddingBoardMemberId(null);
    }
  };

  // Labels state
  const [cardLabels, setCardLabels] = useState<any[]>([]);
  const [boardLabels, setBoardLabels] = useState<any[]>([]);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [editingLabel, setEditingLabel] = useState<any | null>(null);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [formLabelName, setFormLabelName] = useState('');
  const [formLabelColor, setFormLabelColor] = useState('#3b82f6');

  // Custom Fields state
  const [boardCustomFields, setBoardCustomFields] = useState<CustomField[]>([]);
  const [cardCustomFieldValues, setCardCustomFieldValues] = useState<
    Record<string, { id: string; value: string; field?: any }>
  >({});
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [tempCustomFieldValue, setTempCustomFieldValue] = useState<string>('');
  const [isSavingCustomField, setIsSavingCustomField] = useState(false);
  const customFieldsSectionRef = useRef<HTMLDivElement>(null);

  // Dropdown options management
  const [managingDropdownField, setManagingDropdownField] = useState<CustomField | null>(null);
  const [tempDropdownOptionsList, setTempDropdownOptionsList] = useState<string[]>([]);
  const [newTempOptionInput, setNewTempOptionInput] = useState('');
  const [isSavingDropdownOptions, setIsSavingDropdownOptions] = useState(false);

  // Dates modal/popover state
  const [isDatesModalOpen, setIsDatesModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempDueDate, setTempDueDate] = useState('');
  const [tempEnableStart, setTempEnableStart] = useState(false);
  const [tempEnableDue, setTempEnableDue] = useState(false);
  const [tempReminderMinutes, setTempReminderMinutes] = useState<number>(-1);

  // Checklists state
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('Việc cần làm');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [collapsedChecklists, setCollapsedChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklistCollapse = (checklistId: string) => {
    setCollapsedChecklists((prev) => ({
      ...prev,
      [checklistId]: !prev[checklistId],
    }));
  };

  // Checklist items creation/editing state
  const [activeNewItemChecklistId, setActiveNewItemChecklistId] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState('');

  // Checklist item deadline and member assignment popover state
  const [activeItemDate, setActiveItemDate] = useState<{
    checklistId: string;
    item: ChecklistItem;
  } | null>(null);
  const [tempItemDueDate, setTempItemDueDate] = useState('');

  const [activeItemMember, setActiveItemMember] = useState<{
    checklistId: string;
    item: ChecklistItem;
  } | null>(null);
  const [itemMemberSearchQuery, setItemMemberSearchQuery] = useState('');

  const newItemInputRef = useRef<HTMLInputElement>(null);

  // --- COMMENTS & MENTION STATE ---
  const { user: currentUser } = useAuth();
  const [comments, setComments] = useState<CardComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // --- AI TASK BREAKDOWN STATE ---
  const [isAiBreakdownOpen, setIsAiBreakdownOpen] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [isLoadingAiBreakdown, setIsLoadingAiBreakdown] = useState(false);
  const [isApplyingAiBreakdown, setIsApplyingAiBreakdown] = useState(false);
  const [aiBreakdownResult, setAiBreakdownResult] = useState<{
    summary?: string;
    estimatedHours?: number;
    checklistTitle?: string;
    items?: Array<{
      content: string;
      estimatedMinutes?: number;
      priority?: string;
      selected?: boolean;
    }>;
  } | null>(null);
  const [aiBreakdownError, setAiBreakdownError] = useState<string | null>(null);

  const handleRequestAiBreakdown = async () => {
    if (!activeCardId) return;
    try {
      setIsLoadingAiBreakdown(true);
      setAiBreakdownError(null);
      const res = await apiClient<any>(`/ai/cards/${activeCardId}/breakdown`, {
        method: 'POST',
        data: { customPrompt: aiCustomPrompt.trim() || undefined },
      });
      if (res.success && res.data) {
        setAiBreakdownResult({
          ...res.data,
          items: (res.data.items || []).map((it: any) => ({ ...it, selected: true })),
        });
      } else {
        setAiBreakdownError(res.error || res.message || 'Không thể phân rã công việc');
      }
    } catch (err: any) {
      setAiBreakdownError(err.message || 'Lỗi kết nối khi gọi AI phân rã');
    } finally {
      setIsLoadingAiBreakdown(false);
    }
  };

  const handleApplyAiBreakdown = async () => {
    if (!activeCardId || !aiBreakdownResult) return;
    const selectedItems = (aiBreakdownResult.items || []).filter((i) => i.selected);
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 đầu việc để áp dụng');
      return;
    }

    try {
      setIsApplyingAiBreakdown(true);
      const res = await apiClient<any>(`/ai/cards/${activeCardId}/apply-breakdown`, {
        method: 'POST',
        data: {
          title: aiBreakdownResult.checklistTitle || 'AI Checklist: Kế hoạch triển khai',
          items: selectedItems.map((i) => ({
            content: i.content,
            estimatedMinutes: i.estimatedMinutes,
            priority: i.priority,
          })),
        },
      });

      if (res.success && res.data) {
        setChecklists((prev) => [...prev, res.data]);
        setIsAiBreakdownOpen(false);
        setAiBreakdownResult(null);
        setAiCustomPrompt('');
        onCardUpdated();
      } else {
        alert(res.error || res.message || 'Không thể áp dụng checklist');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi áp dụng checklist');
    } finally {
      setIsApplyingAiBreakdown(false);
    }
  };

  // Mention Autocomplete State (for new comment composer)
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Mention Autocomplete State (for inline editing comment)
  const [editMentionQuery, setEditMentionQuery] = useState('');
  const [isEditMentionOpen, setIsEditMentionOpen] = useState(false);
  const [editMentionStartIndex, setEditMentionStartIndex] = useState<number>(-1);
  const [selectedEditMentionIndex, setSelectedEditMentionIndex] = useState<number>(0);
  const editCommentInputRef = useRef<HTMLTextAreaElement>(null);

  // --- ATTACHMENTS STATE ---
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
  const [attachmentTab, setAttachmentTab] = useState<'upload' | 'link'>('upload');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [linkAttachmentName, setLinkAttachmentName] = useState('');
  const [linkAttachmentUrl, setLinkAttachmentUrl] = useState('');
  const [isAttachingLink, setIsAttachingLink] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');
  const [isUpdatingAttachment, setIsUpdatingAttachment] = useState(false);
  const [previewImageAttachment, setPreviewImageAttachment] = useState<CardAttachment | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);
  const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
  const [uploadFileError, setUploadFileError] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  // Custom Confirmation Popup Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // --- ACTIVITIES STATE ---
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [cardActivitiesPage, setCardActivitiesPage] = useState(1);
  const [hasMoreCardActivities, setHasMoreCardActivities] = useState(false);
  const [activityTab, setActivityTab] = useState<'comments' | 'activities'>('comments');
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const datesSectionRef = useRef<HTMLDivElement>(null);
  const relationsSectionRef = useRef<HTMLDivElement>(null);
  const checklistsSectionRef = useRef<HTMLDivElement>(null);
  const attachmentsSectionRef = useRef<HTMLDivElement>(null);

  const handleActivityClick = (act: ActivityItem) => {
    const action = act.action?.toLowerCase() || '';

    if (action.includes('bình luận') || action.includes('comment')) {
      setActivityTab('comments');
      setTimeout(() => commentInputRef.current?.focus(), 100);
      return;
    }

    if (action.includes('danh sách') || action.includes('việc cần làm') || action.includes('checklist') || action.includes('mục')) {
      checklistsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSection('checklists');
      setTimeout(() => setHighlightedSection((curr) => curr === 'checklists' ? null : curr), 2500);
      return;
    }

    if (action.includes('đính kèm') || action.includes('tệp') || action.includes('file')) {
      attachmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSection('attachments');
      setTimeout(() => setHighlightedSection((curr) => curr === 'attachments' ? null : curr), 2500);
      return;
    }

    if (action.includes('quan hệ') || action.includes('liên kết') || action.includes('chặn') || action.includes('phụ thuộc') || action.includes('thẻ cha') || action.includes('thẻ con')) {
      relationsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSection('relations');
      setTimeout(() => setHighlightedSection((curr) => curr === 'relations' ? null : curr), 2500);
      return;
    }

    if (action.includes('hạn chót') || action.includes('ngày') || action.includes('thời hạn') || action.includes('hoàn thành')) {
      datesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSection('dates');
      setTimeout(() => setHighlightedSection((curr) => curr === 'dates' ? null : curr), 2500);
      return;
    }

    if (action.includes('thành viên') || action.includes('phụ trách') || action.includes('gán') || action.includes('nhãn')) {
      datesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSection('dates');
      setTimeout(() => setHighlightedSection((curr) => curr === 'dates' ? null : curr), 2500);
      return;
    }
  };

  const fetchCardActivities = async (cId: string, silent = false) => {
    try {
      if (!silent) setIsLoadingActivities(true);
      setCardActivitiesPage(1);
      const res = await apiClient<ActivityItem[]>(`/cards/${cId}/activities?limit=15&page=1`);
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
        setHasMoreCardActivities(res.data.length >= 15);
      } else {
        setActivities([]);
        setHasMoreCardActivities(false);
      }
    } catch {
      // ignore
    } finally {
      if (!silent) setIsLoadingActivities(false);
    }
  };

  const handleLoadMoreCardActivities = async () => {
    if (!cardId || isLoadingMoreActivities || !hasMoreCardActivities) return;
    try {
      setIsLoadingMoreActivities(true);
      const nextPage = cardActivitiesPage + 1;
      const res = await apiClient<ActivityItem[]>(`/cards/${cardId}/activities?limit=15&page=${nextPage}`);
      if (res.success && Array.isArray(res.data)) {
        setActivities((prev) => [...prev, ...res.data]);
        setCardActivitiesPage(nextPage);
        setHasMoreCardActivities(res.data.length >= 15);
      } else {
        setHasMoreCardActivities(false);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMoreActivities(false);
    }
  };

  const fetchCardRelations = async (cId: string, silent = false) => {
    try {
      if (!silent) setIsLoadingRelations(true);
      const res = await apiClient<CardRelationItem[]>(`/cards/${cId}/relations`);
      if (res.success && Array.isArray(res.data)) {
        setRelations(res.data);
      }
    } catch {
      // ignore
    } finally {
      if (!silent) setIsLoadingRelations(false);
    }
  };

  const searchCandidateCards = async (cId: string, q: string) => {
    try {
      setIsLoadingCandidates(true);
      const res = await apiClient<any[]>(`/cards/${cId}/relations/search-candidates?q=${encodeURIComponent(q)}`);
      if (res.success && Array.isArray(res.data)) {
        setCandidateCards(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleOpenRelationsModal = () => {
    const targetId = activeCardId || cardId;
    if (!targetId) return;
    setIsRelationsModalOpen(true);
    setSelectedCandidateCardId(null);
    setRelationError(null);
    setCandidateSearchQuery('');
    searchCandidateCards(targetId, '');
  };

  const handleCreateRelation = async () => {
    const currentId = activeCardId || cardId;
    if (!currentId || !selectedCandidateCardId || isCreatingRelation) return;

    try {
      setIsCreatingRelation(true);
      setRelationError(null);
      const res = await apiClient<CardRelationItem>(`/cards/${currentId}/relations`, {
        method: 'POST',
        data: {
          relatedCardId: selectedCandidateCardId,
          type: relationTypeToCreate,
        },
      });

      if (res.success) {
        setIsRelationsModalOpen(false);
        setSelectedCandidateCardId(null);
        await fetchCardRelations(currentId);
        await fetchCardActivities(currentId);
        onCardUpdated();
      } else {
        setRelationError(res.message || 'Không thể tạo mối quan hệ giữa 2 thẻ');
      }
    } catch (err: any) {
      setRelationError(err?.message || 'Không thể tạo mối quan hệ');
    } finally {
      setIsCreatingRelation(false);
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    const currentId = activeCardId || cardId;
    if (!currentId || isDeletingRelationId) return;

    try {
      setIsDeletingRelationId(relationId);
      const res = await apiClient(`/cards/${currentId}/relations/${relationId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setRelations((prev) => prev.filter((r) => r.id !== relationId));
        await fetchCardActivities(currentId);
        onCardUpdated();
      }
    } catch {
      // ignore
    } finally {
      setIsDeletingRelationId(null);
    }
  };

  const handleNavigateToRelatedCard = (targetCardId: string) => {
    if (onSelectCard) {
      onSelectCard(targetCardId);
    }
    setActiveCardId(targetCardId);
    fetchCardDetails(targetCardId);
    fetchCardActivities(targetCardId);
    fetchCardRelations(targetCardId);
  };

  const fetchWorkspaceMembers = async (wsId: string) => {
    try {
      const wsRes = await apiClient<any>(`/workspaces/${wsId}`);
      if (wsRes.success && wsRes.data) {
        const members = [...(wsRes.data.members || [])];
        if (
          wsRes.data.owner &&
          !members.some((m: any) => (m.user?.id || m.user_id) === wsRes.data.owner_id)
        ) {
          members.unshift({
            id: wsRes.data.owner.id,
            user_id: wsRes.data.owner.id,
            role: 'OWNER',
            user: wsRes.data.owner,
          });
        }
        setWorkspaceMembersList(members);
      }
    } catch {
      // ignore
    }
  };

  const fetchBoardMembers = async (boardId: string) => {
    try {
      const res = await apiClient<any[]>(`/boards/${boardId}/assignable-members`);
      if (res.success && res.data) {
        setBoardMembers(res.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchBoardLabels = async (boardId: string) => {
    try {
      const res = await apiClient<any[]>(`/boards/${boardId}/labels`);
      if (res.success && res.data) {
        setBoardLabels(res.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchBoardCustomFields = async (bId: string) => {
    try {
      const res = await apiClient<CustomField[]>(`/boards/${bId}/custom-fields`);
      if (res.success && res.data) {
        setBoardCustomFields(res.data);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveCustomFieldValue = async (fieldId: string, val: any) => {
    const currentId = activeCardId || cardId;
    if (!currentId) return;

    // Optimistic update
    setCardCustomFieldValues((prev) => {
      const copy = { ...prev };
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
        delete copy[fieldId];
      } else {
        copy[fieldId] = {
          id: copy[fieldId]?.id || 'temp',
          value: String(val),
          field: boardCustomFields.find((f) => f.id === fieldId),
        };
      }
      return copy;
    });

    try {
      setIsSavingCustomField(true);
      await apiClient(`/cards/${currentId}/custom-field-values/${fieldId}`, {
        method: 'PUT',
        data: { value: val },
      });
      onCardUpdated();
    } catch (err: any) {
      console.error('Lỗi khi lưu giá trị trường tùy chỉnh:', err);
      fetchCardDetails(currentId, true);
    } finally {
      setIsSavingCustomField(false);
      setEditingCustomFieldId(null);
    }
  };

  const handleDeleteCustomFieldValue = async (fieldId: string) => {
    const currentId = activeCardId || cardId;
    if (!currentId) return;

    setCardCustomFieldValues((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });

    try {
      await apiClient(`/cards/${currentId}/custom-field-values/${fieldId}`, {
        method: 'DELETE',
      });
      onCardUpdated();
    } catch {
      fetchCardDetails(currentId, true);
    }
  };

  const handleOpenDropdownOptionsModal = (field: CustomField) => {
    setManagingDropdownField(field);
    const existing =
      field.options && field.options.length > 0
        ? [...field.options]
        : getDropdownOptionsForField(field.name);
    setTempDropdownOptionsList(existing);
    setNewTempOptionInput('');
  };

  const handleAddTempOption = () => {
    const val = newTempOptionInput.trim();
    if (!val) return;
    if (tempDropdownOptionsList.includes(val)) return;
    setTempDropdownOptionsList((prev) => [...prev, val]);
    setNewTempOptionInput('');
  };

  const handleRemoveTempOption = (idxToRemove: number) => {
    setTempDropdownOptionsList((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSaveDropdownOptions = async () => {
    if (!managingDropdownField || isSavingDropdownOptions) return;
    const cleanList = tempDropdownOptionsList.map((o) => o.trim()).filter(Boolean);
    if (cleanList.length === 0) return;

    try {
      setIsSavingDropdownOptions(true);
      const fieldId = managingDropdownField.id;
      setBoardCustomFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, options: cleanList } : f))
      );
      setManagingDropdownField(null);

      await apiClient(`/custom-fields/${fieldId}`, {
        method: 'PATCH',
        data: { options: cleanList },
      });

      const bId = card?.list?.board_id || boardId;
      if (bId) {
        fetchBoardCustomFields(bId);
      }
    } catch (err: any) {
      console.error('Lỗi lưu danh sách tùy chọn dropdown:', err);
    } finally {
      setIsSavingDropdownOptions(false);
    }
  };

  const [cardButtons, setCardButtons] = useState<any[]>([]);
  const [executingCardButtonId, setExecutingCardButtonId] = useState<string | null>(null);

  const fetchCardButtons = async (bId: string) => {
    try {
      const res = await apiClient<any[]>(`/boards/${bId}/automations?type=CARD_BUTTON`);
      if (res.data && Array.isArray(res.data)) {
        setCardButtons(res.data.filter((b: any) => b.is_enabled));
      }
    } catch {}
  };

  const handleExecuteCardButton = async (btn: any) => {
    const currentId = activeCardId || cardId;
    if (!currentId) return;

    setExecutingCardButtonId(btn.id);
    try {
      const res = await apiClient<any>(`/automations/${btn.id}/run`, {
        method: 'POST',
        data: { cardId: currentId },
      });
      if (res.data?.success) {
        await fetchCardDetails(currentId, true);
        await fetchCardActivities(currentId, true);
        onCardUpdated();
      }
    } catch (err: any) {
      console.error('Lỗi thực thi nút tự động hóa:', err);
    } finally {
      setExecutingCardButtonId(null);
    }
  };

  const fetchCardDetails = async (id: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await apiClient<any>(`/cards/${id}`);
      if (res.success && res.data) {
        const c = res.data;
        setCard(c);
        if (!silent) {
          setTitle(c.title || '');
          setDescription(c.description || '');
        } else {
          // In silent background updates, don't clobber active input elements
          const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
          const isEditingTitle = activeEl?.getAttribute('placeholder') === 'Tiêu đề thẻ...';
          const isEditingDesc = activeEl?.getAttribute('placeholder') === 'Thêm mô tả chi tiết hơn...';
          if (!isEditingTitle) {
            setTitle(c.title || '');
          }
          if (!isEditingDesc) {
            setDescription(c.description || '');
          }
        }
        const sDate = toLocalDatetimeString(c.start_date);
        const dDate = toLocalDatetimeString(c.due_date);
        setStartDate(sDate);
        setDueDate(dDate);
        setReminderAt(c.reminder_at || null);
        setIsCompleted(!!c.is_due_date_completed);
        setAssignees(c.card_assignees || []);
        setCardLabels(c.card_labels || []);

        // Custom field values
        const cfMap: Record<string, { id: string; value: string; field?: any }> = {};
        (c.custom_field_values || []).forEach((cf: any) => {
          cfMap[cf.field_id] = { id: cf.id, value: cf.value, field: cf.field };
        });
        setCardCustomFieldValues(cfMap);

        if (c.due_date && c.reminder_at) {
          const diffMins = Math.round(
            (new Date(c.due_date).getTime() - new Date(c.reminder_at).getTime()) / 60000,
          );
          setReminderMinutes(diffMins >= 0 ? diffMins : -1);
        } else {
          setReminderMinutes(-1);
        }

        const mappedChecklists = (c.checklists || []).map((ck: any) => ({
          ...ck,
          items: (ck.items || []).map((it: any) => ({
            ...it,
            user: it.user || it.member?.user || null,
            member: it.member || (it.user ? { user: it.user, id: it.user.id } : null),
          })),
        }));
        setChecklists(mappedChecklists);
        setComments(c.comments || []);
        setAttachments(c.attachments || []);

        const effectiveBoardId = c.list?.board_id || boardId;
        if (effectiveBoardId && lastLoadedBoardIdRef.current !== effectiveBoardId) {
          lastLoadedBoardIdRef.current = effectiveBoardId;
          fetchBoardMembers(effectiveBoardId);
          fetchBoardLabels(effectiveBoardId);
          fetchBoardCustomFields(effectiveBoardId);
          fetchCardButtons(effectiveBoardId);
        }

        const effectiveWsId = externalWorkspaceId || c.list?.board?.workspace_id;
        if (effectiveWsId && lastLoadedWsIdRef.current !== effectiveWsId) {
          lastLoadedWsIdRef.current = effectiveWsId;
          fetchWorkspaceMembers(effectiveWsId);
        }
      }
    } catch {
      // Failed to load card
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const currentId = activeCardId || cardId;
    if (isOpen && currentId) {
      fetchCardDetails(currentId);
      fetchCardActivities(currentId);
      fetchCardRelations(currentId);
      setIsAddingChecklist(false);
      setIsDatesModalOpen(false);
      setIsMembersModalOpen(false);
      setIsLabelsModalOpen(false);
      setIsAttachmentsModalOpen(false);
      setIsRelationsModalOpen(false);
      setSelectedUploadFile(null);
      setPreviewImageAttachment(null);
      setActiveItemDate(null);
      setActiveItemMember(null);
      setMemberSearchQuery('');
      setLabelSearchQuery('');
      setItemMemberSearchQuery('');
      setEditingLabel(null);
      setIsCreatingLabel(false);
      setActiveNewItemChecklistId(null);
      setEditingChecklistId(null);
      setEditingItemId(null);
      setCommentText('');
      setEditingCommentId(null);
      setIsMentionOpen(false);
      setIsEditMentionOpen(false);
    } else {
      setCard(null);
      setChecklists([]);
      setAssignees([]);
      setBoardMembers([]);
      setCardLabels([]);
      setBoardLabels([]);
      setActiveItemDate(null);
      setActiveItemMember(null);
      setComments([]);
      setActivities([]);
      setRelations([]);
      setActivityTab('comments');
      setCommentText('');
      setEditingCommentId(null);
      setIsMentionOpen(false);
      setIsEditMentionOpen(false);
      setIsRelationsModalOpen(false);
      lastLoadedBoardIdRef.current = null;
      lastLoadedWsIdRef.current = null;
    }
  }, [isOpen, cardId, activeCardId]);

  // Realtime card sync when updated by another member (via page.tsx)
  useEffect(() => {
    const currentId = activeCardId || cardId;
    if (!isOpen || !currentId) return;

    if (realtimeUpdatedCardId && realtimeUpdatedCardId.id === currentId) {
      fetchCardDetails(currentId, true);
      fetchCardActivities(currentId, true);
      fetchCardRelations(currentId, true);
    }
  }, [realtimeUpdatedCardId, isOpen, activeCardId, cardId]);

  // Direct channel realtime subscription fallback
  useEffect(() => {
    const currentId = activeCardId || cardId;
    const effectiveBoardId = boardId || card?.list?.board_id;
    if (!isOpen || !currentId || !effectiveBoardId) return;

    const channelName = `card-modal-sub:${effectiveBoardId}:${currentId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'CARD_UPDATED' }, ({ payload }) => {
        if (payload?.senderId && currentUser?.id && payload.senderId === currentUser.id) return;
        if (payload?.cardId === currentId) {
          fetchCardDetails(currentId, true);
          fetchCardActivities(currentId, true);
          fetchCardRelations(currentId, true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, activeCardId, cardId, boardId, card?.list?.board_id, currentUser?.id]);

  useEffect(() => {
    if (activeNewItemChecklistId) {
      setTimeout(() => newItemInputRef.current?.focus(), 50);
    }
  }, [activeNewItemChecklistId]);

  // Open Dates Config Popup
  const handleOpenDatesModal = () => {
    setTempStartDate(startDate);
    setTempDueDate(dueDate || getDefaultDueDateString());
    setTempEnableStart(!!startDate);
    setTempEnableDue(!!dueDate);
    setTempReminderMinutes(reminderMinutes);
    setIsDatesModalOpen(true);
  };

  // Save Dates from Popup
  const handleSaveDates = async () => {
    const finalStartDate = tempEnableStart && tempStartDate ? new Date(tempStartDate).toISOString() : null;
    const finalDueDate = tempEnableDue && tempDueDate ? new Date(tempDueDate).toISOString() : null;

    let finalReminderAt: string | null = null;
    if (finalDueDate && tempReminderMinutes >= 0) {
      const dueTime = new Date(finalDueDate).getTime();
      finalReminderAt = new Date(dueTime - tempReminderMinutes * 60 * 1000).toISOString();
    }

    try {
      setIsSaving(true);
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: {
          start_date: finalStartDate,
          due_date: finalDueDate,
          reminder_at: finalReminderAt,
        },
      });

      setStartDate(tempEnableStart && tempStartDate ? tempStartDate : '');
      setDueDate(tempEnableDue && tempDueDate ? tempDueDate : '');
      setReminderAt(finalReminderAt);
      setReminderMinutes(tempReminderMinutes);
      setIsDatesModalOpen(false);
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể lưu thời hạn');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Dates
  const handleRemoveDates = async () => {
    try {
      setIsSaving(true);
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: {
          start_date: null,
          due_date: null,
          reminder_at: null,
          is_due_date_completed: false,
        },
      });

      setStartDate('');
      setDueDate('');
      setReminderAt(null);
      setReminderMinutes(-1);
      setIsCompleted(false);
      setIsDatesModalOpen(false);
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể gỡ bỏ thời hạn');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Assign Member
  const handleToggleAssignee = async (memberId: string) => {
    const currentCardId = activeCardId || cardId || card?.id;
    if (!currentCardId) return;

    const bMember = (assignableMembers || []).find(
      (m) => m.id === memberId || m.user_id === memberId || m.user?.id === memberId,
    );

    let effectiveMemberId: string | null = null;
    let targetUserId: string | null = null;
    let targetUser: any = null;

    if (!bMember) {
      alert('Chỉ có thể phân công thành viên đã tham gia Bảng này với vai trò Quản trị viên hoặc Biên tập viên.');
      return;
    }

    if (bMember.role === 'VIEWER') {
      alert('Thành viên có vai trò Người xem (Viewer) không thể nhận nhiệm vụ.');
      return;
    }

    effectiveMemberId = bMember.id;
    targetUserId = bMember.user?.id || bMember.user_id;
    targetUser = bMember.user;

    const isAssigned = assignees.some(
      (a) =>
        (targetUserId &&
          (a.user_id === targetUserId ||
            a.user?.id === targetUserId ||
            a.board_member?.user_id === targetUserId ||
            a.board_member?.user?.id === targetUserId)) ||
        (effectiveMemberId &&
          (a.board_member_id === effectiveMemberId || a.board_member?.id === effectiveMemberId)),
    );

    // Optimistic
    if (isAssigned) {
      setAssignees((prev) =>
        prev.filter(
          (a) =>
            !(
              targetUserId &&
              (a.user_id === targetUserId ||
                a.user?.id === targetUserId ||
                a.board_member?.user_id === targetUserId ||
                a.board_member?.user?.id === targetUserId)
            ) &&
            !(
              effectiveMemberId &&
              (a.board_member_id === effectiveMemberId || a.board_member?.id === effectiveMemberId)
            ),
        ),
      );
    } else {
      setAssignees((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          user_id: targetUserId,
          user: targetUser,
          board_member_id: effectiveMemberId,
          board_member: bMember
            ? {
                id: effectiveMemberId,
                user_id: targetUserId,
                user: targetUser,
                role: bMember.role,
              }
            : undefined,
        },
      ]);
    }

    try {
      const res = await apiClient<any>(`/cards/${currentCardId}/assignees/toggle`, {
        method: 'POST',
        data: { user_id: targetUserId, board_member_id: effectiveMemberId || targetUserId },
      });
      if (res.success && res.data) {
        if (res.data.assigned && res.data.assignee) {
          setAssignees((prev) =>
            prev.map((a) =>
              targetUserId && (a.user_id === targetUserId || a.user?.id === targetUserId)
                ? { ...a, ...res.data.assignee }
                : a,
            ),
          );
        }
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể thay đổi thành viên gán');
      fetchCardDetails(currentCardId, true);
    }
  };

  // --- LABEL ACTIONS ---
  const handleToggleCardLabel = async (labelId: string) => {
    const isAssigned = cardLabels.some(
      (cl) => cl.label_id === labelId || cl.label?.id === labelId,
    );

    // Optimistic
    if (isAssigned) {
      setCardLabels((prev) =>
        prev.filter(
          (cl) => cl.label_id !== labelId && cl.label?.id !== labelId,
        ),
      );
    } else {
      const labelObj = boardLabels.find((l) => l.id === labelId);
      if (labelObj) {
        setCardLabels((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            card_id: cardId,
            label_id: labelId,
            label: labelObj,
          },
        ]);
      }
    }

    try {
      const res = await apiClient<any>(`/cards/${cardId}/labels/toggle`, {
        method: 'POST',
        data: { label_id: labelId },
      });
      if (res.success && res.data) {
        if (res.data.assigned && res.data.card_label) {
          setCardLabels((prev) =>
            prev.map((cl) =>
              cl.label_id === labelId || cl.label?.id === labelId
                ? res.data.card_label
                : cl,
            ),
          );
        }
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể thay đổi nhãn thẻ');
      fetchCardDetails(cardId!, true);
    }
  };

  const handleSaveLabel = async () => {
    if (!formLabelName.trim()) return;
    const boardId = card?.list?.board_id;

    try {
      if (editingLabel) {
        const res = await apiClient<any>(`/labels/${editingLabel.id}`, {
          method: 'PATCH',
          data: {
            name: formLabelName.trim(),
            color: formLabelColor,
          },
        });
        if (res.success && res.data) {
          setBoardLabels((prev) =>
            prev.map((l) => (l.id === editingLabel.id ? res.data : l)),
          );
          setCardLabels((prev) =>
            prev.map((cl) =>
              cl.label?.id === editingLabel.id
                ? { ...cl, label: res.data }
                : cl,
            ),
          );
          setEditingLabel(null);
          setIsCreatingLabel(false);
          onCardUpdated();
        }
      } else if (isCreatingLabel && boardId) {
        const res = await apiClient<any>(`/boards/${boardId}/labels`, {
          method: 'POST',
          data: {
            name: formLabelName.trim(),
            color: formLabelColor,
          },
        });
        if (res.success && res.data) {
          const newLabel = res.data;
          setBoardLabels((prev) => [...prev, newLabel]);
          await handleToggleCardLabel(newLabel.id);
          setIsCreatingLabel(false);
          setEditingLabel(null);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Không thể lưu nhãn');
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      await apiClient(`/labels/${labelId}`, { method: 'DELETE' });
      setBoardLabels((prev) => prev.filter((l) => l.id !== labelId));
      setCardLabels((prev) =>
        prev.filter((cl) => cl.label_id !== labelId && cl.label?.id !== labelId),
      );
      if (editingLabel?.id === labelId) {
        setEditingLabel(null);
        setIsCreatingLabel(false);
      }
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa nhãn');
    }
  };

  const requestDeleteLabel = (labelId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa nhãn?',
      message: 'Bạn có chắc chắn muốn xóa nhãn này khỏi toàn bộ bảng không?',
      confirmText: 'Xóa nhãn',
      onConfirm: () => handleDeleteLabel(labelId),
    });
  };

  const requestDeleteCard = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa thẻ này?',
      message: 'Bạn có chắc chắn muốn xóa thẻ này cùng toàn bộ dữ liệu liên quan không?',
      confirmText: 'Xóa thẻ',
      onConfirm: () => handleDelete(),
    });
  };

  const requestDeleteChecklist = (checklistId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa checklist?',
      message: 'Bạn có chắc muốn xóa danh sách việc cần làm này không?',
      confirmText: 'Xóa checklist',
      onConfirm: () => handleDeleteChecklist(checklistId),
    });
  };

  const requestDeleteComment = (commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa bình luận?',
      message: 'Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa bình luận',
      onConfirm: () => handleDeleteComment(commentId),
    });
  };

  // --- ATTACHMENT HELPERS & HANDLERS ---
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (filename?: string | null, url?: string | null) => {
    const name = (filename || '').toLowerCase();
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return true;
    if (url?.startsWith('data:image/')) return true;
    if (url && /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url)) return true;
    return false;
  };

  const getFileIcon = (filename?: string | null, url?: string | null) => {
    const name = (filename || '').toLowerCase();
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || url?.startsWith('data:image/')) {
      return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileText className="w-5 h-5 text-emerald-700" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-600" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'java', 'cpp', 'c', 'sql'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-indigo-600" />;
    }
    if (url && !url.includes('/attachments/') && (url.startsWith('http://') || url.startsWith('https://'))) {
      return <ExternalLink className="w-5 h-5 text-slate-900" />;
    }
    return <File className="w-5 h-5 text-slate-600" />;
  };

  const handleSelectFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setUploadFileError(
        `Tệp "${file.name}" vượt quá giới hạn tối đa 25MB (${formatFileSize(file.size)}). Vui lòng chọn tệp nhỏ hơn.`
      );
      setSelectedUploadFile(null);
      if (attachmentFileInputRef.current) {
        attachmentFileInputRef.current.value = '';
      }
      return;
    }
    setUploadFileError(null);
    setSelectedUploadFile(file);
  };

  const handleUploadAttachment = async (file?: File) => {
    const fileToUpload = file || selectedUploadFile;
    if (!fileToUpload || !cardId || isUploadingAttachment) return;

    if (fileToUpload.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setUploadFileError(
        `Tệp "${fileToUpload.name}" vượt quá giới hạn tối đa 25MB (${formatFileSize(fileToUpload.size)}).`
      );
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setUploadFileError(null);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await apiClient<CardAttachment>(`/cards/${cardId}/attachments/upload`, {
        method: 'POST',
        data: formData,
      });

      if (res.success && res.data) {
        const item: CardAttachment = (res.data as any)?.data || res.data;
        setAttachments((prev) => [...prev, item]);
        setSelectedUploadFile(null);
        setUploadFileError(null);
        setIsAttachmentsModalOpen(false);
        onCardUpdated();
      }
    } catch (err: any) {
      setUploadFileError(err.message || 'Không thể tải tệp lên');
      alert(err.message || 'Không thể tải tệp lên');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (att: CardAttachment) => {
    if (!att.file_url) return;
    const fileName = att.file_name || 'download';

    // 1. Data URI
    if (att.file_url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = att.file_url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    try {
      setDownloadingAttachmentId(att.id);

      // 2. Tải trực tiếp dưới dạng blob để trình duyệt lưu file ngay vào máy (không nhảy sang tab/link mới)
      const response = await fetch(att.file_url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 500);
    } catch (err) {
      console.warn('Direct blob fetch failed, falling back to download parameter/endpoint:', err);
      try {
        let downloadUrl = att.file_url;
        if (att.file_url.includes('/storage/v1/object/public/')) {
          const sep = att.file_url.includes('?') ? '&' : '?';
          downloadUrl = `${att.file_url}${sep}download=${encodeURIComponent(fileName)}`;
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          downloadUrl = `${baseUrl.replace(/\/$/, '')}/attachments/${att.id}/download`;
        }

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 500);
      } catch (fallbackErr) {
        window.open(att.file_url, '_blank');
      }
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleAttachLink = async () => {
    if (!linkAttachmentUrl.trim() || !cardId || isAttachingLink) return;
    const name = linkAttachmentName.trim() || linkAttachmentUrl.trim();

    try {
      setIsAttachingLink(true);
      const res = await apiClient<CardAttachment>(`/cards/${cardId}/attachments/link`, {
        method: 'POST',
        data: {
          file_name: name,
          file_url: linkAttachmentUrl.trim(),
        },
      });

      if (res.success && res.data) {
        const item: CardAttachment = (res.data as any)?.data || res.data;
        setAttachments((prev) => [...prev, item]);
        setLinkAttachmentName('');
        setLinkAttachmentUrl('');
        setIsAttachmentsModalOpen(false);
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể đính kèm liên kết');
    } finally {
      setIsAttachingLink(false);
    }
  };

  const handleUpdateAttachmentName = async (attachmentId: string) => {
    if (!editingAttachmentName.trim() || isUpdatingAttachment) {
      setEditingAttachmentId(null);
      return;
    }

    try {
      setIsUpdatingAttachment(true);
      const res = await apiClient<CardAttachment>(`/attachments/${attachmentId}`, {
        method: 'PATCH',
        data: { file_name: editingAttachmentName.trim() },
      });

      if (res.success && res.data) {
        const item: CardAttachment = (res.data as any)?.data || res.data;
        setAttachments((prev) =>
          prev.map((a) => (a.id === attachmentId ? { ...a, file_name: item.file_name || editingAttachmentName.trim() } : a)),
        );
        setEditingAttachmentId(null);
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật tên đính kèm');
    } finally {
      setIsUpdatingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await apiClient(`/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa tệp đính kèm');
    }
  };

  const requestDeleteAttachment = (attachmentId: string, fileName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa đính kèm?',
      message: `Bạn có chắc chắn muốn xóa tệp "${fileName}" không? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa đính kèm',
      onConfirm: () => handleDeleteAttachment(attachmentId),
    });
  };

  if (!isOpen || !cardId) return null;

  // --- CARD SAVE ---
  const handleSaveAll = async () => {
    if (!title?.trim() || isSaving) return;
    if (isCompleted) {
      const activeBlockers = relations.filter(
        (r) => r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed && r.related_card?.status !== 'DONE'
      );
      if (activeBlockers.length > 0) {
        setBlockedPopup({ isOpen: true, blockers: activeBlockers });
        return;
      }
    }
    try {
      setIsSaving(true);
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          reminder_at: reminderAt,
          is_due_date_completed: isCompleted,
        },
      });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCompleted = async () => {
    const nextVal = !isCompleted;
    if (nextVal) {
      const activeBlockers = relations.filter(
        (r) => r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed && r.related_card?.status !== 'DONE'
      );
      if (activeBlockers.length > 0) {
        setBlockedPopup({ isOpen: true, blockers: activeBlockers });
        return;
      }
    }

    setIsCompleted(nextVal);
    try {
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: { is_due_date_completed: nextVal },
      });
      onCardUpdated();
    } catch (err: any) {
      setIsCompleted(!nextVal);
      const activeBlockers = relations.filter(
        (r) => r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed && r.related_card?.status !== 'DONE'
      );
      if (activeBlockers.length > 0) {
        setBlockedPopup({ isOpen: true, blockers: activeBlockers });
      } else {
        alert(err.message || 'Không thể cập nhật trạng thái hoàn thành');
      }
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?cardId=${cardId}`;
    navigator.clipboard.writeText(url);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2000);
  };

  const handleDelete = async () => {
    try {
      await apiClient(`/cards/${cardId}`, { method: 'DELETE' });
      onCardUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa thẻ');
    }
  };

  // Calculate Due Date Status
  const getDeadlineStatus = () => {
    if (!dueDate) return null;
    if (isCompleted) {
      return {
        status: 'completed',
        label: 'Đã hoàn thành',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotBg: 'bg-emerald-500',
        icon: CheckCircle2,
      };
    }
    const dueTime = new Date(dueDate).getTime();
    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      const hoursAgo = Math.abs(Math.round(diffHours));
      const text = hoursAgo >= 24 ? `${Math.round(hoursAgo / 24)} ngày trước` : `${hoursAgo} giờ trước`;
      return {
        status: 'overdue',
        label: `Quá hạn (${text})`,
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        dotBg: 'bg-rose-500',
        icon: AlertCircle,
      };
    }
    if (diffHours <= 24) {
      const hoursLeft = Math.max(1, Math.round(diffHours));
      return {
        status: 'due_soon',
        label: `Gần đến hạn (còn ${hoursLeft} giờ)`,
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
        dotBg: 'bg-amber-500',
        icon: Clock,
      };
    }
    return {
      status: 'normal',
      label: 'Đang thực hiện',
      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
      dotBg: 'bg-[#87ceeb]',
      icon: Calendar,
    };
  };

  const deadlineStatus = getDeadlineStatus();
  const reminderLabel =
    reminderMinutes >= 0
      ? REMINDER_OPTIONS.find((r) => r.value === reminderMinutes)?.label || 'Có lời nhắc'
      : null;

  // Filter board labels for popover
  const filteredBoardLabels = boardLabels.filter((l) => {
    const q = labelSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return l.name?.toLowerCase().includes(q);
  });

  // --- CHECKLIST ACTIONS ---
  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const res = await apiClient<any>(`/cards/${cardId}/checklists`, {
        method: 'POST',
        data: { title: newChecklistTitle.trim() },
      });
      if (res.success && res.data) {
        const createdChecklist = { ...res.data, items: [] };
        setChecklists((prev) => [...prev, createdChecklist]);
        setNewChecklistTitle('Việc cần làm');
        setIsAddingChecklist(false);
        setActiveNewItemChecklistId(createdChecklist.id);
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể tạo danh sách việc cần làm');
    }
  };

  const handleUpdateChecklistTitle = async (checklistId: string) => {
    if (!editingChecklistTitle.trim()) {
      setEditingChecklistId(null);
      return;
    }
    const newTitle = editingChecklistTitle.trim();
    setChecklists((prev) =>
      prev.map((cl) => (cl.id === checklistId ? { ...cl, title: newTitle } : cl)),
    );
    setEditingChecklistId(null);

    try {
      await apiClient(`/checklists/${checklistId}`, {
        method: 'PATCH',
        data: { title: newTitle },
      });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật tiêu đề checklist');
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    setChecklists((prev) => prev.filter((cl) => cl.id !== checklistId));
    try {
      await apiClient(`/checklists/${checklistId}`, { method: 'DELETE' });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa checklist');
      fetchCardDetails(cardId, true);
    }
  };

  // --- CHECKLIST ITEM ACTIONS ---
  const handleCreateChecklistItem = async (checklistId: string) => {
    if (!newItemContent.trim()) return;
    const content = newItemContent.trim();
    setNewItemContent('');

    try {
      const res = await apiClient<any>(`/checklists/${checklistId}/items`, {
        method: 'POST',
        data: { content },
      });
      if (res.success && res.data) {
        setChecklists((prev) =>
          prev.map((cl) =>
            cl.id === checklistId
              ? { ...cl, items: [...(cl.items || []), res.data] }
              : cl,
          ),
        );
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể thêm mục công việc');
    }
  };

  const handleToggleChecklistItem = async (
    checklistId: string,
    itemId: string,
    currentCompleted: boolean,
  ) => {
    const nextCompleted = !currentCompleted;
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
            ...cl,
            items: cl.items.map((item) =>
              item.id === itemId ? { ...item, is_completed: nextCompleted } : item,
            ),
          }
          : cl,
      ),
    );

    try {
      await apiClient(`/checklist-items/${itemId}`, {
        method: 'PATCH',
        data: { is_completed: nextCompleted },
      });
      onCardUpdated();
    } catch {
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? {
              ...cl,
              items: cl.items.map((item) =>
                item.id === itemId ? { ...item, is_completed: currentCompleted } : item,
              ),
            }
            : cl,
        ),
      );
    }
  };

  const handleUpdateItemContent = async (checklistId: string, itemId: string) => {
    if (!editingItemContent.trim()) {
      setEditingItemId(null);
      return;
    }
    const newContent = editingItemContent.trim();
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
            ...cl,
            items: cl.items.map((item) =>
              item.id === itemId ? { ...item, content: newContent } : item,
            ),
          }
          : cl,
      ),
    );
    setEditingItemId(null);

    try {
      await apiClient(`/checklist-items/${itemId}`, {
        method: 'PATCH',
        data: { content: newContent },
      });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật mục công việc');
    }
  };

  const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.filter((item) => item.id !== itemId) }
          : cl,
      ),
    );

    try {
      await apiClient(`/checklist-items/${itemId}`, { method: 'DELETE' });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa mục công việc');
      fetchCardDetails(cardId, true);
    }
  };

  // --- ITEM DEADLINE & ASSIGNMENT HANDLERS ---
  const handleSaveItemDueDate = async (
    checklistId: string,
    itemId: string,
    newDueDate: string | null,
  ) => {
    const finalDueDate = newDueDate ? new Date(newDueDate).toISOString() : null;

    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
            ...cl,
            items: cl.items.map((it) =>
              it.id === itemId ? { ...it, due_date: finalDueDate } : it,
            ),
          }
          : cl,
      ),
    );
    setActiveItemDate(null);

    try {
      await apiClient(`/checklist-items/${itemId}`, {
        method: 'PATCH',
        data: { due_date: finalDueDate },
      });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể lưu thời hạn mục');
      fetchCardDetails(cardId!, true);
    }
  };

  const handleAssignItemMember = async (
    checklistId: string,
    itemId: string,
    boardMemberId: string | null,
  ) => {
    let effectiveMemberId = boardMemberId;
    let targetUser: any = null;
    const allMembersPool = [...assignableMembers, ...suggestedWorkspaceMembers];

    if (boardMemberId) {
      const targetMember = allMembersPool.find(
        (m) => m.id === boardMemberId || m.user_id === boardMemberId || m.user?.id === boardMemberId,
      );
      if (!targetMember) {
        alert('Thành viên không thuộc Không gian làm việc này.');
        return;
      }
      if (targetMember.role === 'VIEWER') {
        alert('Thành viên có vai trò Người xem (Viewer) không thể nhận nhiệm vụ.');
        return;
      }
      effectiveMemberId = targetMember.user?.id || targetMember.user_id || targetMember.id;
      targetUser = targetMember.user || {
        id: effectiveMemberId,
        name: (targetMember as any).name || 'Thành viên',
        avatar: (targetMember as any).avatar,
        email: (targetMember as any).email,
      };
    }

    const memberObj = effectiveMemberId
      ? allMembersPool.find(
          (m) => m.id === effectiveMemberId || m.user_id === effectiveMemberId || m.user?.id === effectiveMemberId,
        ) || null
      : null;

    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
            ...cl,
            items: cl.items.map((it) =>
              it.id === itemId
                ? {
                  ...it,
                  user_id: effectiveMemberId,
                  user: targetUser,
                  member_id: effectiveMemberId,
                  member: memberObj,
                }
                : it,
            ),
          }
          : cl,
      ),
    );
    setActiveItemMember(null);

    const currentCardId = activeCardId || cardId || card?.id;

    try {
      await apiClient(`/checklist-items/${itemId}`, {
        method: 'PATCH',
        data: { user_id: effectiveMemberId, member_id: effectiveMemberId },
      });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể phân công thành viên cho mục');
      if (currentCardId) fetchCardDetails(currentCardId, true);
    }
  };

  const filteredBoardMembers = assignableMembers.filter((m) => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = m.user?.name?.toLowerCase() || '';
    const email = m.user?.email?.toLowerCase() || '';
    return name.includes(q) || email.includes(q);
  });

  const filteredSuggestedMembers: any[] = [];

  const filteredItemBoardMembers = assignableMembers.filter((m) => {
    const q = itemMemberSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = m.user?.name?.toLowerCase() || '';
    const email = m.user?.email?.toLowerCase() || '';
    return name.includes(q) || email.includes(q);
  });

  const filteredItemSuggestedMembers: any[] = [];

  // Filtered members for new comment mention autocomplete - LOẠI BỎ CHÍNH MÌNH (currentUser)
  const filteredMentionMembers = mentionableMembers
    .filter((m) => {
      const uId = m.user?.id || m.user_id;
      return uId !== currentUser?.id;
    })
    .filter((m) => {
      const q = mentionQuery.toLowerCase().trim();
      if (!q) return true;
      const name = m.user?.name || '';
      const email = m.user?.email || '';
      const nameClean = removeVietnameseTones(name).toLowerCase();
      const queryClean = removeVietnameseTones(q);
      return (
        name.toLowerCase().includes(q) ||
        nameClean.includes(queryClean) ||
        email.toLowerCase().includes(q)
      );
    });

  // Filtered members for edit comment mention autocomplete - LOẠI BỎ CHÍNH MÌNH (currentUser)
  const filteredEditMentionMembers = mentionableMembers
    .filter((m) => {
      const uId = m.user?.id || m.user_id;
      return uId !== currentUser?.id;
    })
    .filter((m) => {
      const q = editMentionQuery.toLowerCase().trim();
      if (!q) return true;
      const name = m.user?.name || '';
      const email = m.user?.email || '';
      const nameClean = removeVietnameseTones(name).toLowerCase();
      const queryClean = removeVietnameseTones(q);
      return (
        name.toLowerCase().includes(q) ||
        nameClean.includes(queryClean) ||
        email.toLowerCase().includes(q)
      );
    });

  // --- COMMENT HANDLERS ---
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setCommentText(val);

    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      // Mention query cannot contain whitespace or newlines. Any space ends the mention autocomplete query.
      if (!/\s/.test(query) && query.length <= 30) {
        if (lastAtPos === 0 || /\s/.test(val[lastAtPos - 1])) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtPos);
          setIsMentionOpen(true);
          setSelectedMentionIndex(0);
          return;
        }
      }
    }

    setIsMentionOpen(false);
    setMentionStartIndex(-1);
  };

  const handleSelectMention = (memberName: string) => {
    if (mentionStartIndex === -1 || !commentInputRef.current) return;
    const cursor = commentInputRef.current.selectionStart || commentText.length;
    const before = commentText.slice(0, mentionStartIndex);
    const after = commentText.slice(cursor);
    const mentionInsert = `@${memberName} `;
    const newText = before + mentionInsert + after;
    setCommentText(newText);
    setMentionQuery('');
    setIsMentionOpen(false);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        const newCursor = before.length + mentionInsert.length;
        commentInputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen && filteredMentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredMentionMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(
          (prev) => (prev - 1 + filteredMentionMembers.length) % filteredMentionMembers.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMentionMembers[selectedMentionIndex];
        if (selected?.user?.name) {
          handleSelectMention(selected.user.name);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMentionOpen(false);
        setMentionStartIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleSubmitComment = async () => {
    const content = commentText.trim();
    if (!content || !cardId || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const res = await apiClient<CardComment>(`/cards/${cardId}/comments`, {
        method: 'POST',
        data: { content },
      });

      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data]);
        setCommentText('');
        setIsMentionOpen(false);
        setMentionStartIndex(-1);
        onCardUpdated();
        fetchCardActivities(cardId);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể gửi bình luận');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStartEditComment = (c: CardComment) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.content);
    setIsEditMentionOpen(false);
    setEditMentionStartIndex(-1);
    setTimeout(() => {
      if (editCommentInputRef.current) {
        editCommentInputRef.current.focus();
      }
    }, 50);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
    setIsEditMentionOpen(false);
    setEditMentionStartIndex(-1);
  };

  const handleEditCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setEditingCommentText(val);

    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      // Mention query cannot contain whitespace or newlines.
      if (!/\s/.test(query) && query.length <= 30) {
        if (lastAtPos === 0 || /\s/.test(val[lastAtPos - 1])) {
          setEditMentionQuery(query);
          setEditMentionStartIndex(lastAtPos);
          setIsEditMentionOpen(true);
          setSelectedEditMentionIndex(0);
          return;
        }
      }
    }

    setIsEditMentionOpen(false);
    setEditMentionStartIndex(-1);
  };

  const handleSelectEditMention = (memberName: string) => {
    if (editMentionStartIndex === -1 || !editCommentInputRef.current) return;
    const cursor = editCommentInputRef.current.selectionStart || editingCommentText.length;
    const before = editingCommentText.slice(0, editMentionStartIndex);
    const after = editingCommentText.slice(cursor);
    const mentionInsert = `@${memberName} `;
    const newText = before + mentionInsert + after;
    setEditingCommentText(newText);
    setEditMentionQuery('');
    setIsEditMentionOpen(false);
    setEditMentionStartIndex(-1);

    setTimeout(() => {
      if (editCommentInputRef.current) {
        editCommentInputRef.current.focus();
        const newCursor = before.length + mentionInsert.length;
        editCommentInputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  const handleEditCommentKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    commentId: string,
  ) => {
    if (isEditMentionOpen && filteredEditMentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedEditMentionIndex((prev) => (prev + 1) % filteredEditMentionMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedEditMentionIndex(
          (prev) =>
            (prev - 1 + filteredEditMentionMembers.length) % filteredEditMentionMembers.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredEditMentionMembers[selectedEditMentionIndex];
        if (selected?.user?.name) {
          handleSelectEditMention(selected.user.name);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveEditComment(commentId);
    }
  };

  const handleSaveEditComment = async (commentId: string) => {
    const content = editingCommentText.trim();
    if (!content || isUpdatingComment) return;

    try {
      setIsUpdatingComment(true);
      const res = await apiClient<CardComment>(`/comments/${commentId}`, {
        method: 'PATCH',
        data: { content },
      });

      if (res.success && res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, content: res.data.content, user: res.data.user || c.user }
              : c,
          ),
        );
        setEditingCommentId(null);
        setEditingCommentText('');
        setIsEditMentionOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật bình luận');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setDeletingCommentId(commentId);
      const res = await apiClient(`/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa bình luận');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const renderCommentContent = (content: string) => {
    if (!content) return null;

    const memberNames = assignableMembers
      .map((m) => m.user?.name)
      .filter(Boolean) as string[];

    memberNames.sort((a, b) => b.length - a.length);

    const pattern =
      memberNames.length > 0
        ? new RegExp(
          `(@(?:${memberNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|[a-zA-Z0-9_\\u00C0-\\u024F\\u1EA0-\\u1EF9]+))`,
          'gi',
        )
        : /(@[a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+)/gi;

    const parts = content.split(pattern);

    return (
      <span className="whitespace-pre-wrap break-words leading-relaxed text-xs text-slate-700">
        {parts.map((part, idx) => {
          if (part.startsWith('@')) {
            const rawName = part.slice(1).trim().toLowerCase();
            const isMember = memberNames.some(
              (name) =>
                name.toLowerCase() === rawName || rawName.startsWith(name.toLowerCase()),
            );

            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold mx-0.5 transition-all ${isMember
                    ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-2xs'
                    : 'bg-[#ffc0cb]/30 text-[#d86969] border border-[#ffc0cb]/80'
                  }`}
              >
                <span className="text-slate-500 font-black">@</span>
                <span>{part.slice(1)}</span>
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-5xl h-[88vh] max-h-[850px] flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Trong danh sách</span>
              <span className="font-semibold text-slate-800 underline underline-offset-2">
                {card?.list?.title || 'Đang tải...'}
              </span>
            </div>
            {canEdit ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveAll}
                className="w-full text-base sm:text-lg font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md px-2 py-1 -ml-2 focus:outline-none transition-all"
                placeholder="Tiêu đề thẻ..."
              />
            ) : (
              <h2 className="text-base sm:text-lg font-bold text-slate-900 px-2 py-1 -ml-2 select-text">
                {title || card?.title || 'Tiêu đề thẻ'}
              </h2>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-only Banner for Viewers */}
        {!canEdit && (
          <div className="px-4 sm:px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-slate-800">Chế độ chỉ xem</span>
            <span className="text-slate-400">—</span>
            <span className="text-slate-500">Bạn đang xem thẻ này và không có quyền chỉnh sửa nội dung</span>
          </div>
        )}

        {/* Modal Body */}
        {isLoading && !card ? (
          <div className="flex-1 p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-[#f28d8d] rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Đang tải thông tin thẻ...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left Pane (Card Details & Settings) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-white min-w-0">
              {/* Quick Actions Toolbar */}
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Thao tác:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMembersModalOpen(true);
                    setMemberSearchQuery('');
                  }}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${assignees.length > 0
                      ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                      : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thành viên {assignees.length > 0 && `(${assignees.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLabelsModalOpen(true);
                    setIsCreatingLabel(false);
                    setEditingLabel(null);
                    setLabelSearchQuery('');
                  }}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${cardLabels.length > 0
                      ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                      : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                >
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nhãn {cardLabels.length > 0 && `(${cardLabels.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingChecklist(true);
                    setNewChecklistTitle('Việc cần làm');
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>Checklist</span>
                </button>

                {/* AI Task Breakdown Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAiBreakdownOpen(true);
                    setAiBreakdownError(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-[#d86969] bg-[#ffc0cb]/25 hover:bg-[#ffc0cb]/40 border border-[#ffc0cb]/80 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
                  title="Phân rã công việc tự động bằng Google Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#d86969] animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="font-bold">AI Phân rã</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenDatesModal}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${dueDate
                      ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                      : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{dueDate ? 'Thời hạn' : 'Ngày hạn'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAttachmentsModalOpen(true);
                    setAttachmentTab('upload');
                    setSelectedUploadFile(null);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${attachments.length > 0
                      ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                      : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span>Đính kèm {attachments.length > 0 && `(${attachments.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenRelationsModal}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${relations.length > 0
                      ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                      : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                  title="Quản lý mối quan hệ giữa các thẻ (cha/con, chặn/bị chặn, liên quan)"
                >
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  <span>Liên kết {relations.length > 0 && `(${relations.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (boardCustomFields.length === 0) {
                      setIsCustomFieldsModalOpen(true);
                    } else {
                      customFieldsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setHighlightedSection('custom_fields');
                      setTimeout(() => setHighlightedSection((curr) => curr === 'custom_fields' ? null : curr), 2500);
                    }
                  }}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    Object.keys(cardCustomFieldValues).length > 0
                      ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                      : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title="Quản lý và thiết lập các trường tùy chỉnh cho thẻ"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Trường tùy chỉnh{' '}
                    {Object.keys(cardCustomFieldValues).length > 0 &&
                      `(${Object.keys(cardCustomFieldValues).length})`}
                  </span>
                </button>

                {/* Nút tự động hóa (Automation Card Buttons) */}
                {cardButtons.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleExecuteCardButton(btn)}
                    disabled={executingCardButtonId === btn.id}
                    className="px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    title={`Nút tự động hóa: ${btn.name}`}
                  >
                    {executingCardButtonId === btn.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{btn.button_label || btn.name}</span>
                  </button>
                ))}

                <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onClick={() => onMoveRequest(card)}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Di chuyển thẻ"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Di chuyển</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCopyRequest(card)}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Sao chép thẻ"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Sao chép liên kết"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{copyLinkSuccess ? 'Đã chép!' : 'Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={requestDeleteCard}
                  className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                  title="Xóa thẻ này"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa thẻ</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chế độ chỉ xem — Không thể chỉnh sửa hoặc thao tác trên thẻ</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  title="Sao chép liên kết thẻ"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{copyLinkSuccess ? 'Đã chép link!' : 'Sao chép link thẻ'}</span>
                </button>
              </div>
            )}

              {/* Inline Add Checklist Form if active */}
              {canEdit && isAddingChecklist && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2 animate-in fade-in duration-150 shadow-2xs">
                  <div className="text-xs font-bold text-slate-900">Tiêu đề Checklist</div>
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateChecklist();
                      if (e.key === 'Escape') setIsAddingChecklist(false);
                    }}
                    autoFocus
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-lg p-2 focus:outline-none shadow-2xs"
                    placeholder="Ví dụ: Việc cần làm..."
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCreateChecklist}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      Thêm
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingChecklist(false)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {/* Top Badges (Members & Labels) */}
              {(assignees.length > 0 || cardLabels.length > 0) && (
                <div className="flex flex-wrap items-start gap-6 pb-1">
                  {/* Assigned Members Section */}
                  {assignees.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Thành viên
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignees.map((a) => {
                          const member = a.board_member;
                          const uId = a.user_id || a.user?.id || member?.user?.id || member?.user_id;
                          const isOnline = activeUserIds?.has(uId);
                          const uName = a.user?.name || member?.user?.name || 'Thành viên';
                          const uAvatar = a.user?.avatar || member?.user?.avatar;
                          const firstLetter = uName.charAt(0).toUpperCase();

                          return (
                            <div
                              key={a.id || member?.id}
                              onClick={canEdit ? () => {
                                setIsMembersModalOpen(true);
                                setMemberSearchQuery('');
                              } : undefined}
                              className={`group flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-slate-100 rounded-full border border-slate-200/80 transition-all shadow-2xs ${
                                canEdit ? 'hover:bg-slate-200 cursor-pointer' : 'cursor-default'
                              }`}
                              title={`${uName} (${member?.role || 'MEMBER'})${isOnline ? ' - 🟢 Đang hoạt động trên bảng' : ''}${canEdit ? ' - Bấm để thay đổi' : ''}`}
                            >
                              <div className="relative shrink-0">
                                {uAvatar ? (
                                  <img
                                    src={uAvatar}
                                    alt={uName}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                                    {firstLetter}
                                  </div>
                                )}
                                {isOnline && (
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 z-10">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-slate-900">{uName}</span>
                            </div>
                          );
                        })}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMembersModalOpen(true);
                              setMemberSearchQuery('');
                            }}
                            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                            title="Thêm thành viên"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Labels Section */}
                  {cardLabels.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Nhãn
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cardLabels.map((cl) => (
                          <button
                            key={cl.id || cl.label?.id}
                            type="button"
                            disabled={!canEdit}
                            onClick={canEdit ? () => {
                              setIsLabelsModalOpen(true);
                              setIsCreatingLabel(false);
                              setEditingLabel(null);
                              setLabelSearchQuery('');
                            } : undefined}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-2xs transition-all ${
                              canEdit ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'
                            }`}
                            style={{ backgroundColor: cl.label?.color || '#3b82f6' }}
                            title={`${cl.label?.name}${canEdit ? ' - Bấm để thay đổi' : ''}`}
                          >
                            {cl.label?.name}
                          </button>
                        ))}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsLabelsModalOpen(true);
                              setIsCreatingLabel(false);
                              setEditingLabel(null);
                              setLabelSearchQuery('');
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                            title="Thêm nhãn"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Due Date quick status banner */}
              {dueDate && deadlineStatus && (
                <div
                  ref={datesSectionRef}
                  className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all ${
                    highlightedSection === 'dates'
                      ? 'ring-2 ring-[#f28d8d] bg-[#ffc0cb]/15 scale-[1.01]'
                      : isCompleted
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : deadlineStatus.status === 'overdue'
                          ? 'bg-rose-50/80 border-rose-200'
                          : deadlineStatus.status === 'due_soon'
                            ? 'bg-amber-50/80 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={canEdit ? handleToggleCompleted : undefined}
                      disabled={!canEdit}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                        !canEdit
                          ? isCompleted
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'border-2 border-slate-300 bg-white cursor-default'
                          : isCompleted
                            ? 'bg-emerald-600 text-white cursor-pointer'
                            : relations.some(r => r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed && r.related_card?.status !== 'DONE')
                              ? 'border-2 border-rose-400 bg-rose-50 text-rose-600 hover:border-rose-600 cursor-pointer'
                              : 'border-2 border-slate-300 hover:border-slate-300 bg-white cursor-pointer'
                      }`}
                      title={
                        !canEdit
                          ? isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'
                          : isCompleted
                            ? 'Đánh dấu chưa hoàn thành'
                            : relations.some(r => r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed && r.related_card?.status !== 'DONE')
                              ? '⛔ Thẻ đang bị chặn bởi thẻ khác chưa hoàn thành (Bấm để xem chi tiết)'
                              : 'Đánh dấu đã hoàn thành'
                      }
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : relations.some(r => r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed && r.related_card?.status !== 'DONE') ? (
                        <Ban className="w-3 h-3 text-rose-500" />
                      ) : null}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {startDate ? (
                            <>
                              {new Date(startDate).toLocaleDateString('vi-VN', {
                                day: 'numeric',
                                month: 'short',
                              })}{' '}
                              -{' '}
                            </>
                          ) : null}
                          {new Date(dueDate).toLocaleString('vi-VN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${deadlineStatus.badgeBg}`}
                        >
                          <deadlineStatus.icon className="w-3 h-3" />
                          <span>{deadlineStatus.label}</span>
                        </span>
                      </div>

                      {reminderLabel && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Bell className="w-3 h-3 text-slate-500" />
                          <span>{reminderLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenDatesModal}
                      className="self-end sm:self-center px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100 bg-white/70 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Sửa ngày
                    </button>
                  )}
                </div>
              )}

              {/* Custom Fields Section - Chỉ hiển thị khi bảng thực sự có trường tùy chỉnh */}
              {boardCustomFields.length > 0 && (
                <div
                  ref={customFieldsSectionRef}
                  className={`space-y-3 pt-4 border-t border-slate-100 transition-all rounded-xl ${
                    highlightedSection === 'custom_fields'
                      ? 'ring-2 ring-[#f28d8d] bg-[#ffc0cb]/15 p-3'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                      <span>Trường tùy chỉnh</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                        {Object.keys(cardCustomFieldValues).length}/{boardCustomFields.length}
                      </span>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsCustomFieldsModalOpen(true)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                        title="Cấu hình hoặc thêm trường dữ liệu tùy chỉnh cho bảng"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Quản lý trường</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {boardCustomFields.map((field) => {
                      const curVal = cardCustomFieldValues[field.id]?.value;
                      const hasValue = curVal !== undefined && curVal !== null && curVal !== '';
                      const isEditing = editingCustomFieldId === field.id;

                      const typeConfig = FIELD_TYPE_CONFIG[field.field_type] || {
                        label: field.name,
                        icon: AlignLeft,
                        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                        iconColor: 'text-slate-500',
                      };
                      const Icon = typeConfig.icon;
                      const badgeColor = typeConfig.badgeBg;

                      return (
                        <div
                          key={field.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between gap-2.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`p-1 rounded-md bg-slate-50 ${typeConfig.iconColor}`}>
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate" title={field.name}>
                                {field.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                                ({typeConfig.label})
                              </span>
                            </div>
                            {canEdit && hasValue && !isEditing && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomFieldValue(field.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 rounded transition-opacity cursor-pointer"
                                title="Xóa giá trị của trường này"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Controls based on field type */}
                          {field.field_type === 'CHECKBOX' ? (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={canEdit ? () => {
                                const nextVal = curVal === 'true' ? 'false' : 'true';
                                handleSaveCustomFieldValue(field.id, nextVal);
                              } : undefined}
                              className={`w-full py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                                !canEdit ? 'cursor-default' : 'cursor-pointer hover:bg-slate-100'
                              } ${
                                curVal === 'true'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              <span>{curVal === 'true' ? 'Đã kích hoạt' : 'Chưa kích hoạt'}</span>
                              <div
                                className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                                  curVal === 'true' ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {curVal === 'true' && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </button>
                          ) : field.field_type === 'RATING' ? (
                            <div className="flex items-center justify-between bg-amber-50/60 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const isFilled = Number(curVal) >= star;
                                  return (
                                    <button
                                      key={star}
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={canEdit ? () => {
                                        const nextVal = Number(curVal) === star ? null : String(star);
                                        if (nextVal === null) {
                                          handleDeleteCustomFieldValue(field.id);
                                        } else {
                                          handleSaveCustomFieldValue(field.id, nextVal);
                                        }
                                      } : undefined}
                                      className={`p-0.5 transition-transform ${canEdit ? 'hover:scale-125 cursor-pointer group' : 'cursor-default'}`}
                                      title={`Đánh giá ${star} sao`}
                                    >
                                      <Star
                                        className={`w-4 h-4 transition-colors ${
                                          isFilled
                                            ? 'fill-amber-400 text-amber-500'
                                            : 'text-slate-300 group-hover:text-amber-300'
                                        }`}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                              <span className="text-[11px] font-bold text-amber-800">
                                {curVal ? `${curVal}/5 sao` : 'Chưa chấm điểm'}
                              </span>
                            </div>
                          ) : field.field_type === 'PERCENT' ? (
                            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[11px] font-semibold text-slate-600">Tiến độ hoàn thành</span>
                                <span className="text-xs font-bold text-slate-900">{curVal ? `${curVal}%` : '0%'}</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    Number(curVal) >= 100
                                      ? 'bg-emerald-500'
                                      : Number(curVal) >= 50
                                      ? 'bg-cyan-500'
                                      : Number(curVal) > 0
                                      ? 'bg-amber-500'
                                      : 'bg-transparent'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, Number(curVal) || 0))}%` }}
                                />
                              </div>
                              {canEdit && (
                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                  {[0, 25, 50, 75, 100].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() => handleSaveCustomFieldValue(field.id, String(pct))}
                                      className={`flex-1 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                                        Number(curVal) === pct
                                          ? 'bg-cyan-600 text-white shadow-2xs'
                                          : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                                      }`}
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : field.field_type === 'DROPDOWN' ? (
                            (() => {
                              const options =
                                field.options && field.options.length > 0
                                  ? field.options
                                  : getDropdownOptionsForField(field.name);
                              return (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={curVal || ''}
                                    disabled={!canEdit}
                                    onChange={canEdit ? (e) => {
                                      handleSaveCustomFieldValue(field.id, e.target.value);
                                    } : undefined}
                                    className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold shadow-2xs ${
                                      canEdit ? 'hover:bg-white focus:bg-white focus:border-[#87ceeb] cursor-pointer' : 'cursor-default opacity-80'
                                    }`}
                                  >
                                    <option value="">-- {curVal || `Chọn ${field.name}`} --</option>
                                    {options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                    {hasValue && !options.includes(curVal) && (
                                      <option value={curVal}>{curVal} (Tùy chỉnh)</option>
                                    )}
                                  </select>

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDropdownOptionsModal(field)}
                                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                                      title="Chỉnh sửa danh sách các lựa chọn của trường này"
                                    >
                                      <Settings2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          ) : field.field_type === 'CURRENCY' ? (
                            isEditing && canEdit ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    value={tempCustomFieldValue}
                                    onChange={(e) => setTempCustomFieldValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveCustomFieldValue(field.id, tempCustomFieldValue);
                                      if (e.key === 'Escape') setEditingCustomFieldId(null);
                                    }}
                                    placeholder="Số tiền..."
                                    autoFocus
                                    className="w-full pl-2.5 pr-8 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    ₫
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isSavingCustomField}
                                  onClick={() => handleSaveCustomFieldValue(field.id, tempCustomFieldValue)}
                                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                                  title="Lưu"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCustomFieldId(null)}
                                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Hủy"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : hasValue ? (
                              <div
                                onClick={canEdit ? () => {
                                  setEditingCustomFieldId(field.id);
                                  setTempCustomFieldValue(curVal || '');
                                } : undefined}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-between transition-colors bg-emerald-50 text-emerald-800 border-emerald-200 ${
                                  canEdit ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                                }`}
                                title={canEdit ? "Bấm để chỉnh sửa số tiền" : undefined}
                              >
                                <span className="truncate">
                                  {Number(curVal) ? `${Number(curVal).toLocaleString('vi-VN')} ₫` : curVal}
                                </span>
                                {canEdit && <Edit2 className="w-3 h-3 opacity-60 ml-1.5 shrink-0" />}
                              </div>
                            ) : canEdit ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCustomFieldId(field.id);
                                  setTempCustomFieldValue('');
                                }}
                                className="w-full py-1.5 px-2.5 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Nhập số tiền...</span>
                              </button>
                            ) : (
                              <div className="px-2.5 py-1.5 text-xs text-slate-400 italic">
                                Chưa nhập
                              </div>
                            )
                          ) : isEditing && canEdit ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type={field.field_type === 'NUMBER' ? 'number' : 'text'}
                                value={tempCustomFieldValue}
                                onChange={(e) => setTempCustomFieldValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveCustomFieldValue(field.id, tempCustomFieldValue);
                                  } else if (e.key === 'Escape') {
                                    setEditingCustomFieldId(null);
                                  }
                                }}
                                placeholder={field.field_type === 'NUMBER' ? 'Nhập số...' : 'Nhập văn bản...'}
                                autoFocus
                                className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
                              />
                              <button
                                type="button"
                                disabled={isSavingCustomField}
                                onClick={() => handleSaveCustomFieldValue(field.id, tempCustomFieldValue)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                                title="Lưu"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCustomFieldId(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : hasValue ? (
                            <div
                              onClick={canEdit ? () => {
                                setEditingCustomFieldId(field.id);
                                setTempCustomFieldValue(curVal || '');
                              } : undefined}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${badgeColor} ${
                                canEdit ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                              }`}
                              title={canEdit ? "Bấm để chỉnh sửa" : undefined}
                            >
                              <span className="truncate">{curVal}</span>
                              {canEdit && <Edit2 className="w-3 h-3 opacity-60 ml-1.5 shrink-0" />}
                            </div>
                          ) : canEdit ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCustomFieldId(field.id);
                                setTempCustomFieldValue('');
                              }}
                              className="w-full py-1.5 px-2.5 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{field.field_type === 'NUMBER' ? 'Thêm số...' : 'Thêm văn bản...'}</span>
                            </button>
                          ) : (
                            <div className="px-2.5 py-1.5 text-xs text-slate-400 italic">
                              Chưa nhập
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <AlignLeft className="w-4 h-4 text-slate-500" />
                  <span>Mô tả chi tiết</span>
                </div>
                {canEdit ? (
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSaveAll}
                    placeholder="Thêm mô tả chi tiết hơn về công việc này..."
                    className="w-full text-xs text-slate-900 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md p-3 focus:outline-none transition-all resize-y"
                  />
                ) : (
                  <div className="w-full text-xs text-slate-700 bg-slate-50/70 border border-slate-200/80 rounded-md p-3 whitespace-pre-wrap min-h-[60px]">
                    {description ? description : <span className="text-slate-400 italic">Không có mô tả chi tiết</span>}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {attachments.length > 0 && (
                <div
                  ref={attachmentsSectionRef}
                  className={`space-y-3 pt-4 border-t border-slate-100 transition-all rounded-lg ${
                    highlightedSection === 'attachments'
                      ? 'ring-2 ring-[#f28d8d] bg-[#ffc0cb]/15 p-2'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Paperclip className="w-4 h-4 text-slate-500" />
                      <span>Tệp đính kèm</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[11px] font-bold">
                        {attachments.length}
                      </span>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentsModalOpen(true);
                          setAttachmentTab('upload');
                          setSelectedUploadFile(null);
                        }}
                        className="text-xs font-semibold text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm</span>
                      </button>
                    )}
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-2.5">
                    {attachments.map((att) => {
                      const isImg = isImageFile(att.file_name, att.file_url);
                      const isEditing = editingAttachmentId === att.id;

                      return (
                        <div
                          key={att.id}
                          className="group flex items-start gap-3 p-2.5 rounded-md border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all shadow-2xs relative"
                        >
                          {/* Thumbnail / File Icon */}
                          {isImg ? (
                            <div
                              onClick={() => setPreviewImageAttachment(att)}
                              className="w-16 h-14 rounded-lg overflow-hidden bg-slate-200 shrink-0 cursor-pointer relative group/thumb border border-slate-200"
                              title="Bấm để xem ảnh phóng to"
                            >
                              {att.file_url ? (
                                <img
                                  src={att.file_url}
                                  alt={att.file_name || 'Ảnh đính kèm'}
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                  <ImageIcon className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Maximize2 className="w-4 h-4" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs">
                              {getFileIcon(att.file_name, att.file_url)}
                            </div>
                          )}

                          {/* Info and Actions */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingAttachmentName}
                                  onChange={(e) => setEditingAttachmentName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateAttachmentName(att.id);
                                    if (e.key === 'Escape') setEditingAttachmentId(null);
                                  }}
                                  autoFocus
                                  className="text-xs text-slate-900 font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 flex-1 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttachmentName(att.id)}
                                  disabled={isUpdatingAttachment}
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-lg cursor-pointer"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAttachmentId(null)}
                                  className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  {(!att.file_size && !att.file_url?.includes('/attachments/') && !att.file_url?.startsWith('data:')) ? (
                                    <a
                                      href={att.file_url || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-bold text-slate-900 hover:underline truncate"
                                      title={att.file_name || att.file_url || ''}
                                    >
                                      {att.file_name || att.file_url || 'Liên kết'}
                                    </a>
                                  ) : isImg ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImageAttachment(att)}
                                      className="text-xs font-bold text-slate-900 hover:underline truncate text-left cursor-pointer"
                                      title={att.file_name || 'Bấm để xem ảnh'}
                                    >
                                      {att.file_name || 'Ảnh đính kèm'}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadAttachment(att)}
                                      className="text-xs font-bold text-slate-900 hover:underline truncate text-left cursor-pointer"
                                      title={att.file_name ? `Bấm để tải xuống ${att.file_name}` : 'Tải xuống'}
                                    >
                                      {att.file_name || 'Tệp đính kèm'}
                                    </button>
                                  )}
                                  {att.file_url && (!att.file_size && !att.file_url?.includes('/attachments/') && !att.file_url?.startsWith('data:')) && (
                                    <a
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 hover:text-slate-900 shrink-0"
                                      title="Mở trong tab mới"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                  {att.file_size ? <span>{formatFileSize(att.file_size)}</span> : null}
                                  {att.created_at && <span>{formatRelativeTime(att.created_at)}</span>}
                                </div>
                              </>
                            )}

                            {/* Action Buttons Row */}
                            {!isEditing && (
                              <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-500">
                                {isImg && att.file_url && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageAttachment(att)}
                                    className="hover:text-slate-900 hover:underline cursor-pointer flex items-center gap-0.5 text-[11px]"
                                  >
                                    <span>Xem trước</span>
                                  </button>
                                )}

                                {att.file_url && (
                                  (!att.file_size && !att.file_url?.includes('/attachments/') && !att.file_url?.startsWith('data:')) ? (
                                    <a
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-slate-900 hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Mở liên kết</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadAttachment(att)}
                                      disabled={downloadingAttachmentId === att.id}
                                      className="hover:text-slate-900 hover:underline cursor-pointer flex items-center gap-1 text-[11px] disabled:opacity-50"
                                      title="Tải tệp xuống máy tính"
                                    >
                                      {downloadingAttachmentId === att.id ? (
                                        <>
                                          <div className="w-2.5 h-2.5 border-2 border-slate-600/30 border-t-slate-900 rounded-full animate-spin" />
                                          <span>Đang tải...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-3 h-3" />
                                          <span>Tải xuống</span>
                                        </>
                                      )}
                                    </button>
                                  )
                                )}

                                {canEdit && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAttachmentId(att.id);
                                        setEditingAttachmentName(att.file_name || '');
                                      }}
                                      className="hover:text-slate-900 hover:underline cursor-pointer text-[11px]"
                                    >
                                      <span>Đổi tên</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => requestDeleteAttachment(att.id, att.file_name || 'Tệp đính kèm')}
                                      className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer text-[11px]"
                                    >
                                      <span>Xóa</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CARD RELATIONSHIPS SECTION */}
              {relations.length > 0 && (() => {
                const parentRelation = relations.find((r) => r.type === 'SUBTASK');
                const subtasks = relations.filter((r) => r.type === 'PARENT');
                const blockedBy = relations.filter((r) => r.type === 'BLOCKED_BY');
                const blocks = relations.filter((r) => r.type === 'BLOCKS');
                const relatesTo = relations.filter((r) => r.type === 'RELATES_TO');
                const duplicates = relations.filter((r) => r.type === 'DUPLICATE');

                const completedSubtasksCount = subtasks.filter(
                  (st) => st.related_card?.is_due_date_completed || st.related_card?.status === 'DONE'
                ).length;
                const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

                const hasUncompletedBlocker = blockedBy.some(
                  (b) => !b.related_card?.is_due_date_completed && b.related_card?.status !== 'DONE'
                );

                return (
                  <div
                    ref={relationsSectionRef}
                    className={`space-y-4 pt-4 border-t border-slate-100 transition-all rounded-lg ${
                      highlightedSection === 'relations'
                        ? 'ring-2 ring-slate-900 bg-slate-100 p-2'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                        <GitBranch className="w-4 h-4 text-slate-500" />
                        <span>Mối quan hệ thẻ</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[11px] font-bold">
                          {relations.length}
                        </span>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={handleOpenRelationsModal}
                          className="text-xs font-semibold text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </button>
                      )}
                    </div>

                    {/* 1. Parent Card (if this card is a subtask of another card) */}
                    {parentRelation?.related_card && (
                      <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-lg space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                            <FolderTree className="w-3.5 h-3.5" />
                            <span>Thuộc thẻ cha (Parent Task)</span>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRelation(parentRelation.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Gỡ bỏ liên kết thẻ cha"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div
                          onClick={() => handleNavigateToRelatedCard(parentRelation.related_card!.id)}
                          className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-md border border-purple-100 hover:border-purple-300 hover:shadow-2xs cursor-pointer transition-all"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 hover:underline truncate">
                              {parentRelation.related_card.title}
                            </span>
                            {parentRelation.related_card.list?.name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                                {parentRelation.related_card.list.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {parentRelation.related_card.status && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-purple-100 text-purple-700">
                                {parentRelation.related_card.status}
                              </span>
                            )}
                            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Subtasks (if this card has subtasks) */}
                    {subtasks.length > 0 && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-slate-900" />
                            <span className="text-xs font-bold text-slate-900">Thẻ con (Subtasks)</span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {completedSubtasksCount}/{subtasks.length} hoàn thành ({subtaskProgress}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${subtaskProgress}%` }}
                          />
                        </div>

                        {/* Subtasks List */}
                        <div className="space-y-1.5">
                          {subtasks.map((st) => {
                            const relCard = st.related_card;
                            if (!relCard) return null;
                            const isDone = relCard.is_due_date_completed || relCard.status === 'DONE';

                            return (
                              <div
                                key={st.id}
                                className="flex items-center justify-between gap-2 p-2 bg-white rounded-md border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition-all group"
                              >
                                <div
                                  onClick={() => handleNavigateToRelatedCard(relCard.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                >
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 border ${
                                      isDone
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-300 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </div>
                                  <span
                                    className={`text-xs font-semibold truncate ${
                                      isDone ? 'line-through text-slate-400' : 'text-slate-900 hover:underline'
                                    }`}
                                  >
                                    {relCard.title}
                                  </span>
                                  {(relCard.list?.title || relCard.list?.name) && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                      {relCard.list?.title || relCard.list?.name}
                                    </span>
                                  )}
                                </div>

                                {canEdit && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRelation(st.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                      title="Gỡ bỏ liên kết thẻ con"
                                    >
                                      <Unlink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Blocked By Warning & List */}
                    {blockedBy.length > 0 && (
                      <div
                        className={`p-3.5 rounded-lg border space-y-2.5 shadow-2xs ${
                          hasUncompletedBlocker
                            ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <ShieldAlert className={`w-4 h-4 ${hasUncompletedBlocker ? 'text-rose-600' : 'text-slate-500'}`} />
                          <span>Bị chặn bởi (Blocked by) - {blockedBy.length} thẻ</span>
                          {hasUncompletedBlocker && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 font-semibold">
                              Cần hoàn thành trước
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {blockedBy.map((b) => {
                            const relCard = b.related_card;
                            if (!relCard) return null;
                            const isDone = relCard.is_due_date_completed || relCard.status === 'DONE';

                            return (
                              <div
                                key={b.id}
                                className="flex items-center justify-between gap-2 p-2 bg-white rounded-md border border-slate-200 hover:border-rose-300 hover:shadow-2xs transition-all group"
                              >
                                <div
                                  onClick={() => handleNavigateToRelatedCard(relCard.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                >
                                  <span
                                    className={`text-xs font-semibold truncate ${
                                      isDone ? 'line-through text-slate-400' : 'text-slate-900 hover:underline'
                                    }`}
                                  >
                                    {relCard.title}
                                  </span>
                                  {(relCard.list?.title || relCard.list?.name) && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                      {relCard.list?.title || relCard.list?.name}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                      isDone
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {isDone ? 'Đã xong' : 'Chưa xong'}
                                  </span>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRelation(b.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                      title="Gỡ bỏ liên kết"
                                    >
                                      <Unlink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Blocks (Chặn thẻ khác) */}
                    {blocks.length > 0 && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Thẻ này đang chặn tiến độ của ({blocks.length}) thẻ</span>
                        </div>

                        <div className="space-y-1.5">
                          {blocks.map((blk) => {
                            const relCard = blk.related_card;
                            if (!relCard) return null;

                            return (
                              <div
                                key={blk.id}
                                className="flex items-center justify-between gap-2 p-2 bg-white rounded-md border border-amber-100 hover:border-amber-300 hover:shadow-2xs transition-all group"
                              >
                                <div
                                  onClick={() => handleNavigateToRelatedCard(relCard.id)}
                                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                >
                                  <span className="text-xs font-semibold text-slate-900 hover:underline truncate">
                                    {relCard.title}
                                  </span>
                                  {(relCard.list?.title || relCard.list?.name) && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                      {relCard.list?.title || relCard.list?.name}
                                    </span>
                                  )}
                                </div>

                                {canEdit && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRelation(blk.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                      title="Gỡ bỏ liên kết"
                                    >
                                      <Unlink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 5. Relates to & Duplicate */}
                    {(relatesTo.length > 0 || duplicates.length > 0) && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2.5 shadow-2xs">
                        {relatesTo.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <Link2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Thẻ liên quan ({relatesTo.length})</span>
                            </div>
                            <div className="space-y-1">
                              {relatesTo.map((rel) => {
                                const relCard = rel.related_card;
                                if (!relCard) return null;

                                return (
                                  <div
                                    key={rel.id}
                                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-md border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all group"
                                  >
                                    <div
                                      onClick={() => handleNavigateToRelatedCard(relCard.id)}
                                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                    >
                                      <span className="text-xs font-semibold text-slate-900 hover:underline truncate">
                                        {relCard.title}
                                      </span>
                                      {relCard.list?.name && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                          {relCard.list.name}
                                        </span>
                                      )}
                                    </div>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRelation(rel.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                        title="Gỡ bỏ liên kết"
                                      >
                                        <Unlink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {duplicates.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <CopyCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Trùng lặp với ({duplicates.length})</span>
                            </div>
                            <div className="space-y-1">
                              {duplicates.map((dup) => {
                                const relCard = dup.related_card;
                                if (!relCard) return null;

                                return (
                                  <div
                                    key={dup.id}
                                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-md border border-indigo-100 hover:border-indigo-300 hover:shadow-2xs transition-all group"
                                  >
                                    <div
                                      onClick={() => handleNavigateToRelatedCard(relCard.id)}
                                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                    >
                                      <span className="text-xs font-semibold text-slate-900 hover:underline truncate">
                                        {relCard.title}
                                      </span>
                                      {relCard.list?.name && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                          {relCard.list.name}
                                        </span>
                                      )}
                                    </div>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRelation(dup.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                        title="Gỡ bỏ liên kết"
                                      >
                                        <Unlink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Checklists Section */}
              <div
                ref={checklistsSectionRef}
                className={`space-y-4 transition-all rounded-lg ${
                  highlightedSection === 'checklists'
                    ? 'ring-2 ring-slate-900 bg-slate-100 p-2'
                    : ''
                }`}
              >
                {checklists.map((cl) => {
                const totalItems = cl.items?.length || 0;
                const completedItems = cl.items?.filter((i) => i.is_completed).length || 0;
                const progressPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
                const isAllDone = totalItems > 0 && completedItems === totalItems;
                const isCollapsed = !!collapsedChecklists[cl.id];

                return (
                  <div key={cl.id} className="space-y-3 pt-4 border-t border-slate-100">
                    {/* Checklist Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleChecklistCollapse(cl.id)}
                          className="p-1 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                          title={isCollapsed ? 'Mở rộng checklist' : 'Thu gọn checklist'}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'
                              }`}
                          />
                        </button>

                        <CheckSquare className="w-4 h-4 text-slate-900 shrink-0" />
                        {canEdit && editingChecklistId === cl.id ? (
                          <input
                            type="text"
                            value={editingChecklistTitle}
                            onChange={(e) => setEditingChecklistTitle(e.target.value)}
                            onBlur={() => handleUpdateChecklistTitle(cl.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateChecklistTitle(cl.id);
                              if (e.key === 'Escape') setEditingChecklistId(null);
                            }}
                            autoFocus
                            className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-none w-full"
                          />
                        ) : (
                          <span
                            onClick={canEdit ? () => {
                              setEditingChecklistId(cl.id);
                              setEditingChecklistTitle(cl.title);
                            } : undefined}
                            className={`text-xs font-bold text-slate-900 uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors truncate ${
                              canEdit ? 'cursor-pointer hover:bg-slate-100' : 'cursor-default'
                            }`}
                            title={canEdit ? "Bấm để đổi tên checklist" : undefined}
                          >
                            {cl.title}
                          </span>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => requestDeleteChecklist(cl.id)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>
                          {completedItems}/{totalItems} hoàn thành
                        </span>
                        <span className={isAllDone ? 'text-emerald-600 font-bold' : ''}>
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${isAllDone ? 'bg-emerald-500' : 'bg-[#f28d8d]'
                            }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Items List (Collapsible) */}
                    {!isCollapsed && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                        {cl.items?.map((item) => (
                          <div
                            key={item.id}
                            className="group flex items-start justify-between gap-2.5 p-2 hover:bg-slate-50/90 rounded-md transition-all border border-transparent hover:border-slate-200/60"
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <button
                                type="button"
                                disabled={!canEdit}
                                onClick={canEdit ? () =>
                                  handleToggleChecklistItem(cl.id, item.id, item.is_completed)
                                : undefined}
                                className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center transition-all ${
                                  !canEdit ? 'cursor-default' : 'cursor-pointer'
                                } ${item.is_completed
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'border border-slate-300 bg-white'
                                  }`}
                              >
                                {item.is_completed && <Check className="w-3 h-3" />}
                              </button>

                              <div className="flex-1 min-w-0 space-y-1">
                                {canEdit && editingItemId === item.id ? (
                                  <input
                                    type="text"
                                    value={editingItemContent}
                                    onChange={(e) => setEditingItemContent(e.target.value)}
                                    onBlur={() => handleUpdateItemContent(cl.id, item.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdateItemContent(cl.id, item.id);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                    autoFocus
                                    className="text-xs text-slate-900 bg-white border border-slate-300 rounded-md px-2 py-0.5 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 w-full"
                                  />
                                ) : (
                                  <span
                                    onClick={canEdit ? () => {
                                      setEditingItemId(item.id);
                                      setEditingItemContent(item.content);
                                    } : undefined}
                                    className={`text-xs leading-relaxed break-words block ${
                                      canEdit ? 'cursor-pointer hover:text-slate-900' : 'cursor-default'
                                    } ${item.is_completed
                                        ? 'line-through text-slate-400'
                                        : 'text-slate-800'
                                      }`}
                                  >
                                    {item.content}
                                  </span>
                                )}

                                {/* Item Badges: Due Date & Member */}
                                {(item.due_date || item.member) && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {/* Item Due Date Badge */}
                                    {item.due_date && (
                                      canEdit ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveItemDate({ checklistId: cl.id, item });
                                            setTempItemDueDate(toLocalDatetimeString(item.due_date));
                                          }}
                                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${item.is_completed
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through'
                                              : new Date(item.due_date).getTime() < Date.now()
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                                : new Date(item.due_date).getTime() - Date.now() < 24 * 60 * 60 * 1000
                                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                            }`}
                                          title="Bấm để chỉnh sửa thời hạn mục này"
                                        >
                                          <Clock className="w-2.5 h-2.5" />
                                          <span>
                                            {new Date(item.due_date).toLocaleDateString('vi-VN', {
                                              month: 'numeric',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </button>
                                      ) : (
                                        <div
                                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${item.is_completed
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through'
                                              : new Date(item.due_date).getTime() < Date.now()
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                                : new Date(item.due_date).getTime() - Date.now() < 24 * 60 * 60 * 1000
                                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                          <Clock className="w-2.5 h-2.5" />
                                          <span>
                                            {new Date(item.due_date).toLocaleDateString('vi-VN', {
                                              month: 'numeric',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                      )
                                    )}

                                    {/* Item Member Badge */}
                                    {item.member && (
                                      canEdit ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveItemMember({ checklistId: cl.id, item });
                                            setItemMemberSearchQuery('');
                                          }}
                                          className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 bg-slate-100 hover:bg-slate-100 rounded-full border border-slate-200 transition-all cursor-pointer shadow-2xs"
                                          title={`${item.member.user?.name || 'Thành viên'}${activeUserIds?.has(item.member.user?.id || (item.member as any)?.user_id) ? ' - 🟢 Đang online' : ''} - Bấm để đổi`}
                                        >
                                          <div className="relative shrink-0">
                                            {item.member.user?.avatar ? (
                                              <img
                                                src={item.member.user.avatar}
                                                alt={item.member.user.name}
                                                className="w-4 h-4 rounded-full object-cover shrink-0"
                                              />
                                            ) : (
                                              <div className="w-4 h-4 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                                                {(item.member.user?.name || 'U').charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                            {activeUserIds?.has(item.member.user?.id || (item.member as any)?.user_id) && (
                                              <span className="absolute -bottom-0.5 -right-0.5 flex h-1.5 w-1.5 z-10">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] font-semibold text-slate-900 truncate max-w-[100px]">
                                            {item.member.user?.name}
                                          </span>
                                        </button>
                                      ) : (
                                        <div
                                          className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 bg-slate-100 rounded-full border border-slate-200 shadow-2xs"
                                          title={`${item.member.user?.name || 'Thành viên'}`}
                                        >
                                          <div className="relative shrink-0">
                                            {item.member.user?.avatar ? (
                                              <img
                                                src={item.member.user.avatar}
                                                alt={item.member.user.name}
                                                className="w-4 h-4 rounded-full object-cover shrink-0"
                                              />
                                            ) : (
                                              <div className="w-4 h-4 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                                                {(item.member.user?.name || 'U').charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                          <span className="text-[10px] font-semibold text-slate-900 truncate max-w-[100px]">
                                            {item.member.user?.name}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Item Hover Actions */}
                            {canEdit && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItemDate({ checklistId: cl.id, item });
                                    setTempItemDueDate(toLocalDatetimeString(item.due_date));
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                                  title="Thời hạn mục này"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveItemMember({ checklistId: cl.id, item });
                                    setItemMemberSearchQuery('');
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                                  title="Phân công thành viên"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(cl.id, item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Xóa mục này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add Item Form */}
                        {canEdit && (
                          activeNewItemChecklistId === cl.id ? (
                            <div className="pt-2 space-y-2">
                              <input
                                ref={newItemInputRef}
                                type="text"
                                value={newItemContent}
                                onChange={(e) => setNewItemContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateChecklistItem(cl.id);
                                  }
                                  if (e.key === 'Escape') {
                                    setActiveNewItemChecklistId(null);
                                    setNewItemContent('');
                                  }
                                }}
                                placeholder="Nhập nội dung công việc cần làm..."
                                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md px-3 py-2 focus:outline-none focus:bg-white shadow-2xs"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCreateChecklistItem(cl.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-lg transition-colors cursor-pointer shadow-2xs"
                                >
                                  Thêm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveNewItemChecklistId(null);
                                    setNewItemContent('');
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveNewItemChecklistId(cl.id);
                                setNewItemContent('');
                              }}
                              className="mt-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm một mục</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* Right Dedicated Pane: Activity & Comments */}
            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-[#f8fafc] border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col min-h-0 overflow-hidden">
              {/* Pane Header */}
              <div className="px-4 py-3.5 border-b border-slate-200 bg-white/80 backdrop-blur-xs flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Hoạt động & Bình luận</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[11px] font-bold">
                    {comments.length + activities.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => cardId && fetchCardActivities(cardId)}
                  disabled={isLoadingActivities}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Làm mới hoạt động"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActivities ? 'animate-spin text-slate-900' : ''}`} />
                </button>
              </div>

              {/* Filter Tabs: Bình luận | Hoạt động */}
              <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActivityTab('comments')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activityTab === 'comments'
                      ? 'bg-[#87ceeb] text-slate-900 border border-[#72bde0] shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Bình luận ({comments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('activities')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activityTab === 'activities'
                      ? 'bg-[#87ceeb] text-slate-900 border border-[#72bde0] shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  Hoạt động ({activities.length})
                </button>
              </div>

              {/* Top Comment Composer (Visible on 'comments' tab) */}
              {activityTab === 'comments' && (
                canEdit ? (
                  <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-start gap-2.5 relative">
                      {/* Current User Avatar */}
                      {currentUser?.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name || 'User'}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                          {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Composer Input Box */}
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus-within:border-[#87ceeb] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#87ceeb]/40 transition-all shadow-2xs relative">
                        <textarea
                          ref={commentInputRef}
                          value={commentText}
                          onChange={handleCommentChange}
                          onKeyDown={handleCommentKeyDown}
                          rows={commentText.length > 50 || isMentionOpen ? 3 : 2}
                          placeholder="Viết bình luận..."
                          className="w-full text-xs text-slate-900 bg-transparent resize-none focus:outline-none placeholder:text-slate-400 leading-relaxed"
                        />

                        {/* Mention Autocomplete Dropdown */}
                        {isMentionOpen && (
                          <div className="absolute left-0 bottom-full mb-1 z-30 w-64 max-h-48 overflow-y-auto bg-white rounded-md shadow-xl border border-slate-200 p-1 space-y-0.5 animate-in zoom-in-95 duration-100">
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                              <span>Nhắc tên thành viên</span>
                              <span className="text-[9px] text-slate-900 font-semibold">Enter chèn</span>
                            </div>
                            {filteredMentionMembers.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-400">
                                Không tìm thấy thành viên
                              </div>
                            ) : (
                              filteredMentionMembers.map((m, idx) => {
                                const isSelected = idx === selectedMentionIndex;
                                const mName = m.user?.name || 'Thành viên';
                                const mAvatar = m.user?.avatar;
                                const mEmail = m.user?.email || '';

                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelectMention(mName)}
                                    className={`w-full p-1.5 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-slate-200 text-slate-900'
                                        : 'hover:bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {mAvatar ? (
                                      <img
                                        src={mAvatar}
                                        alt={mName}
                                        className="w-5 h-5 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {mName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold truncate leading-tight flex items-center gap-1.5">
                                        <span className="truncate">{mName}</span>
                                        {m.isBoardMember ? (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-900 font-semibold shrink-0">
                                            Bảng
                                          </span>
                                        ) : (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold shrink-0">
                                            Workspace
                                          </span>
                                        )}
                                      </div>
                                      {mEmail && (
                                        <div className="text-[10px] text-slate-400 truncate leading-tight">
                                          {mEmail}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}

                        {/* Composer Toolbar & Submit */}
                        <div className="flex items-center justify-end pt-2 border-t border-slate-200/60 mt-1">
                          <button
                            type="button"
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim() || isSubmittingComment}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-40 rounded-md shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                          >
                            {isSubmittingComment ? (
                              <span>Đang gửi...</span>
                            ) : (
                              <>
                                <span>Gửi</span>
                                <Send className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border-b border-slate-200 bg-slate-50/80 text-center shrink-0">
                    <p className="text-xs text-slate-500 font-medium">
                      Chế độ chỉ xem — Không thể gửi bình luận trên thẻ này
                    </p>
                  </div>
                )
              )}

              {/* Scrollable Feed List */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 min-h-0">
                {(() => {
                  const sortedComments = [...comments].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                  );

                  const getActivityActionIcon = (action: string) => {
                    if (action.includes('bình luận')) {
                      return <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
                    }
                    if (action.includes('đính kèm')) {
                      return <Paperclip className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                    }
                    if (action.includes('hoàn thành')) {
                      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                    }
                    if (action.includes('danh sách') || action.includes('việc cần làm')) {
                      return <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
                    }
                    if (action.includes('hạn chót') || action.includes('ngày')) {
                      return <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                    }
                    if (action.includes('nhãn')) {
                      return <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />;
                    }
                    if (action.includes('thành viên') || action.includes('phụ trách')) {
                      return <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
                    }
                    return <History className="w-3.5 h-3.5 text-slate-900 shrink-0" />;
                  };

                  const renderActivityBlock = (act: ActivityItem) => {
                    const actorName = act.user?.name || 'Người dùng';
                    const actorAvatar = act.user?.avatar;

                    return (
                      <div
                        key={`act-${act.id}`}
                        onClick={() => handleActivityClick(act)}
                        className="flex items-start gap-2.5 group animate-in fade-in duration-150 cursor-pointer"
                        title="Bấm để chuyển đến mục đã thay đổi"
                      >
                        {actorAvatar ? (
                          <img
                            src={actorAvatar}
                            alt={actorName}
                            className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 shadow-2xs"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs">
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 bg-slate-100/80 group-hover:bg-white group-hover:border-slate-300 group-hover:shadow-xs rounded-md p-2.5 border border-slate-200/80 transition-all shadow-2xs">
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {actorName}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0" title={act.created_at}>
                              {formatRelativeTime(act.created_at)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 flex items-start gap-1.5 break-words leading-relaxed">
                            <span className="mt-0.5 shrink-0">{getActivityActionIcon(act.action)}</span>
                            <span className="flex-1">{act.action}</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-900 transition-opacity shrink-0 mt-0.5" />
                          </div>
                        </div>
                      </div>
                    );
                  };

                  const renderCommentBlock = (cmt: CardComment) => {
                    const isAuthor = currentUser?.id === cmt.user_id;
                    const authorName = cmt.user?.name || 'Người dùng';
                    const authorAvatar = cmt.user?.avatar;
                    const isEditing = editingCommentId === cmt.id;

                    return (
                      <div key={`cmt-${cmt.id}`} className="flex items-start gap-2.5 group animate-in fade-in duration-150">
                        {/* Author Avatar */}
                        <div className="relative shrink-0 mt-0.5">
                          {authorAvatar ? (
                            <img
                              src={authorAvatar}
                              alt={authorName}
                              className="w-6 h-6 rounded-full object-cover shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                              {authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {activeUserIds?.has(cmt.user_id) && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-1.5 ring-white z-10"
                              title="Đang hoạt động trên bảng"
                            >
                              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                            </span>
                          )}
                        </div>

                        {/* Comment Bubble */}
                        <div className="flex-1 bg-white hover:bg-slate-50/90 rounded-md p-2.5 border border-slate-200 transition-colors relative min-w-0 shadow-2xs">
                          {/* Comment Header */}
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {authorName}
                              </span>
                              {isAuthor && (
                                <span className="text-[9px] px-1 py-0.2 bg-slate-200 text-slate-900 font-semibold rounded">
                                  Bạn
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400" title={cmt.created_at}>
                                {formatRelativeTime(cmt.created_at)}
                              </span>
                            </div>

                            {/* Comment Actions (Edit / Delete) */}
                            {canEdit && isAuthor && !isEditing && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditComment(cmt)}
                                  className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestDeleteComment(cmt.id)}
                                  disabled={deletingCommentId === cmt.id}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Comment Content / Inline Edit Form */}
                          {isEditing ? (
                            <div className="mt-1.5 space-y-1.5 relative">
                              <textarea
                                ref={editCommentInputRef}
                                value={editingCommentText}
                                onChange={handleEditCommentChange}
                                onKeyDown={(e) => handleEditCommentKeyDown(e, cmt.id)}
                                rows={2}
                                className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 shadow-2xs leading-relaxed"
                              />

                              {/* Edit Mention Autocomplete Dropdown */}
                              {isEditMentionOpen && (
                                <div className="absolute left-0 bottom-full mb-1 z-30 w-56 max-h-40 overflow-y-auto bg-white rounded-md shadow-xl border border-slate-200 p-1 space-y-0.5 animate-in zoom-in-95 duration-100">
                                  <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    Nhắc tên thành viên
                                  </div>
                                  {filteredEditMentionMembers.length === 0 ? (
                                    <div className="p-2 text-center text-xs text-slate-400">
                                      Không tìm thấy
                                    </div>
                                  ) : (
                                    filteredEditMentionMembers.map((m, idx) => {
                                      const isSelected = idx === selectedEditMentionIndex;
                                      const mName = m.user?.name || 'Thành viên';
                                      const mAvatar = m.user?.avatar;

                                      return (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => handleSelectEditMention(mName)}
                                          className={`w-full p-1.5 rounded-lg flex items-center gap-1.5 text-left transition-colors cursor-pointer ${isSelected
                                              ? 'bg-slate-200 text-slate-900'
                                              : 'hover:bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                          {mAvatar ? (
                                            <img
                                              src={mAvatar}
                                              alt={mName}
                                              className="w-4 h-4 rounded-full object-cover shrink-0"
                                            />
                                          ) : (
                                            <div className="w-4 h-4 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                              {mName.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="text-xs font-bold truncate">{mName}</span>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={handleCancelEditComment}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditComment(cmt.id)}
                                  disabled={!editingCommentText.trim() || isUpdatingComment}
                                  className="px-3 py-1 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                >
                                  {isUpdatingComment ? '...' : 'Lưu'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-800 leading-relaxed break-words">
                              {renderCommentContent(cmt.content)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  };

                  if (activityTab === 'activities') {
                    if (activities.length === 0) {
                      return (
                        <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white/70 rounded-lg border border-dashed border-slate-200 p-4">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <History className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-600">Chưa có hoạt động nào</span>
                          <span className="text-[11px] text-slate-400 max-w-[200px]">
                            Các thay đổi trên thẻ sẽ được tự động ghi lại tại đây.
                          </span>
                        </div>
                      );
                    }
                    return (
                      <>
                        {activities.map((act) => renderActivityBlock(act))}
                        {hasMoreCardActivities && (
                          <div className="pt-2 flex justify-center">
                            <button
                              type="button"
                              onClick={handleLoadMoreCardActivities}
                              disabled={isLoadingMoreActivities}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isLoadingMoreActivities ? 'Đang tải thêm...' : 'Tải thêm hoạt động cũ hơn'}
                            </button>
                          </div>
                        )}
                      </>
                    );
                  }

                  // Default: 'comments'
                  if (sortedComments.length === 0) {
                    return (
                      <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white/70 rounded-lg border border-dashed border-slate-200 p-4">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-600">Chưa có bình luận nào</span>
                        <span className="text-[11px] text-slate-400">
                          Hãy là người đầu tiên để lại bình luận cho thẻ này.
                        </span>
                      </div>
                    );
                  }
                  return sortedComments.map((cmt) => renderCommentBlock(cmt));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        {/* AI TASK BREAKDOWN MODAL */}
        {isAiBreakdownOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
            onClick={() => setIsAiBreakdownOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#f28d8d] text-white flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <span>AI Phân Rã Công Việc</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#ffc0cb]/30 text-[#d86969] border border-[#ffc0cb]/80 font-mono font-semibold">Gemini 2.5</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tự động phân tích và chia nhỏ công việc thành checklist chi tiết
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiBreakdownOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Target Card Info */}
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Thẻ đang phân rã:
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{title || card?.title}</div>
                  {description && (
                    <div className="text-slate-600 line-clamp-2 mt-1 text-[11px]">
                      {description}
                    </div>
                  )}
                </div>

                {/* Prompt instructions input */}
                {!aiBreakdownResult && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Gợi ý thêm cho AI (Tùy chọn):</span>
                      <span className="text-[10px] font-normal text-slate-400">Enter để gửi</span>
                    </label>
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ví dụ: Chia thành 4 bước: Thiết kế DB, Viết API NestJS, Làm UI React, và Viết Unit Test..."
                      rows={2}
                      className="w-full text-xs text-slate-900 bg-white border border-slate-300 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md p-2.5 focus:outline-none transition-all resize-none font-medium"
                    />

                    {aiBreakdownError && (
                      <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{aiBreakdownError}</div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleRequestAiBreakdown}
                        disabled={isLoadingAiBreakdown}
                        className="w-full py-2 px-4 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        {isLoadingAiBreakdown ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Gemini đang phân tích và bẻ nhỏ công việc...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Bắt đầu phân rã với AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Breakdown Result View */}
                {aiBreakdownResult && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Summary Card */}
                    <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>Mục tiêu & Hướng tiếp cận:</span>
                        </span>
                        {aiBreakdownResult.estimatedHours && (
                          <span className="px-2 py-0.5 rounded-xs bg-slate-200 text-slate-800 font-mono font-bold text-[11px]">
                            ⏱️ ~{aiBreakdownResult.estimatedHours} giờ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {aiBreakdownResult.summary}
                      </p>
                    </div>

                    {/* Checklist title edit */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        Tên danh sách công việc:
                      </label>
                      <input
                        type="text"
                        value={aiBreakdownResult.checklistTitle || ''}
                        onChange={(e) =>
                          setAiBreakdownResult({
                            ...aiBreakdownResult,
                            checklistTitle: e.target.value,
                          })
                        }
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md px-3 py-2 focus:outline-none"
                      />
                    </div>

                    {/* Checklist items with selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Danh sách đầu việc đề xuất ({aiBreakdownResult.items?.length || 0}):</span>
                        <button
                          type="button"
                          onClick={() => {
                            const allSelected = aiBreakdownResult.items?.every((i) => i.selected);
                            setAiBreakdownResult({
                              ...aiBreakdownResult,
                              items: aiBreakdownResult.items?.map((i) => ({ ...i, selected: !allSelected })),
                            });
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
                        >
                          {aiBreakdownResult.items?.every((i) => i.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {aiBreakdownResult.items?.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              const newItems = [...(aiBreakdownResult.items || [])];
                              newItems[idx].selected = !newItems[idx].selected;
                              setAiBreakdownResult({ ...aiBreakdownResult, items: newItems });
                            }}
                            className={`p-2.5 rounded-md border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                              item.selected
                                ? 'bg-[#ffc0cb]/15 border-[#ffc0cb]'
                                : 'bg-white border-slate-100 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={!!item.selected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded accent-[#f28d8d] cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-800 break-words">
                                {item.content}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.estimatedMinutes && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-200">
                                  {item.estimatedMinutes}m
                                </span>
                              )}
                              {item.priority && (
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-xs uppercase ${
                                    item.priority === 'HIGH'
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : item.priority === 'MEDIUM'
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {item.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                {aiBreakdownResult ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAiBreakdownResult(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      ← Phân rã lại
                    </button>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsAiBreakdownOpen(false)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAiBreakdown}
                        disabled={isApplyingAiBreakdown}
                        className="px-4 py-2 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {isApplyingAiBreakdown ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>
                              Áp dụng vào thẻ ({aiBreakdownResult.items?.filter((i) => i.selected).length || 0})
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsAiBreakdownOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS ASSIGNMENT POPOVER / MODAL */}
        {isMembersModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
            onClick={() => setIsMembersModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 flex-wrap">
                  <Users className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Phân công thành viên</span>
                  {isPrivateBoard ? (
                    <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold shrink-0">
                      Riêng tư 🔒
                    </span>
                  ) : boardVisibility === 'PUBLIC' ? (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold shrink-0">
                      Công khai 🌐
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold shrink-0">
                      Không gian 🏢
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-slate-200">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm thành viên..."
                    className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Members list */}
              <div className="p-2 overflow-y-auto space-y-3 flex-1">
                {/* 1. Thành viên Bảng */}
                <div className="space-y-1">
                  <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <span>Thành viên trong bảng ({filteredBoardMembers.length})</span>
                  </div>

                  {filteredBoardMembers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/70 rounded-md">
                      {assignableMembers.length === 0
                        ? 'Chưa có thành viên nào tham gia bảng này'
                        : 'Không tìm thấy thành viên bảng phù hợp'}
                    </div>
                  ) : (
                    filteredBoardMembers.map((m) => {
                      const uName = m.user?.name || 'Thành viên';
                      const uEmail = m.user?.email || '';
                      const uAvatar = m.user?.avatar;
                      const uId = m.user?.id || m.user_id;
                      const isAssigned = assignees.some(
                        (a) =>
                          (uId && (a.user_id === uId || a.user?.id === uId)) ||
                          a.board_member_id === m.id ||
                          a.board_member?.id === m.id ||
                          a.board_member?.user_id === uId ||
                          a.board_member?.user?.id === uId,
                      );
                      const isViewer = m.role === 'VIEWER';
                      const roleName =
                        m.role === 'ADMIN' || m.role === 'OWNER'
                          ? 'Quản trị'
                          : isViewer
                            ? 'Người xem'
                            : 'Chỉnh sửa';

                      return (
                        <div
                          key={m.id || uId}
                          onClick={() => {
                            if (isViewer) return;
                            handleToggleAssignee(m.id || uId);
                          }}
                          className={`w-full p-2.5 rounded-md flex items-center justify-between gap-3 text-left transition-colors ${
                            isViewer
                              ? 'opacity-60 bg-slate-50/70 cursor-not-allowed select-none'
                              : 'hover:bg-slate-50 cursor-pointer group'
                          }`}
                          title={isViewer ? 'Người xem (Viewer) không thể nhận nhiệm vụ' : undefined}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="relative shrink-0">
                              {uAvatar ? (
                                <img
                                  src={uAvatar}
                                  alt={uName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                  {uName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {(activeUserIds?.has(uId) || activeUserIds?.has(m.user_id) || activeUserIds?.has(m.id)) && (
                                <span
                                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white z-10"
                                  title="Đang online trên bảng"
                                >
                                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {uName}
                                </span>
                                {(activeUserIds?.has(uId) || activeUserIds?.has(m.user_id) || activeUserIds?.has(m.id)) && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold shrink-0 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Online
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                                    isViewer
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {roleName}
                                </span>
                              </div>
                              {isViewer ? (
                                <div className="text-[11px] text-amber-600 font-medium">
                                  Chỉ xem • Không thể phân công
                                </div>
                              ) : uEmail ? (
                                <div className="text-[11px] text-slate-400 truncate">{uEmail}</div>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                              isViewer
                                ? 'border border-slate-200 text-slate-300'
                                : isAssigned
                                  ? 'bg-[#f28d8d] text-white'
                                  : 'border border-slate-200 group-hover:border-slate-300'
                            }`}
                          >
                            {isAssigned && !isViewer && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>


              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DATES CONFIGURATION POPOVER / MODAL */}
        {isDatesModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
            onClick={() => setIsDatesModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Calendar className="w-4 h-4 text-slate-700" />
                  <span>Thời hạn thực hiện & Nhắc nhở</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDatesModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempEnableStart}
                      onChange={(e) => {
                        setTempEnableStart(e.target.checked);
                        if (e.target.checked && !tempStartDate) {
                          setTempStartDate(toLocalDatetimeString(new Date()));
                        }
                      }}
                      className="w-4 h-4 accent-[#f28d8d] rounded-xs cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">Ngày bắt đầu</span>
                  </label>
                  {tempEnableStart && (
                    <input
                      type="datetime-local"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md p-2.5 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium"
                    />
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempEnableDue}
                      onChange={(e) => {
                        setTempEnableDue(e.target.checked);
                        if (e.target.checked && !tempDueDate) {
                          setTempDueDate(getDefaultDueDateString());
                        }
                      }}
                      className="w-4 h-4 accent-[#f28d8d] rounded-xs cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">Ngày hết hạn (Due date)</span>
                  </label>
                  {tempEnableDue && (
                    <input
                      type="datetime-local"
                      value={tempDueDate}
                      onChange={(e) => setTempDueDate(e.target.value)}
                      className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md p-2.5 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium"
                    />
                  )}
                </div>

                {/* Reminder selector */}
                {tempEnableDue && (
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Bell className="w-3.5 h-3.5 text-slate-600" />
                      <span>Đặt lời nhắc nhở</span>
                    </label>
                    <select
                      value={tempReminderMinutes}
                      onChange={(e) => setTempReminderMinutes(Number(e.target.value))}
                      className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md p-2.5 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 cursor-pointer font-medium"
                    >
                      {REMINDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRemoveDates}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                >
                  Gỡ bỏ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDatesModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDates}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LABELS POPOVER / MODAL */}
        {isLabelsModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
            onClick={() => {
              setIsLabelsModalOpen(false);
              setIsCreatingLabel(false);
              setEditingLabel(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                {isCreatingLabel || editingLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingLabel(false);
                      setEditingLabel(null);
                    }}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Tag className="w-4 h-4 text-slate-700" />
                    <span>Nhãn ({boardLabels.length})</span>
                  </div>
                )}

                <div className="text-xs font-bold text-slate-900">
                  {isCreatingLabel ? 'Tạo nhãn mới' : editingLabel ? 'Chỉnh sửa nhãn' : ''}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsLabelsModalOpen(false);
                    setIsCreatingLabel(false);
                    setEditingLabel(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              {isCreatingLabel || editingLabel ? (
                /* Create / Edit Sub-view */
                <div className="p-4 space-y-4 overflow-y-auto">
                  {/* Preview */}
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center justify-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Xem trước nhãn</span>
                    <div
                      className="px-3 py-1 rounded-xs text-xs font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: formLabelColor }}
                    >
                      {formLabelName.trim() || 'Tên nhãn'}
                    </div>
                  </div>

                  {/* Name input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tên nhãn</label>
                    <input
                      type="text"
                      value={formLabelName}
                      onChange={(e) => setFormLabelName(e.target.value)}
                      placeholder="Ví dụ: Backend, Thiết kế..."
                      autoFocus
                      className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 font-medium"
                    />
                  </div>

                  {/* Color palette */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">Chọn màu sắc</label>
                    <div className="grid grid-cols-5 gap-2">
                      {LABEL_COLOR_PALETTE.map((item) => {
                        const isSelected = formLabelColor === item.color;
                        return (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => setFormLabelColor(item.color)}
                            title={item.name}
                            className={`h-8 rounded-md transition-all cursor-pointer flex items-center justify-center ${isSelected ? 'ring-2 ring-offset-2 ring-[#f28d8d]' : 'hover:opacity-90'
                              }`}
                            style={{ backgroundColor: item.color }}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSaveLabel}
                      disabled={!formLabelName.trim()}
                      className="w-full py-2 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-50 rounded-md shadow-2xs transition-colors cursor-pointer"
                    >
                      {editingLabel ? 'Lưu thay đổi' : 'Tạo mới'}
                    </button>

                    {editingLabel && (
                      <button
                        type="button"
                        onClick={() => requestDeleteLabel(editingLabel.id)}
                        className="w-full py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                      >
                        Xóa nhãn khỏi bảng
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Browsing / Search List */
                <>
                  {/* Search */}
                  <div className="p-3 border-b border-slate-200">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={labelSearchQuery}
                        onChange={(e) => setLabelSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm nhãn..."
                        className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Labels List */}
                  <div className="p-2 overflow-y-auto space-y-1 flex-1">
                    {filteredBoardLabels.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {boardLabels.length === 0
                          ? 'Bảng chưa có nhãn nào'
                          : 'Không tìm thấy nhãn phù hợp'}
                      </div>
                    ) : (
                      filteredBoardLabels.map((l) => {
                        const isAssigned = cardLabels.some(
                          (cl) => cl.label_id === l.id || cl.label?.id === l.id,
                        );

                        return (
                          <div
                            key={l.id}
                            className="flex items-center gap-1 group"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleCardLabel(l.id)}
                              className="flex-1 p-1.5 rounded-md hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                            >
                              <div
                                className="px-2.5 py-1 rounded-xs text-xs font-bold text-white uppercase tracking-wider flex-1 text-left truncate"
                                style={{ backgroundColor: l.color }}
                              >
                                {l.name}
                              </div>

                              <div
                                className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 transition-all ${isAssigned
                                    ? 'bg-[#f28d8d] text-white'
                                    : 'border border-slate-300 group-hover:border-slate-400'
                                  }`}
                              >
                                {isAssigned && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </button>

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLabel(l);
                                setFormLabelName(l.name);
                                setFormLabelColor(l.color || '#3b82f6');
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Chỉnh sửa nhãn"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Button: Create New */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingLabel(true);
                        setEditingLabel(null);
                        setFormLabelName(labelSearchQuery || '');
                        setFormLabelColor('#3b82f6');
                      }}
                      className="w-full py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo nhãn mới</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* CHECKLIST ITEM DEADLINE POPOVER / MODAL */}
        {activeItemDate && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
            onClick={() => setActiveItemDate(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Calendar className="w-4 h-4 text-slate-900" />
                  <span>Thời hạn mục công việc</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveItemDate(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="text-xs font-medium text-slate-600 line-clamp-1 italic">
                  "{activeItemDate.item.content}"
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Chọn ngày và giờ</label>
                  <input
                    type="datetime-local"
                    value={tempItemDueDate}
                    onChange={(e) => setTempItemDueDate(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-2.5 focus:outline-none focus:border-slate-300 focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* Quick presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setHours(17, 0, 0, 0);
                      setTempItemDueDate(toLocalDatetimeString(d));
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hôm nay 17:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(17, 0, 0, 0);
                      setTempItemDueDate(toLocalDatetimeString(d));
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Ngày mai
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      d.setHours(17, 0, 0, 0);
                      setTempItemDueDate(toLocalDatetimeString(d));
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    1 tuần
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSaveItemDueDate(
                      activeItemDate.checklistId,
                      activeItemDate.item.id,
                      null,
                    )
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Gỡ bỏ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveItemDate(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveItemDueDate(
                        activeItemDate.checklistId,
                        activeItemDate.item.id,
                        tempItemDueDate || null,
                      )
                    }
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHECKLIST ITEM MEMBER ASSIGNMENT POPOVER / MODAL */}
        {activeItemMember && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
            onClick={() => setActiveItemMember(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <UserPlus className="w-4 h-4 text-slate-900" />
                  <span>Phân công mục công việc</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveItemMember(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemMemberSearchQuery}
                    onChange={(e) => setItemMemberSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm thành viên..."
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Member list */}
              <div className="p-2 overflow-y-auto space-y-3 flex-1">
                {/* 1. Thành viên Bảng */}
                <div className="space-y-1">
                  <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <span>Thành viên trong bảng ({filteredItemBoardMembers.length})</span>
                  </div>

                  {filteredItemBoardMembers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/70 rounded-md">
                      {assignableMembers.length === 0
                        ? 'Chưa có thành viên nào tham gia bảng này'
                        : 'Không tìm thấy thành viên bảng phù hợp'}
                    </div>
                  ) : (
                    filteredItemBoardMembers.map((m) => {
                      const uName = m.user?.name || 'Thành viên';
                      const uEmail = m.user?.email || '';
                      const uAvatar = m.user?.avatar;
                      const uId = m.user?.id || m.user_id;
                      const isAssigned =
                        activeItemMember.item.user_id === uId ||
                        activeItemMember.item.member_id === m.id ||
                        activeItemMember.item.member_id === uId ||
                        activeItemMember.item.user?.id === uId ||
                        activeItemMember.item.member?.id === m.id ||
                        activeItemMember.item.member?.user?.id === uId;
                      const isViewer = m.role === 'VIEWER';
                      const roleName =
                        m.role === 'ADMIN' || m.role === 'OWNER'
                          ? 'Quản trị'
                          : isViewer
                            ? 'Người xem'
                            : 'Chỉnh sửa';

                      return (
                        <div
                          key={m.id || uId}
                          onClick={() => {
                            if (isViewer) return;
                            handleAssignItemMember(
                              activeItemMember.checklistId,
                              activeItemMember.item.id,
                              isAssigned ? null : (m.id || uId),
                            );
                          }}
                          className={`w-full p-2.5 rounded-md flex items-center justify-between gap-3 text-left transition-colors ${
                            isViewer
                              ? 'opacity-60 bg-slate-50/70 cursor-not-allowed select-none'
                              : 'hover:bg-slate-50 cursor-pointer group'
                          }`}
                          title={isViewer ? 'Người xem (Viewer) không thể nhận nhiệm vụ' : undefined}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="relative shrink-0">
                              {uAvatar ? (
                                <img
                                  src={uAvatar}
                                  alt={uName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#f28d8d] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                  {uName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {(activeUserIds?.has(uId) || activeUserIds?.has(m.user_id) || activeUserIds?.has(m.id)) && (
                                <span
                                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white z-10"
                                  title="Đang online trên bảng"
                                >
                                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {uName}
                                </span>
                                {(activeUserIds?.has(uId) || activeUserIds?.has(m.user_id) || activeUserIds?.has(m.id)) && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold shrink-0 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Online
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                                    isViewer
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {roleName}
                                </span>
                              </div>
                              {isViewer ? (
                                <div className="text-[11px] text-amber-600 font-medium">
                                  Chỉ xem • Không thể phân công
                                </div>
                              ) : uEmail ? (
                                <div className="text-[11px] text-slate-400 truncate">{uEmail}</div>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                              isAssigned
                                ? 'bg-[#f28d8d] text-white'
                                : 'border border-slate-200 group-hover:border-slate-300'
                            }`}
                          >
                            {isAssigned && !isViewer && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>


              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {(activeItemMember.item.user_id || activeItemMember.item.member_id) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAssignItemMember(
                        activeItemMember.checklistId,
                        activeItemMember.item.id,
                        null,
                      )
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Bỏ phân công
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveItemMember(null)}
                  className="ml-auto px-4 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ATTACHMENT MODAL / POPOVER */}
        {isAttachmentsModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-60 animate-in fade-in duration-100"
            onClick={() => setIsAttachmentsModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#f28d8d] text-white flex items-center justify-center shadow-2xs">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Đính kèm tệp & liên kết</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAttachmentsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAttachmentTab('upload')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${attachmentTab === 'upload'
                      ? 'bg-white text-[#d86969] border border-[#ffc0cb] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Tải tệp từ máy tính
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentTab('link')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${attachmentTab === 'link'
                      ? 'bg-white text-[#d86969] border border-[#ffc0cb] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Đính kèm liên kết
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 overflow-y-auto">
                {attachmentTab === 'upload' ? (
                  <div className="space-y-4">
                    {/* Hidden input */}
                    <input
                      type="file"
                      ref={attachmentFileInputRef}
                      onChange={(e) => {
                        handleSelectFile(e.target.files?.[0]);
                      }}
                      className="hidden"
                    />

                    {/* Drag & Drop Box */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleSelectFile(e.dataTransfer.files?.[0]);
                      }}
                      onClick={() => attachmentFileInputRef.current?.click()}
                      className="border border-dashed border-slate-300 hover:border-[#87ceeb] rounded-md p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer bg-slate-50 hover:bg-[#87ceeb]/5"
                    >
                      <div className="w-9 h-9 rounded-md bg-[#ffc0cb]/30 border border-[#ffc0cb]/60 text-[#d86969] flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-semibold text-slate-800">
                          Kéo thả tệp vào đây hoặc{' '}
                          <span className="underline underline-offset-2 text-[#d86969]">Chọn từ máy tính</span>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Hỗ trợ ảnh, PDF, tài liệu, file nén (tối đa 25MB)
                        </p>
                      </div>
                    </div>

                    {/* Error banner if file too large */}
                    {uploadFileError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{uploadFileError}</span>
                      </div>
                    )}

                    {/* Selected File Info */}
                    {selectedUploadFile && (
                      <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFileIcon(selectedUploadFile.name)}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {selectedUploadFile.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(selectedUploadFile.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUploadFile(null);
                            setUploadFileError(null);
                            if (attachmentFileInputRef.current) {
                              attachmentFileInputRef.current.value = '';
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Upload button */}
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAttachmentsModalOpen(false)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUploadAttachment()}
                        disabled={!selectedUploadFile || isUploadingAttachment}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-40 rounded-md shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isUploadingAttachment ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Đang tải lên...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Tải lên</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Đường dẫn liên kết (URL) *</label>
                      <input
                        type="url"
                        value={linkAttachmentUrl}
                        onChange={(e) => setLinkAttachmentUrl(e.target.value)}
                        placeholder="https://example.com/tai-lieu"
                        autoFocus
                        className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Tên hiển thị (Tùy chọn)</label>
                      <input
                        type="text"
                        value={linkAttachmentName}
                        onChange={(e) => setLinkAttachmentName(e.target.value)}
                        placeholder="Ví dụ: Thiết kế Figma, Google Docs..."
                        className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-md p-2 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAttachmentsModalOpen(false)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleAttachLink}
                        disabled={!linkAttachmentUrl.trim() || isAttachingLink}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-40 rounded-md shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isAttachingLink ? 'Đang lưu...' : 'Đính kèm liên kết'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IMAGE LIGHTBOX MODAL */}
        {previewImageAttachment && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-80 animate-in fade-in duration-150"
            onClick={() => setPreviewImageAttachment(null)}
          >
            <div
              className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 animate-in zoom-in-95 duration-150 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full text-white px-2">
                <span className="text-sm font-bold truncate max-w-md">
                  {previewImageAttachment.file_name || 'Ảnh đính kèm'}
                </span>
                <div className="flex items-center gap-2">
                  {previewImageAttachment.file_url && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(previewImageAttachment)}
                      disabled={downloadingAttachmentId === previewImageAttachment.id}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs disabled:opacity-50"
                      title="Tải xuống trực tiếp"
                    >
                      {downloadingAttachmentId === previewImageAttachment.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Tải về</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewImageAttachment(null)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {previewImageAttachment.file_url && (
                <img
                  src={previewImageAttachment.file_url}
                  alt={previewImageAttachment.file_name || 'Ảnh đính kèm'}
                  className="max-h-[80vh] max-w-full rounded-md object-contain shadow-2xl border border-white/20"
                />
              )}
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRMATION POPUP MODAL */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-70 animate-in fade-in duration-150">
            <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-md bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{confirmDialog.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                  disabled={confirmDialog.isLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelText || 'Hủy'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
                      await confirmDialog.onConfirm();
                    } finally {
                      setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
                    }
                  }}
                  disabled={confirmDialog.isLoading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {confirmDialog.isLoading ? 'Đang xóa...' : confirmDialog.confirmText || 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD CARD RELATION MODAL POPUP */}
        {isRelationsModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-4 z-70 animate-in fade-in duration-150"
            onClick={() => setIsRelationsModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#f28d8d] text-white flex items-center justify-center shadow-2xs">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Thêm mối quan hệ thẻ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRelationsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {/* 1. Choose Relationship Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Loại mối quan hệ
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        type: 'RELATES_TO',
                        title: 'Liên quan đến',
                        desc: 'Liên kết tham chiếu 2 chiều',
                        icon: Link2,
                        color: 'text-blue-600 bg-blue-50 border-blue-200',
                      },
                      {
                        type: 'BLOCKS',
                        title: 'Chặn thẻ này',
                        desc: 'Thẻ này phải xong trước thẻ đích',
                        icon: ShieldAlert,
                        color: 'text-amber-600 bg-amber-50 border-amber-200',
                      },
                      {
                        type: 'BLOCKED_BY',
                        title: 'Bị chặn bởi',
                        desc: 'Thẻ này cần chờ thẻ đích xong',
                        icon: AlertCircle,
                        color: 'text-rose-600 bg-rose-50 border-rose-200',
                      },
                      {
                        type: 'PARENT',
                        title: 'Là thẻ cha của',
                        desc: 'Thẻ đích sẽ là thẻ con (Subtask)',
                        icon: FolderTree,
                        color: 'text-purple-600 bg-purple-50 border-purple-200',
                      },
                      {
                        type: 'SUBTASK',
                        title: 'Là thẻ con của',
                        desc: 'Đặt thẻ này làm con của thẻ đích',
                        icon: ListTodo,
                        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                      },
                      {
                        type: 'DUPLICATE',
                        title: 'Trùng lặp với',
                        desc: 'Đánh dấu trùng nội dung',
                        icon: CopyCheck,
                        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
                      },
                    ].map((opt) => {
                      const isSelected = relationTypeToCreate === opt.type;
                      const Icon = opt.icon;

                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            setRelationTypeToCreate(opt.type as any);
                            setRelationError(null);
                          }}
                          className={`p-2.5 rounded-md border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#f28d8d] bg-[#ffc0cb]/20 ring-1 ring-[#f28d8d]'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${opt.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900">{opt.title}</div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Candidate Cards Search & Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Chọn thẻ để liên kết
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={candidateSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCandidateSearchQuery(val);
                        const targetId = activeCardId || cardId;
                        if (targetId) searchCandidateCards(targetId, val);
                      }}
                      placeholder="Tìm kiếm thẻ theo tên..."
                      className="w-full text-xs text-slate-900 bg-white border border-slate-300 focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 rounded-md pl-9 pr-3 py-2 focus:outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Candidate List */}
                  <div className="border border-slate-200 rounded-md overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {isLoadingCandidates ? (
                      <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                        <span>Đang tìm kiếm thẻ...</span>
                      </div>
                    ) : candidateCards.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Không tìm thấy thẻ nào phù hợp trong bảng/workspace.
                      </div>
                    ) : (
                      candidateCards.map((c) => {
                        const isSelected = selectedCandidateCardId === c.id;

                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCandidateCardId(c.id);
                              setRelationError(null);
                            }}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#ffc0cb]/15 border-l-4 border-[#f28d8d]'
                                : 'hover:bg-slate-50 bg-white'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 truncate">{c.title}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                {(c.list?.title || c.list?.name) && (
                                  <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                                    {c.list?.title || c.list?.name}
                                  </span>
                                )}
                                {c.list?.board?.name && (
                                  <span>• {c.list.board.name}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {c.status && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600">
                                  {c.status}
                                </span>
                              )}
                              <div
                                className={`w-4 h-4 rounded-xs border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-[#f28d8d] bg-[#f28d8d] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {relationError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{relationError}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRelationsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateRelation}
                  disabled={!selectedCandidateCardId || isCreatingRelation}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#f28d8d] hover:bg-[#e57a7a] disabled:opacity-40 rounded-md shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingRelation ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang tạo liên kết...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Tạo liên kết</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Blocked Warning Popup Modal */}
        {blockedPopup.isOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setBlockedPopup({ isOpen: false, blockers: [] })}
          >
            <div
              className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                  <Ban className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-red-950">Không thể hoàn thành thẻ</h3>
                    <button
                      type="button"
                      onClick={() => setBlockedPopup({ isOpen: false, blockers: [] })}
                      className="p-1 rounded-md hover:bg-red-100 text-red-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-red-800 mt-1 leading-relaxed">
                    Thẻ này đang bị chặn bởi <strong className="font-semibold">{blockedPopup.blockers.length} thẻ</strong> chưa hoàn thành. Bạn cần hoàn thành hoặc gỡ liên kết các thẻ chặn trước khi hoàn tất thẻ này:
                  </p>
                </div>
              </div>

              {/* List of blocker cards */}
              <div className="p-3 max-h-64 overflow-y-auto space-y-2 bg-slate-50">
                {blockedPopup.blockers.map((b) => {
                  const relCard = b.related_card;
                  if (!relCard) return null;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setBlockedPopup({ isOpen: false, blockers: [] });
                        handleNavigateToRelatedCard(relCard.id);
                      }}
                      className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md transition-all cursor-pointer group flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors truncate">
                          {relCard.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          {(relCard.list?.title || relCard.list?.name) && (
                            <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 border border-slate-200 font-medium text-slate-600">
                              {relCard.list?.title || relCard.list?.name}
                            </span>
                          )}
                          {relCard.list?.board?.name && (
                            <span>• {relCard.list.board.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Xem thẻ</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setBlockedPopup({ isOpen: false, blockers: [] })}
                  className="w-full sm:w-auto px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Fields Manager Modal */}
        {isCustomFieldsModalOpen && (
          <CustomFieldsModal
            boardId={card?.list?.board_id || boardId || ''}
            isOpen={isCustomFieldsModalOpen}
            onClose={() => setIsCustomFieldsModalOpen(false)}
            onFieldsChange={() => {
              const bId = card?.list?.board_id || boardId;
              if (bId) fetchBoardCustomFields(bId);
              const currentId = activeCardId || cardId;
              if (currentId) fetchCardDetails(currentId, true);
              onCardUpdated();
            }}
          />
        )}

        {/* Dropdown Options Quick Manager Modal */}
        {managingDropdownField && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <ListFilter className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Tùy chọn: {managingDropdownField.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Chỉnh sửa các lựa chọn trong menu dropdown của trường này
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManagingDropdownField(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chips list */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Các lựa chọn hiện có ({tempDropdownOptionsList.length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] max-h-[160px] overflow-y-auto">
                  {tempDropdownOptionsList.map((opt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <span>{opt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTempOption(idx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Xóa lựa chọn này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {tempDropdownOptionsList.length === 0 && (
                    <span className="text-xs text-rose-500 italic p-1">
                      Chưa có tùy chọn nào. Hãy thêm ít nhất 1 lựa chọn bên dưới.
                    </span>
                  )}
                </div>
              </div>

              {/* Add new option input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Thêm lựa chọn mới
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTempOptionInput}
                    onChange={(e) => setNewTempOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTempOption();
                      }
                    }}
                    placeholder="Nhập tên lựa chọn và nhấn Enter..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddTempOption}
                    disabled={!newTempOptionInput.trim()}
                    className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManagingDropdownField(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveDropdownOptions}
                  disabled={isSavingDropdownOptions || tempDropdownOptionsList.length === 0}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSavingDropdownOptions ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
