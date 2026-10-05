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
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/templates" className="hover:text-slate-900 hover:underline">
            Thư viện mẫu
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            href={`/templates?category=${template?.category || 'all'}`}
            className="hover:text-slate-900 hover:underline"
          >
            {getCategoryLabel(template?.category)}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold truncate max-w-xs">{template?.title}</span>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
            <span className="text-xs font-medium">Đang tải chi tiết mẫu...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center rounded-lg bg-white border border-slate-200 space-y-3 shadow-2xs">
            <h2 className="text-base font-bold text-rose-600">{error}</h2>
            <Link href="/templates" className="inline-flex px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
              Quay lại Thư viện Mẫu
            </Link>
          </div>
        ) : template ? (
          <div className="space-y-6">
            {/* Top Action Header Bar */}
            <div className="p-6 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xs">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-md flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-2xs"
                  style={{
                    background: template.background || '#0f172a',
                  }}
                >
                  <Kanban className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {template.title}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Được tạo bởi <strong className="text-slate-800 font-semibold">{template.author_name || 'Planify Team'}</strong>
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{template.usage_count || 0} bản sao</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>{template.view_count || 0} lượt xem</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsUseModalOpen(true)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sử dụng mẫu</span>
                </button>
              </div>
            </div>

            {/* About Template Section */}
            <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-2 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900">Về mẫu này</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {template.description ||
                  'Mẫu quy trình làm việc được cấu trúc sẵn các cột và thẻ hướng dẫn nhằm giúp bạn và nhóm bắt đầu ngay mà không cần cấu hình thủ công.'}
              </p>
            </div>

            {/* Live Interactive Preview Container */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Xem trước giao diện Bảng (Live Preview)</span>
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {lists.length} cột • {lists.reduce((acc, l) => acc + (l.cards?.length || 0), 0)} thẻ mẫu
                </span>
              </div>

              {/* Kanban Preview Frame */}
              <div
                className="rounded-lg p-5 shadow-2xs overflow-x-auto min-h-[460px] border border-slate-300 bg-dot-pattern"
                style={
                  template.background
                    ? { background: template.background }
                    : undefined
                }
              >
                {/* Header in Preview */}
                <div className="flex items-center justify-between mb-4 text-white">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight">{template.title}</h3>
                    <span className="px-2 py-0.5 rounded-xs bg-white/20 text-[10px] font-semibold border border-white/20">
                      Mẫu
                    </span>
                  </div>
                </div>

                {/* Lists Horizontal Track */}
                <div className="flex items-start gap-3.5 pb-4">
                  {lists.map((l: any, lIdx: number) => (
                    <div
                      key={lIdx}
                      className="w-72 sm:w-80 shrink-0 rounded-md bg-slate-100/95 border border-slate-300/80 p-3 space-y-2.5 shadow-sm"
                    >
                      {/* List Header */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-800 truncate">{l.title}</span>
                        <span className="px-1.5 py-0.5 rounded-xs bg-slate-200 text-slate-700 font-bold text-[10px]">
                          {l.cards?.length || 0}
                        </span>
                      </div>

                      {/* Cards Track */}
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {l.cards && l.cards.length > 0 ? (
                          l.cards.map((c: any, cIdx: number) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1.5 cursor-default"
                            >
                              <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                                {c.title}
                              </h4>
                              {c.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {c.description}
                                </p>
                              )}

                              {/* Checklist badge preview if present */}
                              {c.checklists && c.checklists.length > 0 && (
                                <div className="pt-1 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-200">
                                    <CheckSquare className="w-3 h-3 text-slate-500" />
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
                          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-md">
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
