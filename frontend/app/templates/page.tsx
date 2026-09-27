'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import UseTemplateModal from '@/components/modals/UseTemplateModal';
import { apiClient } from '@/lib/api-client';
import {
  LayoutTemplate,
  Search,
  Sparkles,
  Eye,
  Copy,
  Layers,
  CheckCircle2,
  Filter,
  ArrowRight,
  Loader2,
  Plus,
  Briefcase,
  PenTool,
  GraduationCap,
  Cpu,
  Megaphone,
  Users2,
  User,
  Zap,
  FolderGit2,
  Home,
  DollarSign,
  Headphones,
  Kanban,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả mẫu', icon: LayoutTemplate },
  { id: 'productivity', label: 'Hiệu suất', icon: Zap },
  { id: 'project-management', label: 'Quản lý dự án', icon: Kanban },
  { id: 'engineering', label: 'Kỹ thuật', icon: Cpu },
  { id: 'design', label: 'Thiết kế', icon: PenTool },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'hr-operations', label: 'Nhân sự & Điều hành', icon: Users2 },
  { id: 'personal', label: 'Cá nhân', icon: User },
  { id: 'remote-work', label: 'Làm việc từ xa', icon: Home },
  { id: 'sales', label: 'Kinh doanh', icon: DollarSign },
  { id: 'support', label: 'Hỗ trợ', icon: Headphones },
  { id: 'team-management', label: 'Quản lý nhóm', icon: Briefcase },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplateForUse, setSelectedTemplateForUse] = useState<any | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient<any[]>(`/templates?${params.toString()}`);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="glass-surface p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute -right-8 -bottom-8 w-80 h-80 rounded-full bg-[#a6d1fd]/30 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-64 h-64 rounded-full bg-[#a000c8]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 text-xs font-semibold text-[#2b1572] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#a000c8]" />
              <span>Thư viện Mẫu Quy trình Planify</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2b1572] tracking-tight">
              Khởi đầu dự án nhanh chóng với các Mẫu chuyên nghiệp
            </h1>
            <p className="text-xs sm:text-sm text-[#2b1572]/70 mt-2">
              Khám phá hàng chục mẫu Kanban được tối ưu hóa cho từng ngành nghề, quy trình phát triển sản phẩm, marketing và quản lý cá nhân.
            </p>
          </div>

          {/* Search Box in Hero */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative z-10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2b1572]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm mẫu quy trình..."
                className="w-full pl-10 pr-20 py-2.5 text-xs glass-input placeholder:text-[#2b1572]/40 text-[#2b1572] font-medium shadow-xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 btn-primary text-[11px] font-bold shadow-xs cursor-pointer"
              >
                Tìm
              </button>
            </div>
          </form>
        </div>

        {/* Main Content Layout: Sidebar Categories + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Categories Sidebar */}
          <div className="glass-surface p-4 rounded-3xl space-y-1 lg:sticky lg:top-20">
            <div className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-[#2b1572]/60">
              Danh mục mẫu
            </div>

            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md'
                        : 'text-[#2b1572]/75 hover:bg-white/50 hover:text-[#2b1572]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-[#2b1572]">
                Hiển thị {templates.length} mẫu trong mục &ldquo;
                {CATEGORIES.find((c) => c.id === selectedCategory)?.label}&rdquo;
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#2b1572]/60">
                <Loader2 className="w-8 h-8 animate-spin text-[#2b1572]" />
                <span className="text-xs font-semibold">Đang tải danh sách mẫu...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-16 text-center rounded-3xl glass-surface p-8 space-y-3">
                <LayoutTemplate className="w-12 h-12 text-[#2b1572]/30 mx-auto" />
                <h3 className="text-sm font-bold text-[#2b1572]">Không tìm thấy mẫu phù hợp</h3>
                <p className="text-xs text-[#2b1572]/60 max-w-sm mx-auto">
                  Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục khác để xem thêm mẫu.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 btn-secondary text-xs font-bold cursor-pointer"
                >
                  Xem tất cả mẫu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="glass-surface rounded-2xl overflow-hidden border border-white/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    {/* Top Banner with Template Background */}
                    <div
                      className="h-28 p-4 relative flex flex-col justify-between overflow-hidden"
                      style={{
                        background: tpl.background || 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
                      }}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <span className="px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 uppercase tracking-wider">
                          {tpl.category}
                        </span>
                        <div className="flex items-center gap-2 text-white/90 text-[11px] font-medium bg-black/25 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                          <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {tpl.usage_count || 0}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {tpl.view_count || 0}
                          </span>
                        </div>
                      </div>

                      {/* Title on Banner */}
                      <h3 className="text-base font-black text-white tracking-tight relative z-10 line-clamp-1 drop-shadow-sm group-hover:scale-[1.02] transition-transform">
                        {tpl.title}
                      </h3>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white/40">
                      <div>
                        <div className="text-[11px] font-semibold text-[#2b1572]/60 mb-1">
                          Được tạo bởi: <strong className="text-[#2b1572]">{tpl.author_name || 'Planify Team'}</strong>
                        </div>
                        <p className="text-xs text-[#2b1572]/80 line-clamp-2 leading-relaxed">
                          {tpl.description || 'Mẫu chuẩn được thiết kế giúp theo dõi tiến độ công việc khoa học.'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-[#2b1572]/10 flex items-center justify-between gap-2">
                        <Link
                          href={`/templates/${tpl.id}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#2b1572] hover:bg-white/60 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setSelectedTemplateForUse(tpl)}
                          className="px-4 py-1.5 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer group-hover:shadow-md transition-shadow"
                        >
                          <span>Sử dụng mẫu</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Use Template Modal */}
      {selectedTemplateForUse && (
        <UseTemplateModal
          isOpen={!!selectedTemplateForUse}
          onClose={() => setSelectedTemplateForUse(null)}
          template={selectedTemplateForUse}
        />
      )}
    </AppShell>
  );
}
