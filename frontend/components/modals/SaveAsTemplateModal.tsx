'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  LayoutTemplate,
  Loader2,
  Check,
  Globe,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: any;
  onSuccess?: () => void;
}

const TEMPLATE_CATEGORIES = [
  { id: 'productivity', label: 'Hiệu suất (Productivity)' },
  { id: 'project-management', label: 'Quản lý dự án (Project Management)' },
  { id: 'engineering', label: 'Kỹ thuật & CNTT (Engineering)' },
  { id: 'design', label: 'Thiết kế (Design)' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'hr-operations', label: 'Nhân sự & Điều hành (HR)' },
  { id: 'personal', label: 'Cá nhân (Personal)' },
  { id: 'remote-work', label: 'Làm việc từ xa (Remote Work)' },
  { id: 'sales', label: 'Kinh doanh & Bán hàng (Sales)' },
  { id: 'support', label: 'Hỗ trợ khách hàng (Support)' },
  { id: 'team-management', label: 'Quản lý nhóm (Team Management)' },
];

export default function SaveAsTemplateModal({
  isOpen,
  onClose,
  board,
  onSuccess,
}: SaveAsTemplateModalProps) {
  const [title, setTitle] = useState(board?.name ? `Mẫu: ${board.name}` : '');
  const [description, setDescription] = useState(board?.description || '');
  const [category, setCategory] = useState('productivity');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Synchronize modal fields when board loads or modal opens
  useEffect(() => {
    if (isOpen && board?.name) {
      setTitle(`Mẫu: ${board.name}`);
      setDescription(board.description || '');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, board?.name, board?.description]);

  if (!isOpen || !board) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Tên mẫu không được để trống');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await apiClient(`/templates/from-board/${board.id}`, {
        method: 'POST',
        data: {
          title: title.trim(),
          description: description.trim(),
          category,
          is_public: isPublic,
        },
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          onSuccess?.();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể lưu Board thành Template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-6 relative overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-[#f28d8d] flex items-center justify-center text-white shadow-2xs">
            <LayoutTemplate className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Lưu thành Template</h2>
            <p className="text-xs text-slate-500">Tạo mẫu tái sử dụng từ Bảng hiện tại</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2 animate-fade-in">
            <div className="w-10 h-10 mx-auto rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Đã lưu mẫu thành công!</h3>
            <p className="text-xs text-slate-500">
              Mẫu đã được bổ sung vào Thư viện Mẫu để bạn và nhóm có thể sử dụng lại bất cứ lúc nào.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Tên Mẫu Template <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Quy trình Sprint Chuẩn..."
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Danh mục phân loại
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 cursor-pointer"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Mô tả & Hướng dẫn sử dụng mẫu
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục đích và quy trình luân chuyển công việc trong mẫu này..."
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 resize-none transition-all"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] accent-[#f28d8d] cursor-pointer"
                />
                <span>Công khai mẫu này trong Thư viện chung cho mọi người cùng dùng</span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Lưu thành Mẫu</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
