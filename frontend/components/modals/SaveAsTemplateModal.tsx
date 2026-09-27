'use client';

import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/25 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-strong border border-white/80 rounded-3xl p-6 sm:p-8 relative shadow-2xl overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Lưu thành Template</h2>
            <p className="text-xs text-[#2b1572]/70">Tạo mẫu tái sử dụng từ Bảng hiện tại</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-semibold">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#2b1572]">Đã lưu mẫu thành công!</h3>
            <p className="text-xs text-[#2b1572]/70">
              Mẫu đã được bổ sung vào Thư viện Mẫu để bạn và nhóm có thể sử dụng lại bất cứ lúc nào.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                Tên Mẫu Template <span className="text-[#c40000]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Quy trình Sprint Chuẩn..."
                className="w-full px-3.5 py-2.5 text-xs glass-input font-bold text-[#2b1572]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                Danh mục phân loại
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs glass-input font-semibold text-[#2b1572] cursor-pointer"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                Mô tả & Hướng dẫn sử dụng mẫu
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục đích và quy trình luân chuyển công việc trong mẫu này..."
                className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572] placeholder:text-[#2b1572]/30 resize-none"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#2b1572] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded text-[#2b1572] focus:ring-[#2b1572]"
                />
                <span>Công khai mẫu này trong Thư viện chung cho mọi người cùng dùng</span>
              </label>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2b1572]/70 hover:bg-white/50 cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
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
