'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Sparkles,
  Download,
  RefreshCw,
  TrendingUp,
  Tag,
  CheckSquare,
  ArrowUpRight,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BoardAnalyticsViewProps {
  boardId: string;
  onCardClick?: (cardId: string) => void;
}


interface AnalyticsData {
  board: {
    id: string;
    name: string;
    description: string | null;
  };
  summary: {
    totalCards: number;
    completedCards: number;
    inProgressCards: number;
    todoCards: number;
    overdueCards: number;
    dueSoonCards: number;
    noDueDateCards: number;
    completionRate: number;
    overdueRate: number;
  };
  lists: {
    id: string;
    title: string;
    position: number;
    cardCount: number;
    completedCount: number;
    percentage: number;
  }[];
  members: {
    userId: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    assignedCardsCount: number;
    completedCardsCount: number;
    overdueCardsCount: number;
    completionRate: number;
  }[];
  unassignedCardsCount: number;
  labels: {
    id: string;
    name: string;
    color: string;
    cardCount: number;
    percentage: number;
  }[];
  checklists: {
    totalChecklists: number;
    totalItems: number;
    completedItems: number;
    completionRate: number;
  };
  urgentCards: {
    id: string;
    title: string;
    dueDate: string;
    isOverdue: boolean;
    listTitle: string;
    assignees: { name: string; avatar: string | null }[];
  }[];
}

interface AiInsightsData {
  score: number;
  healthStatus: 'HEALTHY' | 'MODERATE' | 'CRITICAL';
  summary: string;
  bottlenecks: string[];
  workloadAnalysis: string;
  recommendations: string[];
  generatedAt: string;
  source: 'GEMINI' | 'HEURISTIC';
}

export default function BoardAnalyticsView({
  boardId,
  onCardClick,
}: BoardAnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<AnalyticsData>(`/analytics/boards/${boardId}`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorMessage(res.message || 'Không thể tải dữ liệu thống kê');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi kết nối đến máy chủ');
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleGenerateAiInsights = async () => {
    setIsAiLoading(true);
    try {
      const res = await apiClient<AiInsightsData>(
        `/analytics/boards/${boardId}/ai-insights`,
        { method: 'POST' },
      );
      if (res.success && res.data) {
        setAiInsights(res.data);
      }
    } catch {
      // Có thể hiển thị toast hoặc thông báo
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;

    // Sheet 1: Tổng quan
    const overviewSheetData = [
      ['BẢNG THỐNG KÊ DỰ ÁN PLANIFY', data.board.name],
      ['Ngày xuất báo cáo', new Date().toLocaleString('vi-VN')],
      [],
      ['CHỈ SỐ', 'GIÁ TRỊ'],
      ['Tổng số thẻ (Cards)', data.summary.totalCards],
      ['Đã hoàn thành', data.summary.completedCards],
      ['Tỷ lệ hoàn thành', `${data.summary.completionRate}%`],
      ['Đang xử lý', data.summary.inProgressCards],
      ['Chưa bắt đầu', data.summary.todoCards],
      ['Quá hạn', data.summary.overdueCards],
      ['Sắp tới hạn (trong 48h)', data.summary.dueSoonCards],
      ['Không có hạn chót', data.summary.noDueDateCards],
      ['Thẻ chưa gán người phụ trách', data.unassignedCardsCount],
      ['Checklist đã xong', `${data.checklists.completedItems}/${data.checklists.totalItems} (${data.checklists.completionRate}%)`],
    ];

    // Sheet 2: Danh sách thành viên & Workload
    const memberSheetData = [
      ['Tên thành viên', 'Email', 'Vai trò', 'Tổng thẻ nhận', 'Đã hoàn thành', 'Quá hạn', 'Tỷ lệ hoàn thành'],
      ...data.members.map((m) => [
        m.name,
        m.email,
        m.role,
        m.assignedCardsCount,
        m.completedCardsCount,
        m.overdueCardsCount,
        `${m.completionRate}%`,
      ]),
    ];

    // Sheet 3: Danh sách cột
    const listSheetData = [
      ['Tên cột', 'Vị trí', 'Số lượng thẻ', 'Đã hoàn thành', 'Tỷ trọng %'],
      ...data.lists.map((l) => [
        l.title,
        l.position,
        l.cardCount,
        l.completedCount,
        `${l.percentage}%`,
      ]),
    ];

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewSheetData);
    const wsMembers = XLSX.utils.aoa_to_sheet(memberSheetData);
    const wsLists = XLSX.utils.aoa_to_sheet(listSheetData);

    XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng quan');
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Khối lượng công việc');
    XLSX.utils.book_append_sheet(wb, wsLists, 'Phân bổ theo Cột');

    XLSX.writeFile(wb, `Planify_ThongKe_${data.board.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-700 mb-3" />
        <p className="text-sm font-medium">Đang phân tích số liệu thống kê bảng...</p>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-3 shadow-2xs">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Không thể tải dữ liệu thống kê</h3>
        <p className="text-sm text-slate-500 max-w-md mb-4">{errorMessage || 'Đã có lỗi xảy ra khi tổng hợp báo cáo'}</p>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  const { summary, lists, members, labels, checklists, urgentCards } = data;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 pb-20 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-slate-900">
                Thống Kê & Báo Cáo Hiệu Suất
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi tiến độ, khối lượng công việc và rủi ro thời gian thực cho Bảng
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Nút Phân tích AI */}
          <button
            onClick={handleGenerateAiInsights}
            disabled={isAiLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Sử dụng AI phân tích toàn diện bảng và đưa ra khuyến nghị"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'AI đang phân tích...' : 'AI Insights'}</span>
          </button>

          {/* Nút Xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Xuất toàn bộ báo cáo ra file Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {/* Nút Refresh */}
          <button
            onClick={fetchAnalytics}
            className="p-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Smart Summary Card */}
      {aiInsights && (
        <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white p-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-md flex items-center justify-center font-bold text-base text-white shadow-2xs ${
                  aiInsights.healthStatus === 'HEALTHY'
                    ? 'bg-emerald-600'
                    : aiInsights.healthStatus === 'MODERATE'
                    ? 'bg-amber-600'
                    : 'bg-rose-600'
                }`}
              >
                {aiInsights.score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    AI Project Health Score
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-xs border ${
                      aiInsights.healthStatus === 'HEALTHY'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : aiInsights.healthStatus === 'MODERATE'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {aiInsights.healthStatus === 'HEALTHY' && <ShieldCheck className="w-3 h-3" />}
                    {aiInsights.healthStatus === 'MODERATE' && <Clock className="w-3 h-3" />}
                    {aiInsights.healthStatus === 'CRITICAL' && <ShieldAlert className="w-3 h-3" />}
                    {aiInsights.healthStatus === 'HEALTHY'
                      ? 'Tiến độ An toàn'
                      : aiInsights.healthStatus === 'MODERATE'
                      ? 'Cần Chú Ý'
                      : 'Báo Động Tiến Độ'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({aiInsights.source === 'GEMINI' ? 'Gemini 2.5' : 'Heuristic Engine'})
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{aiInsights.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
            {/* Điểm nghẽn */}
            {aiInsights.bottlenecks.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 mb-2">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>Điểm nghẽn & Rủi ro phát hiện</span>
                </div>
                <ul className="space-y-1.5 text-slate-600">
                  {aiInsights.bottlenecks.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Khuyến nghị hành động */}
            {aiInsights.recommendations.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                  <span>Hành động đề xuất (Action Items)</span>
                </div>
                <ul className="space-y-1.5 text-slate-600">
                  {aiInsights.recommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-slate-900 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Total Cards */}
        <div className="p-4 rounded-lg bg-white border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tổng số thẻ</span>
            <Layers className="w-4 h-4 text-slate-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.totalCards}</span>
            <span className="text-[11px] text-slate-400">công việc</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {summary.noDueDateCards} thẻ chưa đặt deadline
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-lg bg-white border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-medium">Đã hoàn thành</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.completedCards}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-xs">
              {summary.completionRate}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden mt-3">
            <div
              className="bg-emerald-600 h-full rounded-xs transition-all duration-500"
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-lg bg-white border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-medium">Đang xử lý</span>
            <TrendingUp className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.inProgressCards}</span>
            <span className="text-[11px] text-slate-500">đang làm</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {summary.todoCards} thẻ đang chờ (To-Do)
          </div>
        </div>

        {/* Overdue */}
        <div className="p-4 rounded-lg bg-white border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-medium">Quá hạn</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.overdueCards}</span>
            {summary.overdueCards > 0 && (
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-xs">
                {summary.overdueRate}%
              </span>
            )}
          </div>
          <div className="text-[11px] text-rose-600 mt-2 font-medium">
            {summary.overdueCards > 0 ? 'Cần xử lý gấp' : 'Không có thẻ trễ hạn'}
          </div>
        </div>

        {/* Due Soon (48h) */}
        <div className="p-4 rounded-lg bg-white border border-slate-300 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-medium">Sắp tới hạn (48h)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.dueSoonCards}</span>
            <span className="text-[11px] text-slate-500">thẻ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Hạn trong 2 ngày tới
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ Phân bổ Thẻ theo Cột (List Breakdown) */}
        <div className="p-5 rounded-lg bg-white border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-600" />
                <span>Tiến Độ Phân Bổ Theo Cột</span>
              </h3>
              <p className="text-xs text-slate-500">Số lượng công việc tại từng giai đoạn Kanban</p>
            </div>
            <span className="text-xs font-medium text-slate-500">{lists.length} cột</span>
          </div>

          <div className="space-y-3 pt-1">
            {lists.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">Chưa có cột nào trong bảng</div>
            ) : (
              lists.map((list) => {
                const isDoneCol =
                  list.title.toLowerCase().includes('done') ||
                  list.title.toLowerCase().includes('xong') ||
                  list.title.toLowerCase().includes('hoàn thành');

                return (
                  <div key={list.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">
                        {list.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{list.cardCount} thẻ</span>
                        <span className="font-semibold text-slate-900 w-9 text-right">
                          {list.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-xs overflow-hidden flex">
                      <div
                        className={`h-full rounded-xs transition-all duration-500 ${
                          isDoneCol ? 'bg-emerald-600' : 'bg-slate-800'
                        }`}
                        style={{ width: `${Math.max(list.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Biểu đồ Khối lượng công việc theo Thành viên (Member Workload) */}
        <div className="p-5 rounded-lg bg-white border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span>Khối Lượng Công Việc (Workload)</span>
              </h3>
              <p className="text-xs text-slate-500">Phân bổ task và hiệu suất của từng thành viên</p>
            </div>
            {data.unassignedCardsCount > 0 && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-xs">
                {data.unassignedCardsCount} thẻ chưa gán
              </span>
            )}
          </div>

          <div className="space-y-2 pt-1 max-h-[320px] overflow-y-auto pr-1">
            {members.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">Bảng chưa có thành viên nào</div>
            ) : (
              members.map((member) => (
                <div
                  key={member.userId}
                  className="p-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{member.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{member.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-slate-900">{member.assignedCardsCount} thẻ</span>
                      {member.overdueCardsCount > 0 && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-xs">
                          {member.overdueCardsCount} trễ
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-emerald-700 w-8 text-right">
                        {member.completionRate}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-xs transition-all duration-500"
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row: Labels & Checklist Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phân bổ theo Nhãn (Labels / Tags) */}
        <div className="p-5 rounded-lg bg-white border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-slate-600" />
                <span>Phân Loại Theo Nhãn (Labels)</span>
              </h3>
              <p className="text-xs text-slate-500">Các chủ đề & phân loại công việc trọng tâm</p>
            </div>
            <span className="text-xs font-medium text-slate-500">{labels.length} nhãn</span>
          </div>

          {labels.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">Chưa có nhãn nào được gắn vào thẻ</div>
          ) : (
            <div className="space-y-2.5">
              {labels.map((lbl) => (
                <div key={lbl.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: lbl.color || '#3b82f6' }}
                      />
                      <span className="font-medium text-slate-700">{lbl.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{lbl.cardCount} thẻ</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden">
                    <div
                      className="h-full rounded-xs transition-all duration-500"
                      style={{
                        backgroundColor: lbl.color || '#3b82f6',
                        width: `${Math.max(lbl.percentage, 3)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thống kê Checklists & Tiểu mục */}
        <div className="p-5 rounded-lg bg-white border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-slate-600" />
                  <span>Tiến Độ Checklist Chi Tiết</span>
                </h3>
                <p className="text-xs text-slate-500">Mức độ hoàn thành các hạng mục con bên trong thẻ</p>
              </div>
            </div>

            <div className="flex items-center gap-6 my-4">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-slate-900 transition-all duration-1000 ease-out"
                    strokeDasharray={`${checklists.completionRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-base font-bold text-slate-900">{checklists.completionRate}%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-xs bg-slate-900" />
                  <span className="text-slate-600">Đã hoàn thành:</span>
                  <span className="font-semibold text-slate-900">{checklists.completedItems} mục</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-xs bg-slate-300" />
                  <span className="text-slate-600">Chưa hoàn thành:</span>
                  <span className="font-semibold text-slate-900">
                    {checklists.totalItems - checklists.completedItems} mục
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Tổng danh sách:</span>
                  <span className="font-medium text-slate-600">{checklists.totalChecklists} checklist</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Mẹo: Sử dụng tính năng <b>AI Breakdown</b> trong từng thẻ để chia nhỏ các công việc phức tạp thành checklist rõ ràng.
          </div>
        </div>
      </div>

      {/* Urgent / Overdue Tasks Focus List */}
      <div className="p-5 rounded-lg bg-white border border-slate-300 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Thẻ Cần Chú Ý Gấp (Quá Hạn & Sắp Đến Hạn)
              </h3>
              <p className="text-xs text-slate-500">Các công việc có nguy cơ ảnh hưởng đến tiến độ toàn dự án</p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500">{urgentCards.length} thẻ</span>
        </div>

        {urgentCards.length === 0 ? (
          <div className="p-6 text-center rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            Tuyệt vời! Không có công việc nào bị quá hạn hoặc sắp đến hạn khẩn cấp.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {urgentCards.map((card) => {
              const formattedDate = new Date(card.dueDate).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={card.id}
                  onClick={() => onCardClick?.(card.id)}
                  className="py-2.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-md transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-xs shrink-0 uppercase tracking-wide border ${
                        card.isOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {card.isOverdue ? 'Quá hạn' : 'Sắp đến hạn'}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {card.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Cột: {card.listTitle}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-2.5 h-2.5" />
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Assignees avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {card.assignees.map((a, i) => (
                        <div
                          key={i}
                          title={a.name}
                          className="w-5 h-5 rounded-full border border-white bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold overflow-hidden"
                        >
                          {a.avatar ? (
                            <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            a.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      ))}
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
