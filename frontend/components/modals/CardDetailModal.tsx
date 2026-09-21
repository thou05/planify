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
  const [isCompleted, setIsCompleted] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

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

  const fetchCardDetails = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient<any>(`/cards/${id}`);
      if (res.success && res.data) {
        const c = res.data;
        setCard(c);
        setTitle(c.title || '');
        setDescription(c.description || '');
        setDueDate(c.due_date ? new Date(c.due_date).toISOString().slice(0, 16) : '');
        setStartDate(c.start_date ? new Date(c.start_date).toISOString().slice(0, 16) : '');
        setIsCompleted(!!c.is_due_date_completed);
        setChecklists(c.checklists || []);
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
      setActiveNewItemChecklistId(null);
      setEditingChecklistId(null);
      setEditingItemId(null);
    } else {
      setCard(null);
      setChecklists([]);
    }
  }, [isOpen, cardId]);

  useEffect(() => {
    if (activeNewItemChecklistId) {
      setTimeout(() => newItemInputRef.current?.focus(), 50);
    }
  }, [activeNewItemChecklistId]);

  if (!isOpen || !cardId) return null;

  // --- CARD SAVE ---
  const handleSaveAll = async () => {
    if (!title.trim() || isSaving) return;
    try {
      setIsSaving(true);
      await apiClient(`/cards/${cardId}`, {
        method: 'PATCH',
        data: {
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          start_date: startDate ? new Date(startDate).toISOString() : null,
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
    // Optimistic
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
    // Optimistic
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
    // Optimistic
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
      // Revert if error
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
      <div className="bg-white rounded-2xl shadow-2xl border border-[#2b1572]/15 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
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
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Due Date quick status indicator */}
            {card?.due_date && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleCompleted}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300 hover:border-[#2b1572]'
                    }`}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <div className="text-xs font-semibold text-[#2b1572]">
                      Hạn chót:{' '}
                      <span className="font-normal text-slate-600">
                        {new Date(card.due_date).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {isCompleted ? '✓ Đã hoàn thành' : 'Đang thực hiện'}
                    </div>
                  </div>
                </div>
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

            {/* Dates Configuration */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2b1572] uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-[#2b1572]/70" />
                <span>Thời hạn thực hiện</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                    }}
                    onBlur={handleSaveAll}
                    className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#2b1572]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ngày hết hạn (Due Date)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                    }}
                    onBlur={handleSaveAll}
                    className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#2b1572]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions (1 col) */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Thêm vào thẻ
            </div>

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
      </div>
    </div>
  );
}
