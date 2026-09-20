'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

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
    } else {
      setCard(null);
    }
  }, [isOpen, cardId]);

  if (!isOpen || !cardId) return null;

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
