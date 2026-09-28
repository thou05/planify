'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UseTemplateModal from '@/components/modals/UseTemplateModal';
import { apiClient } from '@/lib/api-client';
import {
  Sparkles,
  Copy,
  Eye,
  Share2,
  Check,
  CheckSquare,
  ArrowLeft,
  Loader2,
  Kanban,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const resolvedParams = use(params);
  const templateId = resolvedParams.templateId;
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUseModalOpen, setIsUseModalOpen] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await apiClient<any>(`/templates/${templateId}`);
        if (res.success && res.data) {
          setTemplate(res.data);
        } else {
          setError('Không tìm thấy thông tin mẫu');
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải thông tin mẫu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'productivity':
        return 'Hiệu suất';
      case 'project-management':
        return 'Quản lý dự án';
      case 'engineering':
        return 'Kỹ thuật';
      case 'design':
        return 'Thiết kế';
      case 'marketing':
        return 'Marketing';
      case 'hr-operations':
        return 'Nhân sự & Điều hành';
      case 'personal':
        return 'Cá nhân';
      case 'remote-work':
        return 'Làm việc từ xa';
      case 'sales':
        return 'Kinh doanh';
      case 'support':
        return 'Hỗ trợ';
      case 'team-management':
        return 'Quản lý nhóm';
      default:
        return cat || 'Mẫu';
    }
  };

  const lists: any[] = template?.structure?.lists || [];

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2b1572]/70">
          <Link href="/templates" className="hover:text-[#2b1572] hover:underline">
            Thư viện mẫu
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href={`/templates?category=${template?.category || 'all'}`}
            className="hover:text-[#2b1572] hover:underline"
          >
            {getCategoryLabel(template?.category)}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#2b1572] font-bold truncate max-w-xs">{template?.title}</span>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#2b1572]/60">
            <Loader2 className="w-8 h-8 animate-spin text-[#2b1572]" />
            <span className="text-xs font-semibold">Đang tải chi tiết mẫu...</span>
          </div>
        ) : error ? (
          <div className="glass-surface p-8 text-center rounded-3xl space-y-3">
            <h2 className="text-lg font-bold text-[#c40000]">{error}</h2>
            <Link href="/templates" className="inline-flex px-4 py-2 btn-primary text-xs font-bold">
              Quay lại Thư viện Mẫu
            </Link>
          </div>
        ) : template ? (
          <div className="space-y-6">
            {/* Top Action Header Bar (like Trello template hero) */}
            <div className="glass-surface p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0"
                  style={{
                    background: template.background || 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
                  }}
                >
                  <Kanban className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#2b1572] tracking-tight">
                    {template.title}
                  </h1>
                  <p className="text-xs text-[#2b1572]/70 mt-1 font-medium">
                    Được tạo bởi <strong className="text-[#2b1572]">{template.author_name || 'Planify Team'}</strong>
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[#2b1572]/60 mt-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{template.usage_count || 0} bản sao</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{template.view_count || 0} lượt xem</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-white/70 bg-white/50 hover:bg-white/80 text-xs font-bold text-[#2b1572] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsUseModalOpen(true)}
                  className="flex-1 sm:flex-initial px-6 py-2.5 btn-primary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sử dụng mẫu</span>
                </button>
              </div>
            </div>

            {/* About Template Section */}
            <div className="glass-surface p-6 sm:p-8 rounded-3xl space-y-3">
              <h2 className="text-base font-extrabold text-[#2b1572]">Về mẫu này</h2>
              <p className="text-xs sm:text-sm text-[#2b1572]/80 leading-relaxed whitespace-pre-line">
                {template.description ||
                  'Mẫu quy trình làm việc được cấu trúc sẵn các cột và thẻ hướng dẫn nhằm giúp bạn và nhóm bắt đầu ngay mà không cần cấu hình thủ công.'}
              </p>
            </div>

            {/* Live Interactive Preview Container (Matches User Screenshot) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#2b1572]/80 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Xem trước giao diện Bảng (Live Board Preview)</span>
                </h2>
                <span className="text-xs text-[#2b1572]/60 font-medium">
                  {lists.length} cột • {lists.reduce((acc, l) => acc + (l.cards?.length || 0), 0)} thẻ mẫu
                </span>
              </div>

              {/* Kanban Preview Frame */}
              <div
                className="rounded-3xl p-5 sm:p-6 shadow-2xl overflow-x-auto min-h-[460px] border border-white/60"
                style={{
                  background: template.background || 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
                }}
              >
                {/* Header in Preview */}
                <div className="flex items-center justify-between mb-5 text-white">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-black tracking-tight">{template.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold border border-white/20">
                      Mẫu
                    </span>
                  </div>
                </div>

                {/* Lists Horizontal Track */}
                <div className="flex items-start gap-4 pb-4">
                  {lists.map((l: any, lIdx: number) => (
                    <div
                      key={lIdx}
                      className="w-72 sm:w-80 shrink-0 rounded-2xl glass-strong border border-white/70 p-3.5 space-y-3 shadow-lg"
                    >
                      {/* List Header */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black text-[#2b1572] truncate">{l.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#2b1572]/10 text-[#2b1572] font-black text-[10px]">
                          {l.cards?.length || 0}
                        </span>
                      </div>

                      {/* Cards Track */}
                      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                        {l.cards && l.cards.length > 0 ? (
                          l.cards.map((c: any, cIdx: number) => (
                            <div
                              key={cIdx}
                              className="p-3.5 rounded-xl bg-white/80 hover:bg-white border border-white shadow-xs hover:shadow-md transition-all space-y-2 cursor-default group"
                            >
                              <h4 className="text-xs font-bold text-[#2b1572] leading-snug">
                                {c.title}
                              </h4>
                              {c.description && (
                                <p className="text-[11px] text-[#2b1572]/70 line-clamp-2 leading-relaxed">
                                  {c.description}
                                </p>
                              )}

                              {/* Checklist badge preview if present */}
                              {c.checklists && c.checklists.length > 0 && (
                                <div className="pt-1 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2b1572]/10 text-[#2b1572]">
                                    <CheckSquare className="w-3 h-3" />
                                    <span>
                                      {c.checklists.reduce(
                                        (sum: number, ck: any) =>
                                          sum + (ck.items?.filter((it: any) => it.is_completed)?.length || 0),
                                        0,
                                      )}
                                      /
                                      {c.checklists.reduce(
                                        (sum: number, ck: any) => sum + (ck.items?.length || 0),
                                        0,
                                      )}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-xs text-[#2b1572]/40 border border-dashed border-white/50 rounded-xl">
                            Cột trống
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Use Template Modal */}
      {template && (
        <UseTemplateModal
          isOpen={isUseModalOpen}
          onClose={() => setIsUseModalOpen(false)}
          template={template}
        />
      )}
    </>
  );
}
