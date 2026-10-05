'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Sparkles,
  Layers,
  Kanban,
  Check,
  CheckSquare,
  Globe,
  Lock,
  Users,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface UseTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
}

export default function UseTemplateModal({
  isOpen,
  onClose,
  template,
}: UseTemplateModalProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [boardName, setBoardName] = useState('');
  const [visibility, setVisibility] = useState<'WORKSPACE' | 'PRIVATE' | 'PUBLIC'>('WORKSPACE');
  const [keepCards, setKeepCards] = useState(true);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && template) {
      setBoardName(template.title || 'Bảng công việc');
      setError('');
      setIsSubmitting(false);

      const fetchWorkspaces = async () => {
        setIsLoadingWorkspaces(true);
        try {
          const res = await apiClient<any[]>('/workspaces');
          if (res.success && res.data && res.data.length > 0) {
            setWorkspaces(res.data);
            setSelectedWorkspaceId(res.data[0].id);
          }
        } catch {
          // ignore
        } finally {
          setIsLoadingWorkspaces(false);
        }
      };

      fetchWorkspaces();
    }
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId) {
      setError('Vui lòng chọn Không gian làm việc để tạo Bảng');
      return;
    }
    if (!boardName.trim()) {
      setError('Tên Bảng không được để trống');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiClient<any>(`/templates/${template.id}/use`, {
        method: 'POST',
        data: {
          workspaceId: selectedWorkspaceId,
          boardName: boardName.trim(),
          visibility,
          keepCards,
        },
      });

      if (res.success && res.data?.boardId) {
        onClose();
        router.push(`/boards/${res.data.boardId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo Bảng từ mẫu, vui lòng thử lại');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-300 p-6 sm:p-7 relative overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
            <Sparkles className="w-4 h-4 text-slate-800" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Tạo Bảng từ Mẫu</h2>
            <p className="text-xs text-slate-500 truncate max-w-xs">{template.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Workspace */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Không gian làm việc (Workspace) <span className="text-rose-500">*</span></span>
            </label>
            {isLoadingWorkspaces ? (
              <div className="py-2 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải danh sách Workspace...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                Bạn chưa có Không gian làm việc nào. Vui lòng tạo Workspace trước.
              </div>
            ) : (
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 cursor-pointer"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Board Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Kanban className="w-3.5 h-3.5 text-slate-500" />
              <span>Tên Bảng mới <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Nhập tên Bảng của bạn..."
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Visibility Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Quyền hiển thị Bảng
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('WORKSPACE')}
                className={`p-2.5 rounded-md text-left border transition-all cursor-pointer ${
                  visibility === 'WORKSPACE'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Users className="w-3.5 h-3.5" />
                  <span>Không gian</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${visibility === 'WORKSPACE' ? 'text-slate-300' : 'text-slate-500'}`}>Mọi thành viên</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-2.5 rounded-md text-left border transition-all cursor-pointer ${
                  visibility === 'PRIVATE'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Riêng tư</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${visibility === 'PRIVATE' ? 'text-slate-300' : 'text-slate-500'}`}>Chỉ thành viên</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`p-2.5 rounded-md text-left border transition-all cursor-pointer ${
                  visibility === 'PUBLIC'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Công khai</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${visibility === 'PUBLIC' ? 'text-slate-300' : 'text-slate-500'}`}>Có liên kết</div>
              </button>
            </div>
          </div>

          {/* Keep Cards Option */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={keepCards}
                onChange={(e) => setKeepCards(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">
                  Giữ lại các Thẻ công việc & Checklist mẫu
                </span>
                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                  Bao gồm các thẻ hướng dẫn, thẻ mẫu quy trình và các mục checklist ban đầu.
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || workspaces.length === 0}
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang khởi tạo Board...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tạo Bảng từ Mẫu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
