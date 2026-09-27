'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Clock,
  User,
  Lightbulb,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BottleneckItem {
  type: 'list_overflow' | 'blocker_chain' | 'stalled_cards';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cardIds?: string[];
}

interface DeadlineRiskItem {
  cardId: string;
  cardTitle: string;
  listTitle: string;
  dueDate: string;
  riskReason: string;
  severity: 'HIGH' | 'CRITICAL';
}

interface WorkloadItem {
  memberId: string;
  memberName: string;
  assignedCardCount: number;
  overdueCardCount: number;
  assessment: string;
}

interface RiskScanData {
  riskScore: number;
  overallAssessment: string;
  bottlenecks: BottleneckItem[];
  deadlineRisks: DeadlineRiskItem[];
  workloadImbalance: WorkloadItem[];
  actionableRecommendations: string[];
}

interface BoardRiskScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle?: string;
  onOpenCard?: (cardId: string) => void;
}

export const BoardRiskScannerModal: React.FC<BoardRiskScannerModalProps> = ({
  isOpen,
  onClose,
  boardId,
  boardTitle,
  onOpenCard,
}) => {
  const [data, setData] = useState<RiskScanData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'bottlenecks' | 'deadlines' | 'workload'>('all');

  const handleScan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<any>(`/ai/boards/${boardId}/risk-scan`, {
        method: 'POST',
      });
      if (res.success && res.data) {
        const raw = res.data;
        const normalized: RiskScanData = {
          riskScore: typeof raw.riskScore === 'number' ? raw.riskScore : (raw.metrics?.overdueCount ? 65 : 25),
          overallAssessment: raw.summary || raw.overallAssessment || 'Đã phân tích tổng thể rủi ro trên bảng.',
          bottlenecks: (raw.bottlenecks || []).map((b: any) => ({
            type: b.type || 'list_overflow',
            title: b.title || 'Điểm nghẽn',
            description: b.description || '',
            severity: (b.severity || 'MEDIUM').toUpperCase(),
            cardIds: b.affectedCards || b.cardIds || [],
          })),
          deadlineRisks: (raw.deadlineRisks || []).map((d: any) => ({
            cardId: d.cardId || '',
            cardTitle: d.cardTitle || d.title || 'Thẻ công việc',
            listTitle: d.listTitle || 'Kanban',
            dueDate: d.dueDate || '',
            riskReason: d.issue || d.riskReason || 'Nguy cơ trễ hạn',
            severity: (d.severity || 'HIGH').toUpperCase(),
          })),
          workloadImbalance: (raw.workloadIssues || raw.workloadImbalance || []).map((w: any) => ({
            memberId: w.memberId || '',
            memberName: w.memberName || 'Thành viên',
            assignedCardCount: w.taskCount ?? w.assignedCardCount ?? 0,
            overdueCardCount: w.overdueCardCount ?? 0,
            assessment: w.suggestion || w.status || w.assessment || 'Khối lượng ổn định',
          })),
          actionableRecommendations: (raw.actionItems || raw.actionableRecommendations || []).map((a: any) =>
            typeof a === 'string' ? a : (a.action ? `${a.action}${a.impact ? ` (${a.impact})` : ''}` : '')
          ).filter(Boolean),
        };
        setData(normalized);
      } else {
        setError(res.error || res.message || 'Không thể quét rủi ro bằng AI');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối khi quét rủi ro');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data && !isLoading) {
      handleScan();
    }
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score <= 30) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-600', label: 'Rủi ro thấp / An toàn' };
    if (score <= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-500 to-orange-500', label: 'Cần chú ý / Trung bình' };
    if (score <= 80) return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', gradient: 'from-orange-500 to-rose-500', label: 'Rủi ro cao' };
    return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', gradient: 'from-rose-600 to-red-700', label: 'Báo động nghiêm trọng' };
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">NGHIÊM TRỌNG</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">CAO</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">TRUNG BÌNH</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">THẤP</span>;
    }
  };

  const scoreTheme = data ? getScoreColor(data.riskScore) : getScoreColor(0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-[#2b1572] to-[#1e1050] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">AI Quét Rủi Ro & Điểm Nghẽn</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  AI Auditor
                </span>
              </div>
              <p className="text-xs text-white/70 line-clamp-1">
                Phân tích tiến độ, nút thắt công việc và phân bổ tải nhóm trên {boardTitle ? `"${boardTitle}"` : 'Bảng'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/15 disabled:opacity-50"
              title="Quét lại toàn bộ bảng"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Quét lại</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-[#2b1572] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-[#2b1572] animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2b1572]">Gemini đang phân tích toàn bộ Bảng...</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Kiểm tra chuỗi phụ thuộc (blockers), hạn chót quá hạn, cột ứ đọng công việc và phân bổ nhân sự...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-rose-50/70 rounded-2xl border border-rose-200 gap-3">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-sm font-semibold text-rose-800">{error}</p>
              <button
                onClick={handleScan}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Thử quét lại
              </button>
            </div>
          ) : data ? (
            <>
              {/* Top Banner: Risk Gauge & Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Card */}
                <div className={`p-5 rounded-2xl border ${scoreTheme.bg} ${scoreTheme.border} flex flex-col justify-between shadow-2xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chỉ số rủi ro Bảng</span>
                    <TrendingUp className={`w-4 h-4 ${scoreTheme.text}`} />
                  </div>
                  <div className="my-3 flex items-baseline gap-2">
                    <span className={`text-4xl font-black ${scoreTheme.text}`}>{data.riskScore}</span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className={`h-full bg-gradient-to-r ${scoreTheme.gradient} transition-all duration-700 rounded-full`}
                        style={{ width: `${Math.min(data.riskScore, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${scoreTheme.text}`}>{scoreTheme.label}</span>
                  </div>
                </div>

                {/* Overall Assessment */}
                <div className="md:col-span-2 p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Đánh giá tổng thể từ AI</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                      {data.overallAssessment}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>Điểm nghẽn: <strong className="text-slate-700">{data.bottlenecks?.length || 0}</strong></span>
                    <span>•</span>
                    <span>Rủi ro hạn chót: <strong className="text-rose-600">{data.deadlineRisks?.length || 0}</strong></span>
                    <span>•</span>
                    <span>Nhân sự quá tải: <strong className="text-amber-600">{data.workloadImbalance?.filter(w => w.overdueCardCount > 0 || w.assignedCardCount > 5).length || 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              {data.actionableRecommendations && data.actionableRecommendations.length > 0 && (
                <div className="p-4.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white border border-indigo-100 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Đề xuất hành động cấp thiết</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.actionableRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-indigo-100/80 text-xs text-indigo-950 font-medium shadow-2xs">
                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs Filter */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'all' ? 'bg-[#2b1572] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả phân tích
                </button>
                <button
                  onClick={() => setActiveTab('bottlenecks')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'bottlenecks' ? 'bg-[#2b1572] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Điểm nghẽn ({data.bottlenecks?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('deadlines')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'deadlines' ? 'bg-[#2b1572] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Hạn chót & Quá hạn ({data.deadlineRisks?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('workload')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'workload' ? 'bg-[#2b1572] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Phân bổ nhân sự ({data.workloadImbalance?.length || 0})
                </button>
              </div>

              {/* Section 1: Bottlenecks */}
              {(activeTab === 'all' || activeTab === 'bottlenecks') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Điểm nghẽn quy trình</h4>
                  </div>
                  {(!data.bottlenecks || data.bottlenecks.length === 0) ? (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-medium text-emerald-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Không phát hiện điểm nghẽn nghiêm trọng nào trên luồng công việc!</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.bottlenecks.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#a6d1fd] transition-all shadow-2xs space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-[#2b1572] line-clamp-1">{item.title}</span>
                            {getSeverityBadge(item.severity)}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                          {item.cardIds && item.cardIds.length > 0 && onOpenCard && (
                            <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-100">
                              {item.cardIds.map((cid, cidx) => (
                                <button
                                  key={cidx}
                                  onClick={() => {
                                    onOpenCard(cid);
                                    onClose();
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-[#a6d1fd]/40 text-[#2b1572] text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Xem thẻ liên quan</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: Deadline Risks */}
              {(activeTab === 'all' || activeTab === 'deadlines') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Thẻ có nguy cơ trễ hạn hoặc quá hạn</h4>
                  </div>
                  {(!data.deadlineRisks || data.deadlineRisks.length === 0) ? (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-medium text-emerald-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Các thẻ đều nằm trong hạn chót an toàn hoặc chưa có deadline nguy hiểm!</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.deadlineRisks.map((d, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (onOpenCard && d.cardId) {
                              onOpenCard(d.cardId);
                              onClose();
                            }
                          }}
                          className="p-3 bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200 hover:border-rose-300 transition-all shadow-2xs flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                                  {d.cardTitle}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                  {d.listTitle}
                                </span>
                                {getSeverityBadge(d.severity)}
                              </div>
                              <p className="text-xs text-rose-700 font-medium mt-0.5">{d.riskReason}</p>
                              {d.dueDate && (
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  Hạn chót: {new Date(d.dueDate).toLocaleString('vi-VN')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 group-hover:text-rose-600 text-xs font-bold shrink-0">
                            <span className="hidden sm:inline">Mở thẻ</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Workload Balance */}
              {(activeTab === 'all' || activeTab === 'workload') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Phân bổ khối lượng nhân sự</h4>
                  </div>
                  {(!data.workloadImbalance || data.workloadImbalance.length === 0) ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                      Chưa có đủ dữ liệu gán người phụ trách trên bảng để phân tích khối lượng.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {data.workloadImbalance.map((w, idx) => {
                        const isOverloaded = w.overdueCardCount > 0 || w.assignedCardCount > 5;
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-2xl border transition-all shadow-2xs space-y-2 ${
                              isOverloaded ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 truncate">{w.memberName}</span>
                              {isOverloaded ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">Căng thẳng</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">Ổn định</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Đang phụ trách</span>
                                <strong className="text-slate-700">{w.assignedCardCount} thẻ</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Quá hạn</span>
                                <strong className={w.overdueCardCount > 0 ? 'text-rose-600' : 'text-slate-700'}>
                                  {w.overdueCardCount} thẻ
                                </strong>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">{w.assessment}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Powered by Gemini AI • Tự động quét theo cấu trúc Kanban thực tế
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
