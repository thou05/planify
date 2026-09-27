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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/25 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-strong border border-white/80 rounded-3xl p-6 sm:p-8 relative shadow-2xl overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20 shrink-0">
            <Sparkles className="w-6 h-6 text-[#a6d1fd]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Tạo Bảng từ Mẫu</h2>
            <p className="text-xs text-[#2b1572]/70 truncate max-w-xs">{template.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Workspace */}
          <div>
            <label className="block text-xs font-bold text-[#2b1572] mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2b1572]/70" />
              <span>Không gian làm việc (Workspace) <span className="text-[#c40000]">*</span></span>
            </label>
            {isLoadingWorkspaces ? (
              <div className="py-2 flex items-center gap-2 text-xs text-[#2b1572]/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải danh sách Workspace...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="p-3 text-xs text-[#c40000] bg-[#c40000]/10 rounded-xl">
                Bạn chưa có Không gian làm việc nào. Vui lòng tạo Workspace trước.
              </div>
            ) : (
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs glass-input font-semibold text-[#2b1572] cursor-pointer"
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
            <label className="block text-xs font-bold text-[#2b1572] mb-1.5 flex items-center gap-1.5">
              <Kanban className="w-3.5 h-3.5 text-[#2b1572]/70" />
              <span>Tên Bảng mới <span className="text-[#c40000]">*</span></span>
            </label>
            <input
              type="text"
              required
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Nhập tên Bảng của bạn..."
              className="w-full px-3.5 py-2.5 text-xs glass-input font-bold text-[#2b1572]"
            />
          </div>

          {/* Visibility Selection */}
          <div>
            <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
              Quyền hiển thị Bảng
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('WORKSPACE')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  visibility === 'WORKSPACE'
                    ? 'bg-white/80 border-[#2b1572] shadow-sm'
                    : 'bg-white/40 border-white/60 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold text-[#2b1572]">
                  <Users className="w-3.5 h-3.5" />
                  <span>Không gian</span>
                </div>
                <div className="text-[10px] text-[#2b1572]/60 mt-0.5">Mọi thành viên</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  visibility === 'PRIVATE'
                    ? 'bg-white/80 border-[#2b1572] shadow-sm'
                    : 'bg-white/40 border-white/60 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold text-[#2b1572]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Riêng tư</span>
                </div>
                <div className="text-[10px] text-[#2b1572]/60 mt-0.5">Chỉ thành viên</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  visibility === 'PUBLIC'
                    ? 'bg-white/80 border-[#2b1572] shadow-sm'
                    : 'bg-white/40 border-white/60 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold text-[#2b1572]">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Công khai</span>
                </div>
                <div className="text-[10px] text-[#2b1572]/60 mt-0.5">Có liên kết</div>
              </button>
            </div>
          </div>

          {/* Keep Cards Option */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/40 border border-white/60 cursor-pointer hover:bg-white/60 transition-colors">
              <input
                type="checkbox"
                checked={keepCards}
                onChange={(e) => setKeepCards(e.target.checked)}
                className="mt-0.5 rounded text-[#2b1572] focus:ring-[#2b1572] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-[#2b1572] block">
                  Giữ lại các Thẻ công việc & Checklist mẫu
                </span>
                <span className="text-[11px] text-[#2b1572]/70 leading-tight block mt-0.5">
                  Bao gồm các thẻ hướng dẫn, thẻ mẫu quy trình và các mục checklist ban đầu.
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2b1572]/70 hover:bg-white/50 cursor-pointer transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || workspaces.length === 0}
              className="px-6 py-2.5 btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo Board...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
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
