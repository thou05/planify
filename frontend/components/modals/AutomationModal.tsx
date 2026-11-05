'use client';

import { confirmDialog } from '@/components/ui/AppDialog';
import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Sparkles,
  Play,
  CheckCircle,
  Clock,
  Calendar,
  Layers,
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Copy,
  Trash2,
  RotateCcw,
  AlertCircle,
  Check,
  RefreshCw,
  ExternalLink,
  Sliders,
  HelpCircle,
  History,
  LayoutTemplate,
  Tag,
  MessageSquare,
  Archive,
  ArrowDownUp,
  User,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import AutomationBuilderModal from './AutomationBuilderModal';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardLists: any[];
  boardLabels: any[];
  boardMembers: any[];
  onAutomationsChanged?: () => void;
}

type TabType = 'RULE' | 'SCHEDULED' | 'DUE_DATE' | 'BUTTON' | 'TEMPLATES' | 'LOGS';

const ICON_MAP: Record<string, React.FC<any>> = {
  Sparkles,
  Zap,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  Tag,
  User,
  Archive,
  ArrowDownUp,
  MessageSquare,
  Bookmark,
};

export default function AutomationModal({
  isOpen,
  onClose,
  boardId,
  boardLists = [],
  boardLabels = [],
  boardMembers = [],
  onAutomationsChanged,
}: AutomationModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('RULE');
  const [automations, setAutomations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const [labels, setLabels] = useState<any[]>(boardLabels || []);

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<any[]>(`/boards/${boardId}/automations`);
      setAutomations(res.data || []);
    } catch (err: any) {
      console.error('Error fetching automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiClient<any[]>('/automations/templates');
      setTemplates(res.data || []);
    } catch {}
  };

  const fetchLogs = async () => {
    try {
      const res = await apiClient<any[]>(`/boards/${boardId}/automations/logs?limit=50`);
      setLogs(res.data || []);
    } catch {}
  };

  const fetchLabels = async () => {
    if (!boardId) return;
    try {
      const res = await apiClient<any[]>(`/boards/${boardId}/labels`);
      if (res.success && Array.isArray(res.data)) {
        setLabels(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    if (boardLabels && boardLabels.length > 0) {
      setLabels(boardLabels);
    }
  }, [boardLabels]);

  useEffect(() => {
    if (isOpen && boardId) {
      fetchAutomations();
      fetchTemplates();
      fetchLogs();
      fetchLabels();
    }
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle Rule Status
  const handleToggle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient<any>(`/automations/${id}/toggle`, { method: 'PATCH' });
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_enabled: res.data?.is_enabled ?? !a.is_enabled } : a)),
      );
      showNotification('success', 'Đã cập nhật trạng thái quy tắc');
      onAutomationsChanged?.();
    } catch (err: any) {
      showNotification('error', err?.message || 'Không thể đổi trạng thái');
    }
  };

  // Duplicate Rule
  const handleDuplicate = async (id: string) => {
    try {
      const res = await apiClient<any>(`/automations/${id}/duplicate`, { method: 'POST' });
      setAutomations((prev) => [res.data, ...prev]);
      showNotification('success', 'Đã nhân bản quy tắc thành công');
      onAutomationsChanged?.();
    } catch (err: any) {
      showNotification('error', err?.message || 'Không thể nhân bản');
    }
  };

  // Delete Rule
  const handleDelete = async (id: string, name: string) => {
    if (!(await confirmDialog({ title: 'Xóa quy tắc', message: `Bạn có chắc chắn muốn xóa quy tắc tự động hóa "${name}"?`, variant: 'danger', confirmText: 'Xóa' }))) return;
    try {
      await apiClient(`/automations/${id}`, { method: 'DELETE' });
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      showNotification('success', 'Đã xóa quy tắc thành công');
      onAutomationsChanged?.();
    } catch (err: any) {
      showNotification('error', err?.message || 'Không thể xóa quy tắc');
    }
  };

  // Run Now
  const handleRunNow = async (automation: any) => {
    setRunningId(automation.id);
    try {
      const res = await apiClient<any>(`/automations/${automation.id}/run`, {
        method: 'POST',
        data: {},
      });
      if (res.data?.success) {
        showNotification('success', `Đã thực thi thành công quy tắc "${automation.name}"!`);
      } else {
        showNotification(
          'error',
          `Thực thi hoàn tất với lỗi: ${res.data?.log?.error_message || 'Vui lòng xem chi tiết trong Log'}`,
        );
      }
      fetchLogs();
      onAutomationsChanged?.();
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi khi chạy tự động hóa');
    } finally {
      setRunningId(null);
    }
  };

  // Filter automations for active tab
  const filteredAutomations = automations.filter((a) => {
    if (activeTab === 'RULE') {
      if (a.type !== 'RULE') return false;
    } else if (activeTab === 'SCHEDULED') {
      if (a.type !== 'SCHEDULED') return false;
    } else if (activeTab === 'DUE_DATE') {
      if (a.type !== 'DUE_DATE') return false;
    } else if (activeTab === 'BUTTON') {
      if (!['CARD_BUTTON', 'BOARD_BUTTON'].includes(a.type)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.button_label?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-white to-sky-500/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>Tự động hóa (Automation)</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Butler
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Tự động thực hiện các tác vụ lặp lại, tiết kiệm thời gian và giảm sai sót
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification Banner */}
          {notification && (
            <div
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-b border-rose-200'
              }`}
            >
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Navigation Tabs Bar */}
          <div className="px-6 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: 'RULE', label: 'Quy tắc (Rules)', icon: Zap },
                { id: 'SCHEDULED', label: 'Theo lịch (Scheduled)', icon: Clock },
                { id: 'DUE_DATE', label: 'Hạn chót (Due Date)', icon: Calendar },
                { id: 'BUTTON', label: 'Nút bấm (Buttons)', icon: CheckCircle },
                { id: 'TEMPLATES', label: 'Thư viện mẫu', icon: LayoutTemplate },
                { id: 'LOGS', label: 'Lịch sử (Activity Log)', icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-3 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Create Button (unless on Logs or Templates tab) */}
            {activeTab !== 'LOGS' && activeTab !== 'TEMPLATES' && (
              <button
                onClick={() => {
                  setEditingAutomation(null);
                  setSelectedTemplate(null);
                  setIsBuilderOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-600/20 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo tự động hóa mới</span>
              </button>
            )}
          </div>

          {/* Search / Filter Subheader */}
          {activeTab !== 'LOGS' && activeTab !== 'TEMPLATES' && (
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-4 bg-white shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tự động hóa..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {filteredAutomations.length} quy tắc được tìm thấy
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 1. RULES / SCHEDULED / DUE_DATE / BUTTON TABS */}
            {activeTab !== 'TEMPLATES' && activeTab !== 'LOGS' && (
              <>
                {isLoading ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Đang tải danh sách tự động hóa...</p>
                  </div>
                ) : filteredAutomations.length === 0 ? (
                  <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800">
                        Chưa có tự động hóa nào trong mục này
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Hãy tạo quy tắc đầu tiên hoặc chọn từ thư viện mẫu để bắt đầu tự động hóa công việc.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEditingAutomation(null);
                          setSelectedTemplate(null);
                          setIsBuilderOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-600/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tạo quy tắc mới</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('TEMPLATES')}
                        className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem mẫu có sẵn</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAutomations.map((auto) => {
                      const IconComponent =
                        auto.button_icon && ICON_MAP[auto.button_icon]
                          ? ICON_MAP[auto.button_icon]
                          : Zap;

                      return (
                        <div
                          key={auto.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            auto.is_enabled
                              ? 'bg-white border-slate-200/90 shadow-2xs hover:border-amber-300'
                              : 'bg-slate-50/70 border-slate-200/50 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Left Info */}
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    auto.type === 'RULE'
                                      ? 'bg-purple-100 text-purple-800'
                                      : auto.type === 'SCHEDULED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : auto.type === 'DUE_DATE'
                                      ? 'bg-amber-100 text-amber-800'
                                      : auto.type === 'CARD_BUTTON'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-teal-100 text-teal-800'
                                  }`}
                                >
                                  {getTypeLabel(auto.type)}
                                </span>

                                <h3 className="text-xs font-bold text-slate-800 truncate">
                                  {auto.name}
                                </h3>

                                {['CARD_BUTTON', 'BOARD_BUTTON'].includes(auto.type) && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-semibold">
                                    <IconComponent className="w-3 h-3 text-amber-600" />
                                    <span>{auto.button_label || auto.name}</span>
                                  </div>
                                )}
                              </div>

                              {auto.description && (
                                <p className="text-xs text-slate-500 line-clamp-2">
                                  {auto.description}
                                </p>
                              )}

                              {/* Summary of Trigger and Actions */}
                              <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-600">
                                <span className="font-semibold text-slate-700">Khi:</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
                                  {getTriggerSummary(auto, boardLists)}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="font-semibold text-slate-700">
                                  {auto.actions?.length || 0} hành động
                                </span>
                              </div>
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Run Now Button */}
                              <button
                                type="button"
                                onClick={() => handleRunNow(auto)}
                                disabled={runningId === auto.id || !auto.is_enabled}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                                title="Chạy thử quy tắc này ngay lập tức"
                              >
                                {runningId === auto.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 text-amber-600" />
                                )}
                                <span>Chạy ngay</span>
                              </button>

                              {/* On/Off Switch */}
                              <button
                                type="button"
                                onClick={(e) => handleToggle(auto.id, e)}
                                className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                                  auto.is_enabled ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                                title={auto.is_enabled ? 'Đang bật' : 'Đang tắt'}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                                    auto.is_enabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>

                              {/* Action Menu (Edit, Duplicate, Delete) */}
                              <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAutomation(auto);
                                    setSelectedTemplate(null);
                                    setIsBuilderOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Chỉnh sửa quy tắc"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(auto.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Nhân bản quy tắc"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(auto.id, auto.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Xóa quy tắc"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* 2. TEMPLATES TAB */}
            {activeTab === 'TEMPLATES' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-amber-900">Thư viện quy tắc có sẵn</h3>
                    <p className="text-xs text-amber-700/80">
                      Cài đặt nhanh chỉ với 1-click các luồng tự động hóa thông dụng nhất của Trello Butler
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 shadow-2xs transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              tpl.type === 'RULE'
                                ? 'bg-purple-100 text-purple-800'
                                : tpl.type === 'DUE_DATE'
                                ? 'bg-amber-100 text-amber-800'
                                : tpl.type === 'CARD_BUTTON'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {getTypeLabel(tpl.type)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">{tpl.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {tpl.actions?.length || 0} hành động
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(tpl);
                            setEditingAutomation(null);
                            setIsBuilderOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sử dụng mẫu này</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ACTIVITY LOGS TAB */}
            {activeTab === 'LOGS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-700">
                    Lịch sử thực thi gần nhất ({logs.length} lượt)
                  </div>
                  <button
                    type="button"
                    onClick={fetchLogs}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Làm mới</span>
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <History className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">
                      Chưa có lịch sử thực thi nào được ghi nhận
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.status === 'PARTIAL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.status === 'SUCCESS'
                                ? 'Thành công'
                                : log.status === 'PARTIAL'
                                ? 'Một phần'
                                : 'Thất bại'}
                            </span>
                            <span className="font-bold text-slate-800">
                              {log.automation_name || 'Quy tắc'}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400">
                            {new Date(log.started_at).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                          <span>
                            Sự kiện: <strong className="text-slate-800">{log.trigger_event}</strong>
                          </span>
                          {log.card_title && (
                            <span>
                              Thẻ: <strong className="text-slate-800">"{log.card_title}"</strong>
                            </span>
                          )}
                          <span>
                            Thực hiện:{' '}
                            <strong className="text-slate-800">{log.actor_name || 'Hệ thống'}</strong>
                          </span>
                          <span>
                            Hành động:{' '}
                            <strong className="text-emerald-700">
                              {log.actions_succeeded}/{log.actions_total}
                            </strong>
                          </span>
                        </div>

                        {log.error_message && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                            <span>{log.error_message}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Builder Modal */}
      {isBuilderOpen && (
        <AutomationBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingAutomation(null);
            setSelectedTemplate(null);
          }}
          boardId={boardId}
          boardLists={boardLists}
          boardLabels={labels}
          boardMembers={boardMembers}
          editingAutomation={editingAutomation}
          initialTemplate={selectedTemplate}
          initialType={
            activeTab === 'BUTTON'
              ? 'CARD_BUTTON'
              : activeTab === 'TEMPLATES' || activeTab === 'LOGS'
              ? 'RULE'
              : activeTab
          }
          onSaved={() => {
            fetchAutomations();
            fetchLogs();
            if (activeTab === 'TEMPLATES' || activeTab === 'LOGS') {
              setActiveTab('RULE');
            }
            showNotification('success', 'Đã lưu quy tắc tự động hóa thành công!');
            onAutomationsChanged?.();
          }}
        />
      )}
    </>
  );
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'RULE':
      return 'Quy tắc';
    case 'SCHEDULED':
      return 'Theo lịch';
    case 'DUE_DATE':
      return 'Hạn chót';
    case 'CARD_BUTTON':
      return 'Nút trên Thẻ';
    case 'BOARD_BUTTON':
      return 'Nút trên Bảng';
    default:
      return type;
  }
}

function getTriggerSummary(auto: any, lists: any[]): string {
  const getListName = (id?: string) => lists.find((l) => l.id === id)?.title || 'bất kỳ';

  switch (auto.trigger_type) {
    case 'CARD_MOVED':
      if (auto.trigger_config?.destination_list_id) {
        return `Khi thẻ được di chuyển sang "${getListName(auto.trigger_config.destination_list_id)}"`;
      }
      return 'Khi thẻ được di chuyển';
    case 'CARD_CREATED':
      if (auto.trigger_config?.list_id) {
        return `Khi tạo thẻ mới trong "${getListName(auto.trigger_config.list_id)}"`;
      }
      return 'Khi tạo thẻ mới';
    case 'CARD_COMPLETED':
      return 'Khi thẻ được đánh dấu hoàn thành';
    case 'CARD_DUE_DATE_CHANGED':
      return 'Khi ngày hết hạn thay đổi';
    case 'CHECKLIST_COMPLETED':
      return 'Khi hoàn thành toàn bộ Checklist';
    case 'SCHEDULED':
      return `Chạy định kỳ ${auto.trigger_config?.frequency || 'hàng ngày'} lúc ${
        auto.trigger_config?.time || '09:00'
      }`;
    case 'DUE_DATE_APPROACHING':
      return `Khi sắp đến hạn (${auto.trigger_config?.offset_days || 1} ngày)`;
    case 'CARD_BUTTON_CLICKED':
      return 'Khi người dùng bấm nút trên thẻ';
    case 'BOARD_BUTTON_CLICKED':
      return 'Khi người dùng bấm nút trên bảng';
    default:
      return auto.trigger_type || 'Sự kiện hệ thống';
  }
}
