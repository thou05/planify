'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="bg-white rounded-lg p-6 sm:p-8 border border-slate-300 shadow-2xs relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-600" />
              <span>Thư viện Mẫu Quy trình Planify</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Khởi đầu dự án nhanh chóng với các Mẫu chuyên nghiệp
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Khám phá các mẫu Kanban được tối ưu hóa cho từng ngành nghề, quy trình phát triển sản phẩm, kỹ thuật và quản lý cá nhân.
            </p>
          </div>

          {/* Search Box in Hero */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative z-10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm mẫu quy trình..."
                className="w-full pl-9 pr-16 py-2 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 text-slate-900 font-medium focus:outline-none focus:border-slate-800 transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Tìm
              </button>
            </div>
          </form>
        </div>

        {/* Main Content Layout: Sidebar Categories + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Categories Sidebar */}
          <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs space-y-1 lg:sticky lg:top-20">
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100'
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
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-800">
                Hiển thị {templates.length} mẫu trong mục &ldquo;
                {CATEGORIES.find((c) => c.id === selectedCategory)?.label}&rdquo;
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                <span className="text-xs font-medium">Đang tải danh sách mẫu...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-14 text-center rounded-lg bg-white border border-slate-300 p-8 space-y-3">
                <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-900">Không tìm thấy mẫu phù hợp</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục khác để xem thêm mẫu.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                >
                  Xem tất cả mẫu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-white rounded-lg overflow-hidden border border-slate-300 shadow-2xs hover:shadow-md transition-shadow flex flex-col group"
                  >
                    {/* Top Banner with Template Background */}
                    <div
                      className="h-24 p-3.5 relative flex flex-col justify-between overflow-hidden"
                      style={{
                        background: tpl.background || '#1e293b',
                      }}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <span className="px-1.5 py-0.2 rounded-xs bg-black/40 backdrop-blur-xs text-white text-[10px] font-semibold border border-white/20 uppercase tracking-wider">
                          {tpl.category}
                        </span>
                        <div className="flex items-center gap-2 text-white/90 text-[10px] font-medium bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-xs border border-white/10">
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
                      <h3 className="text-sm font-bold text-white tracking-tight relative z-10 line-clamp-1">
                        {tpl.title}
                      </h3>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">
                          Được tạo bởi: <strong className="text-slate-800 font-semibold">{tpl.author_name || 'Planify Team'}</strong>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {tpl.description || 'Mẫu chuẩn được thiết kế giúp theo dõi tiến độ công việc khoa học.'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                        <Link
                          href={`/templates/${tpl.id}`}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setSelectedTemplateForUse(tpl)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
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
    </>
  );
}
