'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  X,
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
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_completed: boolean;
  position: number;
}

interface Checklist {
  id: string;
  card_id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
}

interface CardDetailModalProps {
  cardId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated: () => void;
  onMoveRequest: (card: any) => void;
  onCopyRequest: (card: any) => void;
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

export default function CardDetailModal({
  cardId,
  isOpen,
  onClose,
  onCardUpdated,
  onMoveRequest,
  onCopyRequest,
}: CardDetailModalProps) {
  const [card, setCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Labels state
  const [cardLabels, setCardLabels] = useState<any[]>([]);
  const [boardLabels, setBoardLabels] = useState<any[]>([]);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [editingLabel, setEditingLabel] = useState<any | null>(null);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [formLabelName, setFormLabelName] = useState('');
  const [formLabelColor, setFormLabelColor] = useState('#3b82f6');

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

  const newItemInputRef = useRef<HTMLInputElement>(null);

  const fetchBoardMembers = async (boardId: string) => {
    try {
      const res = await apiClient<any[]>(`/boards/${boardId}/members`);
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

  const fetchCardDetails = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient<any>(`/cards/${id}`);
      if (res.success && res.data) {
        const c = res.data;
        setCard(c);
        setTitle(c.title || '');
        setDescription(c.description || '');
        const sDate = toLocalDatetimeString(c.start_date);
        const dDate = toLocalDatetimeString(c.due_date);
        setStartDate(sDate);
        setDueDate(dDate);
        setReminderAt(c.reminder_at || null);
        setIsCompleted(!!c.is_due_date_completed);
        setAssignees(c.card_assignees || []);
        setCardLabels(c.card_labels || []);

        if (c.due_date && c.reminder_at) {
          const diffMins = Math.round(
            (new Date(c.due_date).getTime() - new Date(c.reminder_at).getTime()) / 60000,
          );
          setReminderMinutes(diffMins >= 0 ? diffMins : -1);
        } else {
          setReminderMinutes(-1);
        }

        setChecklists(c.checklists || []);

        const boardId = c.list?.board_id;
        if (boardId) {
          fetchBoardMembers(boardId);
          fetchBoardLabels(boardId);
        }
      }
    } catch {
      // Failed to load card
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cardId) {
      fetchCardDetails(cardId);
      setIsAddingChecklist(false);
      setIsDatesModalOpen(false);
      setIsMembersModalOpen(false);
      setIsLabelsModalOpen(false);
      setMemberSearchQuery('');
      setLabelSearchQuery('');
      setEditingLabel(null);
      setIsCreatingLabel(false);
      setActiveNewItemChecklistId(null);
      setEditingChecklistId(null);
      setEditingItemId(null);
    } else {
      setCard(null);
      setChecklists([]);
      setAssignees([]);
      setBoardMembers([]);
      setCardLabels([]);
      setBoardLabels([]);
    }
  }, [isOpen, cardId]);

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
  const handleToggleAssignee = async (boardMemberId: string) => {
    const isAssigned = assignees.some(
      (a) => a.board_member_id === boardMemberId || a.board_member?.id === boardMemberId,
    );

    // Optimistic
    if (isAssigned) {
      setAssignees((prev) =>
        prev.filter(
          (a) => a.board_member_id !== boardMemberId && a.board_member?.id !== boardMemberId,
        ),
      );
    } else {
      const memberObj = boardMembers.find((m) => m.id === boardMemberId);
      if (memberObj) {
        setAssignees((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            board_member_id: boardMemberId,
            board_member: memberObj,
          },
        ]);
      }
    }

    try {
      const res = await apiClient<any>(`/cards/${cardId}/assignees/toggle`, {
        method: 'POST',
        data: { board_member_id: boardMemberId },
      });
      if (res.success && res.data) {
        if (res.data.assigned && res.data.assignee) {
          setAssignees((prev) =>
            prev.map((a) =>
              a.board_member_id === boardMemberId || a.board_member?.id === boardMemberId
                ? res.data.assignee
                : a,
            ),
          );
        }
        onCardUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể thay đổi thành viên gán');
      fetchCardDetails(cardId!);
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
      fetchCardDetails(cardId!);
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
    if (!confirm('Bạn có chắc chắn muốn xóa nhãn này khỏi toàn bộ bảng?')) return;
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

  if (!isOpen || !cardId) return null;

  // --- CARD SAVE ---
  const handleSaveAll = async () => {
    if (!title?.trim() || isSaving) return;
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
    setIsCompleted(nextVal);
    try {
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: { is_due_date_completed: nextVal },
      });
      onCardUpdated();
    } catch {
      setIsCompleted(!nextVal);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?cardId=${cardId}`;
    navigator.clipboard.writeText(url);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa thẻ này?')) return;
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
      dotBg: 'bg-[#2b1572]',
      icon: Calendar,
    };
  };

  const deadlineStatus = getDeadlineStatus();
  const reminderLabel =
    reminderMinutes >= 0
      ? REMINDER_OPTIONS.find((r) => r.value === reminderMinutes)?.label || 'Có lời nhắc'
      : null;

  // Filter board members for popover
  const filteredBoardMembers = boardMembers.filter((m) => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = m.user?.name?.toLowerCase() || '';
    const email = m.user?.email?.toLowerCase() || '';
    return name.includes(q) || email.includes(q);
  });

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
    if (!confirm('Bạn có chắc muốn xóa danh sách việc cần làm này?')) return;
    setChecklists((prev) => prev.filter((cl) => cl.id !== checklistId));
    try {
      await apiClient(`/checklists/${checklistId}`, { method: 'DELETE' });
      onCardUpdated();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa checklist');
      fetchCardDetails(cardId);
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
      fetchCardDetails(cardId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/15 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-5 pb-3 border-b border-[#2b1572]/10 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-[#2b1572]/60 mb-1">
              <span>Trong danh sách</span>
              <span className="font-bold text-[#2b1572] underline">
                {card?.list?.title || 'Đang tải...'}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveAll}
              className="w-full text-base sm:text-lg font-bold text-[#2b1572] bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-[#2b1572]/30 rounded-lg px-2 py-1 -ml-2 focus:outline-none transition-all"
              placeholder="Tiêu đề thẻ..."
            />
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#2b1572]/40 hover:text-[#2b1572] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading && !card ? (
          <div className="flex-1 p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#2b1572]/20 border-t-[#2b1572] rounded-full animate-spin" />
            <span className="text-xs text-[#2b1572]/60 font-medium">Đang tải thông tin thẻ...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Content (2 cols) */}
            <div className="md:col-span-2 space-y-6">
              {/* Top Badges (Members & Labels) */}
              {(assignees.length > 0 || cardLabels.length > 0) && (
                <div className="flex flex-wrap items-start gap-6 pb-1">
                  {/* Assigned Members Section */}
                  {assignees.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#2b1572]/70 uppercase tracking-wider">
                        Thành viên
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignees.map((a) => {
                          const member = a.board_member;
                          const uName = member?.user?.name || 'Thành viên';
                          const uAvatar = member?.user?.avatar;
                          const firstLetter = uName.charAt(0).toUpperCase();

                          return (
                            <div
                              key={a.id || member?.id}
                              onClick={() => {
                                setIsMembersModalOpen(true);
                                setMemberSearchQuery('');
                              }}
                              className="group flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-slate-100 hover:bg-[#2b1572]/10 rounded-full border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                              title={`${uName} (${member?.role || 'MEMBER'}) - Bấm để thay đổi`}
                            >
                              {uAvatar ? (
                                <img
                                  src={uAvatar}
                                  alt={uName}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-[#2b1572] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                                  {firstLetter}
                                </div>
                              )}
                              <span className="text-xs font-semibold text-[#2b1572]">{uName}</span>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setIsMembersModalOpen(true);
                            setMemberSearchQuery('');
                          }}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-[#2b1572] flex items-center justify-center transition-colors cursor-pointer"
                          title="Thêm thành viên"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card Labels Section */}
                  {cardLabels.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#2b1572]/70 uppercase tracking-wider">
                        Nhãn
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cardLabels.map((cl) => (
                          <button
                            key={cl.id || cl.label?.id}
                            type="button"
                            onClick={() => {
                              setIsLabelsModalOpen(true);
                              setIsCreatingLabel(false);
                              setEditingLabel(null);
                              setLabelSearchQuery('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-2xs hover:opacity-90 transition-all cursor-pointer"
                            style={{ backgroundColor: cl.label?.color || '#3b82f6' }}
                            title={`${cl.label?.name} - Bấm để thay đổi`}
                          >
                            {cl.label?.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setIsLabelsModalOpen(true);
                            setIsCreatingLabel(false);
                            setEditingLabel(null);
                            setLabelSearchQuery('');
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#2b1572] flex items-center justify-center transition-colors cursor-pointer"
                          title="Thêm nhãn"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Due Date quick status banner */}
              {dueDate && deadlineStatus && (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all ${
                    isCompleted
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
                      onClick={handleToggleCompleted}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 hover:border-[#2b1572] bg-white'
                      }`}
                      title={isCompleted ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#2b1572]">
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
                        <div className="flex items-center gap-1.5 text-[11px] text-[#2b1572]/70 font-medium">
                          <Bell className="w-3 h-3 text-[#2b1572]/60" />
                          <span>{reminderLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenDatesModal}
                    className="self-end sm:self-center px-2.5 py-1 text-xs font-semibold text-[#2b1572] hover:bg-[#2b1572]/10 bg-white/70 border border-[#2b1572]/20 rounded-lg transition-colors cursor-pointer"
                  >
                    Sửa ngày
                  </button>
                </div>
              )}

              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2b1572] uppercase tracking-wider">
                  <AlignLeft className="w-4 h-4 text-[#2b1572]/70" />
                  <span>Mô tả chi tiết</span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSaveAll}
                  placeholder="Thêm mô tả chi tiết hơn về công việc này..."
                  className="w-full text-xs text-[#2b1572] bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#2b1572]/40 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#2b1572]/15 transition-all resize-y"
                />
              </div>

              {/* Checklists Section */}
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
                          className="p-1 -ml-1 text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                          title={isCollapsed ? 'Mở rộng checklist' : 'Thu gọn checklist'}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isCollapsed ? '-rotate-90' : 'rotate-0'
                            }`}
                          />
                        </button>

                        <CheckSquare className="w-4 h-4 text-[#2b1572] shrink-0" />
                        {editingChecklistId === cl.id ? (
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
                            className="text-xs font-bold text-[#2b1572] bg-white border border-[#2b1572]/40 rounded-md px-2 py-1 focus:outline-none w-full"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingChecklistId(cl.id);
                              setEditingChecklistTitle(cl.title);
                            }}
                            className="text-xs font-bold text-[#2b1572] uppercase tracking-wider cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 rounded-md transition-colors truncate"
                            title="Bấm để đổi tên checklist"
                          >
                            {cl.title}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteChecklist(cl.id)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
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
                          className={`h-full transition-all duration-300 rounded-full ${
                            isAllDone ? 'bg-emerald-500' : 'bg-[#2b1572]'
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
                            className="group flex items-start justify-between gap-2.5 p-1.5 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleChecklistItem(cl.id, item.id, item.is_completed)
                                }
                                className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                  item.is_completed
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-300 hover:border-[#2b1572] bg-white'
                                }`}
                              >
                                {item.is_completed && <Check className="w-3 h-3" />}
                              </button>

                              {editingItemId === item.id ? (
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
                                  className="text-xs text-[#2b1572] bg-white border border-[#2b1572]/40 rounded-md px-2 py-0.5 focus:outline-none w-full"
                                />
                              ) : (
                                <span
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditingItemContent(item.content);
                                  }}
                                  className={`text-xs leading-relaxed cursor-pointer break-words flex-1 ${
                                    item.is_completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-800 hover:text-[#2b1572]'
                                  }`}
                                >
                                  {item.content}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteChecklistItem(cl.id, item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer shrink-0"
                              title="Xóa mục này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {/* Add Item Form */}
                        {activeNewItemChecklistId === cl.id ? (
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
                              className="w-full text-xs text-[#2b1572] bg-slate-50 border border-[#2b1572]/30 focus:border-[#2b1572] rounded-xl px-3 py-2 focus:outline-none focus:bg-white shadow-2xs"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCreateChecklistItem(cl.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] rounded-lg transition-colors cursor-pointer shadow-2xs"
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
                            className="mt-2 text-xs font-semibold text-[#2b1572] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm một mục</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar Actions (1 col) */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Thêm vào thẻ
              </div>

              {/* Members Button */}
              <button
                onClick={() => {
                  setIsMembersModalOpen(true);
                  setMemberSearchQuery('');
                }}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
                  assignees.length > 0
                    ? 'text-[#2b1572] bg-[#a6d1fd]/30 hover:bg-[#a6d1fd]/50 border border-[#a6d1fd]/60'
                    : 'text-[#2b1572] bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Thành viên {assignees.length > 0 && `(${assignees.length})`}</span>
              </button>

              {/* Labels Button */}
              <button
                onClick={() => {
                  setIsLabelsModalOpen(true);
                  setIsCreatingLabel(false);
                  setEditingLabel(null);
                  setLabelSearchQuery('');
                }}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
                  cardLabels.length > 0
                    ? 'text-[#2b1572] bg-[#a6d1fd]/30 hover:bg-[#a6d1fd]/50 border border-[#a6d1fd]/60'
                    : 'text-[#2b1572] bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Nhãn {cardLabels.length > 0 && `(${cardLabels.length})`}</span>
              </button>

              {/* Add Checklist Action */}
              {isAddingChecklist ? (
                <div className="p-3 bg-slate-50 border border-[#2b1572]/20 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-[#2b1572]">Tiêu đề Checklist</div>
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateChecklist();
                      if (e.key === 'Escape') setIsAddingChecklist(false);
                    }}
                    autoFocus
                    className="w-full text-xs text-[#2b1572] bg-white border border-slate-200 focus:border-[#2b1572] rounded-lg p-2 focus:outline-none shadow-2xs"
                    placeholder="Ví dụ: Việc cần làm..."
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCreateChecklist}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      Thêm
                    </button>
                    <button
                      onClick={() => setIsAddingChecklist(false)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAddingChecklist(true);
                    setNewChecklistTitle('Việc cần làm');
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-[#2b1572] bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#2b1572]/70" />
                  <span>Việc cần làm (Checklist)</span>
                </button>
              )}

              {/* Dates / Deadline Button */}
              <button
                onClick={handleOpenDatesModal}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
                  dueDate
                    ? 'text-[#2b1572] bg-[#a6d1fd]/30 hover:bg-[#a6d1fd]/50 border border-[#a6d1fd]/60'
                    : 'text-[#2b1572] bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>{dueDate ? 'Thời hạn (Đã đặt)' : 'Ngày hạn'}</span>
              </button>

              <div className="h-[1px] bg-slate-200 my-2" />

              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Thao tác với thẻ
              </div>

              <button
                onClick={() => onMoveRequest(card)}
                className="w-full px-3 py-2 text-xs font-semibold text-[#2b1572] bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Di chuyển thẻ...</span>
              </button>

              <button
                onClick={() => onCopyRequest(card)}
                className="w-full px-3 py-2 text-xs font-semibold text-[#2b1572] bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>Sao chép thẻ...</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 text-xs font-semibold text-[#2b1572] bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors cursor-pointer relative"
              >
                <LinkIcon className="w-3.5 h-3.5 text-[#2b1572]/70" />
                <span>{copyLinkSuccess ? 'Đã sao chép link!' : 'Sao chép liên kết'}</span>
              </button>

              <div className="h-[1px] bg-slate-200 my-2" />

              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Xóa thẻ này</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        {/* MEMBERS ASSIGNMENT POPOVER / MODAL */}
        {isMembersModalOpen && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/20 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2b1572]">
                  <Users className="w-4 h-4 text-[#2b1572]" />
                  <span>Thành viên trong bảng ({boardMembers.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
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
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm thành viên..."
                    className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[#2b1572] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Members list */}
              <div className="p-2 overflow-y-auto space-y-1 flex-1">
                {filteredBoardMembers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {boardMembers.length === 0
                      ? 'Chưa có thành viên nào khác trong bảng'
                      : 'Không tìm thấy thành viên phù hợp'}
                  </div>
                ) : (
                  filteredBoardMembers.map((m) => {
                    const uName = m.user?.name || 'Thành viên';
                    const uEmail = m.user?.email || '';
                    const uAvatar = m.user?.avatar;
                    const isAssigned = assignees.some(
                      (a) => a.board_member_id === m.id || a.board_member?.id === m.id,
                    );
                    const roleName =
                      m.role === 'ADMIN'
                        ? 'Quản trị'
                        : m.role === 'VIEWER'
                        ? 'Người xem'
                        : 'Thành viên';

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleToggleAssignee(m.id)}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {uAvatar ? (
                            <img
                              src={uAvatar}
                              alt={uName}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#2b1572] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                              {uName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#2b1572] truncate">
                                {uName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium">
                                {roleName}
                              </span>
                            </div>
                            {uEmail && (
                              <div className="text-[11px] text-slate-400 truncate">{uEmail}</div>
                            )}
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            isAssigned
                              ? 'bg-[#2b1572] text-white'
                              : 'border border-slate-200 group-hover:border-[#2b1572]/40'
                          }`}
                        >
                          {isAssigned && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DATES CONFIGURATION POPOVER / MODAL */}
        {isDatesModalOpen && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/20 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2b1572]">
                  <Calendar className="w-4 h-4 text-[#2b1572]" />
                  <span>Thời hạn thực hiện & Nhắc nhở</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDatesModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                      className="w-4 h-4 accent-[#2b1572] rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">Ngày bắt đầu</span>
                  </label>
                  {tempEnableStart && (
                    <input
                      type="datetime-local"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#2b1572] focus:bg-white transition-all"
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
                      className="w-4 h-4 accent-[#2b1572] rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">Ngày hết hạn (Due date)</span>
                  </label>
                  {tempEnableDue && (
                    <input
                      type="datetime-local"
                      value={tempDueDate}
                      onChange={(e) => setTempDueDate(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#2b1572] focus:bg-white transition-all"
                    />
                  )}
                </div>

                {/* Reminder selector */}
                {tempEnableDue && (
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Bell className="w-3.5 h-3.5 text-[#2b1572]" />
                      <span>Đặt lời nhắc nhở</span>
                    </label>
                    <select
                      value={tempReminderMinutes}
                      onChange={(e) => setTempReminderMinutes(Number(e.target.value))}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#2b1572] focus:bg-white cursor-pointer"
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
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRemoveDates}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Gỡ bỏ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDatesModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDates}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] rounded-lg shadow-xs transition-colors cursor-pointer"
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
          <div className="absolute inset-0 bg-black/30 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/20 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                {isCreatingLabel || editingLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingLabel(false);
                      setEditingLabel(null);
                    }}
                    className="p-1 text-slate-500 hover:text-[#2b1572] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2b1572]">
                    <Tag className="w-4 h-4 text-[#2b1572]" />
                    <span>Nhãn ({boardLabels.length})</span>
                  </div>
                )}

                <div className="text-xs font-bold text-[#2b1572]">
                  {isCreatingLabel ? 'Tạo nhãn mới' : editingLabel ? 'Chỉnh sửa nhãn' : ''}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsLabelsModalOpen(false);
                    setIsCreatingLabel(false);
                    setEditingLabel(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              {isCreatingLabel || editingLabel ? (
                /* Create / Edit Sub-view */
                <div className="p-4 space-y-4 overflow-y-auto">
                  {/* Preview */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Xem trước nhãn</span>
                    <div
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs"
                      style={{ backgroundColor: formLabelColor }}
                    >
                      {formLabelName.trim() || 'Tên nhãn'}
                    </div>
                  </div>

                  {/* Name input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Tên nhãn</label>
                    <input
                      type="text"
                      value={formLabelName}
                      onChange={(e) => setFormLabelName(e.target.value)}
                      placeholder="Ví dụ: Backend, Thiết kế..."
                      autoFocus
                      className="w-full text-xs text-[#2b1572] bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2b1572] shadow-2xs"
                    />
                  </div>

                  {/* Color palette */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Chọn màu sắc</label>
                    <div className="grid grid-cols-5 gap-2">
                      {LABEL_COLOR_PALETTE.map((item) => {
                        const isSelected = formLabelColor === item.color;
                        return (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => setFormLabelColor(item.color)}
                            title={item.name}
                            className={`h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                              isSelected ? 'ring-2 ring-offset-2 ring-[#2b1572] scale-105' : 'hover:scale-105'
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
                      className="w-full py-2 text-xs font-semibold text-white bg-[#2b1572] hover:bg-[#1e0f52] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {editingLabel ? 'Lưu thay đổi' : 'Tạo mới'}
                    </button>

                    {editingLabel && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLabel(editingLabel.id)}
                        className="w-full py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
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
                  <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={labelSearchQuery}
                        onChange={(e) => setLabelSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm nhãn..."
                        className="w-full text-xs text-[#2b1572] bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[#2b1572] focus:bg-white transition-all shadow-2xs"
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
                              className="flex-1 p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                            >
                              <div
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-2xs flex-1 text-left truncate"
                                style={{ backgroundColor: l.color }}
                              >
                                {l.name}
                              </div>

                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                  isAssigned
                                    ? 'bg-[#2b1572] text-white'
                                    : 'border border-slate-200 group-hover:border-[#2b1572]/40'
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
                              className="p-2 text-slate-400 hover:text-[#2b1572] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingLabel(true);
                        setEditingLabel(null);
                        setFormLabelName(labelSearchQuery || '');
                        setFormLabelColor('#3b82f6');
                      }}
                      className="w-full py-2 text-xs font-semibold text-[#2b1572] bg-white hover:bg-slate-100 border border-[#2b1572]/20 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
      </div>
    </div>
  );
}
