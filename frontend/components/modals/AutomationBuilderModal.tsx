'use client';

import { alertDialog } from '@/components/ui/AppDialog';
import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Sparkles,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  Tag,
  User,
  Archive,
  PlusCircle,
  Trash2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Sliders,
  Send,
  MessageSquare,
  ArrowDownUp,
  Bookmark,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AutomationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardLists: any[];
  boardLabels: any[];
  boardMembers: any[];
  editingAutomation?: any | null;
  initialType?: string;
  initialTemplate?: any | null;
  onSaved: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Sparkles', icon: Sparkles, label: 'Lấp lánh' },
  { name: 'Zap', icon: Zap, label: 'Tia chớp' },
  { name: 'Play', icon: Play, label: 'Chạy' },
  { name: 'CheckCircle', icon: CheckCircle, label: 'Hoàn tất' },
  { name: 'Clock', icon: Clock, label: 'Thời gian' },
  { name: 'ArrowRight', icon: ArrowRight, label: 'Chuyển tiếp' },
  { name: 'Tag', icon: Tag, label: 'Nhãn' },
  { name: 'User', icon: User, label: 'Người dùng' },
  { name: 'Archive', icon: Archive, label: 'Lưu trữ' },
  { name: 'ArrowDownUp', icon: ArrowDownUp, label: 'Sắp xếp' },
  { name: 'MessageSquare', icon: MessageSquare, label: 'Bình luận' },
  { name: 'Bookmark', icon: Bookmark, label: 'Đánh dấu' },
];

export default function AutomationBuilderModal({
  isOpen,
  onClose,
  boardId,
  boardLists = [],
  boardLabels = [],
  boardMembers = [],
  editingAutomation = null,
  initialType = 'RULE',
  initialTemplate = null,
  onSaved,
}: AutomationBuilderModalProps) {
  const [type, setType] = useState<string>('RULE');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [buttonIcon, setButtonIcon] = useState<string>('Sparkles');
  const [buttonLabel, setButtonLabel] = useState<string>('');

  // Trigger state
  const [triggerType, setTriggerType] = useState<string>('CARD_MOVED');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});

  // Conditions state
  const [conditions, setConditions] = useState<
    Array<{ field: string; operator: string; value: any }>
  >([]);

  // Actions state
  const [actions, setActions] = useState<
    Array<{ id: string; type: string; params: Record<string, any> }>
  >([]);

  // Labels state with automatic fetching & quick-create
  const [labels, setLabels] = useState<any[]>(boardLabels || []);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [isSeedingLabels, setIsSeedingLabels] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateTarget, setQuickCreateTarget] = useState<{
    type: 'condition' | 'action';
    idOrIdx: string | number;
  } | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [isSubmittingLabel, setIsSubmittingLabel] = useState(false);

  const fetchLabels = async () => {
    if (!boardId) return;
    try {
      setIsLoadingLabels(true);
      const res = await apiClient<any[]>(`/boards/${boardId}/labels`);
      if (res.success && Array.isArray(res.data)) {
        setLabels(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhãn:', err);
    } finally {
      setIsLoadingLabels(false);
    }
  };

  useEffect(() => {
    if (boardLabels && boardLabels.length > 0) {
      setLabels(boardLabels);
    }
  }, [boardLabels]);

  useEffect(() => {
    if (isOpen && boardId) {
      fetchLabels();
    }
  }, [isOpen, boardId]);

  const handleSeedDefaultLabels = async () => {
    if (!boardId || isSeedingLabels) return;
    setIsSeedingLabels(true);
    const defaultPresets = [
      { name: 'Gấp (Urgent)', color: '#ef4444' },
      { name: 'Đang xử lý', color: '#f59e0b' },
      { name: 'Frontend', color: '#3b82f6' },
      { name: 'Backend', color: '#10b981' },
      { name: 'UI/UX Glass', color: '#a855f7' },
      { name: 'Bug / Lỗi', color: '#ec4899' },
    ];
    try {
      for (const item of defaultPresets) {
        await apiClient(`/boards/${boardId}/labels`, {
          method: 'POST',
          data: item,
        });
      }
      await fetchLabels();
    } catch (err) {
      console.error('Lỗi tạo nhãn mẫu:', err);
    } finally {
      setIsSeedingLabels(false);
    }
  };

  const handleCreateNewLabel = async () => {
    if (!newLabelName.trim() || !boardId || isSubmittingLabel) return;
    setIsSubmittingLabel(true);
    try {
      const res = await apiClient<any>(`/boards/${boardId}/labels`, {
        method: 'POST',
        data: {
          name: newLabelName.trim(),
          color: newLabelColor,
        },
      });
      if (res.success && res.data) {
        const created = res.data;
        setLabels((prev) => [...prev, created]);
        if (quickCreateTarget?.type === 'condition') {
          handleUpdateCondition(quickCreateTarget.idOrIdx as number, { value: created.id });
        } else if (quickCreateTarget?.type === 'action') {
          handleUpdateActionParams(quickCreateTarget.idOrIdx as string, { labelId: created.id });
        }
        setNewLabelName('');
        setIsQuickCreateOpen(false);
        setQuickCreateTarget(null);
      }
    } catch (err: any) {
      void alertDialog({ message: err?.message || 'Không thể tạo nhãn mới', variant: 'error' });
    } finally {
      setIsSubmittingLabel(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or populate form
  useEffect(() => {
    if (editingAutomation) {
      setType(editingAutomation.type || 'RULE');
      setName(editingAutomation.name || '');
      setDescription(editingAutomation.description || '');
      setButtonIcon(editingAutomation.button_icon || 'Sparkles');
      setButtonLabel(editingAutomation.button_label || '');
      setTriggerType(editingAutomation.trigger_type || 'CARD_MOVED');
      setTriggerConfig(editingAutomation.trigger_config || {});
      setConditions(editingAutomation.conditions || []);
      setActions(
        (editingAutomation.actions || []).map((a: any, i: number) => ({
          id: a.id || `act-${i}-${Date.now()}`,
          type: a.type,
          params: a.params || {},
        })),
      );
    } else if (initialTemplate) {
      setType(initialTemplate.type || 'RULE');
      setName(initialTemplate.name || '');
      setDescription(initialTemplate.description || '');
      setButtonIcon(initialTemplate.button_icon || 'Sparkles');
      setButtonLabel(initialTemplate.button_label || initialTemplate.name || '');
      setTriggerType(initialTemplate.trigger_type || 'CARD_MOVED');
      setTriggerConfig(initialTemplate.trigger_config || {});
      setConditions(initialTemplate.conditions || []);
      setActions(
        (initialTemplate.actions || []).map((a: any, i: number) => ({
          id: `act-${i}-${Date.now()}`,
          type: a.type,
          params: a.params || {},
        })),
      );
    } else {
      setType(initialType);
      setName('');
      setDescription('');
      setButtonIcon('Sparkles');
      setButtonLabel('');
      setConditions([]);
      setActions([]);

      // Set default triggers based on type
      if (initialType === 'RULE') {
        setTriggerType('CARD_MOVED');
        setTriggerConfig({});
      } else if (initialType === 'SCHEDULED') {
        setTriggerType('SCHEDULED');
        setTriggerConfig({ frequency: 'daily', time: '09:00' });
      } else if (initialType === 'DUE_DATE') {
        setTriggerType('DUE_DATE_APPROACHING');
        setTriggerConfig({ offset_days: 1, direction: 'before' });
      } else if (initialType === 'CARD_BUTTON') {
        setTriggerType('CARD_BUTTON_CLICKED');
        setTriggerConfig({});
      } else if (initialType === 'BOARD_BUTTON') {
        setTriggerType('BOARD_BUTTON_CLICKED');
        setTriggerConfig({});
      }
    }
  }, [editingAutomation, initialTemplate, initialType, isOpen]);

  if (!isOpen) return null;

  // Handle Action adding
  const handleAddAction = (actionType: string) => {
    const newAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: actionType,
      params: getDefaultParamsForAction(actionType),
    };
    setActions((prev) => [...prev, newAction]);
  };

  const getDefaultParamsForAction = (actionType: string) => {
    switch (actionType) {
      case 'MOVE_CARD':
        return { targetListId: boardLists[0]?.id || '', position: 'bottom' };
      case 'ADD_LABEL':
      case 'REMOVE_LABEL':
        return { labelId: boardLabels[0]?.id || '' };
      case 'ASSIGN_MEMBER':
        return { memberId: 'current_user' };
      case 'REMOVE_MEMBER':
        return { memberId: boardMembers[0]?.user?.id || '' };
      case 'SET_DUE_DATE':
        return { preset: '+1_day' };
      case 'ADD_COMMENT':
        return { content: 'Đã cập nhật tự động bởi {{actor.name}} vào {{date}}' };
      case 'SEND_NOTIFICATION':
        return {
          title: 'Thông báo tự động',
          message: 'Quy tắc "{{card.title}}" vừa được thực thi.',
        };
      case 'SORT_LIST':
        return { listId: boardLists[0]?.id || '', sortBy: 'due_date' };
      default:
        return {};
    }
  };

  const handleUpdateActionParams = (id: string, newParams: Record<string, any>) => {
    setActions((prev) =>
      prev.map((act) => (act.id === id ? { ...act, params: { ...act.params, ...newParams } } : act)),
    );
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  // Handle Condition adding
  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      { field: 'is_completed', operator: 'equals', value: false },
    ]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateCondition = (idx: number, patch: any) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
  };

  // Insert Variable into action comment / notification
  const handleInsertVariable = (actionId: string, paramKey: string, variable: string) => {
    const act = actions.find((a) => a.id === actionId);
    if (!act) return;
    const currentText = act.params[paramKey] || '';
    handleUpdateActionParams(actionId, {
      [paramKey]: currentText + (currentText.endsWith(' ') ? '' : ' ') + variable,
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên cho quy tắc tự động hóa');
      return;
    }

    if (actions.length === 0) {
      setErrorMessage('Vui lòng thêm ít nhất một hành động (Action) để thực thi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        button_icon: ['CARD_BUTTON', 'BOARD_BUTTON'].includes(type) ? buttonIcon : undefined,
        button_label: ['CARD_BUTTON', 'BOARD_BUTTON'].includes(type)
          ? buttonLabel.trim() || name.trim()
          : undefined,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        conditions,
        actions: actions.map((a) => ({ type: a.type, params: a.params })),
      };

      if (editingAutomation) {
        await apiClient(`/automations/${editingAutomation.id}`, {
          method: 'PATCH',
          data: payload,
        });
      } else {
        await apiClient(`/boards/${boardId}/automations`, {
          method: 'POST',
          data: payload,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu quy tắc tự động hóa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-sky-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {editingAutomation ? 'Chỉnh sửa Tự động hóa' : 'Trình tạo Tự động hóa (Automation Builder)'}
              </h2>
              <p className="text-xs text-slate-500">
                Thiết lập quy tắc, lịch trình và nút thao tác thông minh cho bảng
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Chọn loại Tự động hóa */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Loại tự động hóa
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'RULE', label: 'Quy tắc (Rule)', icon: Zap, desc: 'Theo sự kiện' },
                { id: 'SCHEDULED', label: 'Lịch trình', icon: Clock, desc: 'Định kỳ' },
                { id: 'DUE_DATE', label: 'Hạn chót', icon: Calendar, desc: 'Theo ngày hạn' },
                { id: 'CARD_BUTTON', label: 'Nút trên Thẻ', icon: CheckCircle, desc: 'Bấm trên thẻ' },
                { id: 'BOARD_BUTTON', label: 'Nút trên Bảng', icon: Layers, desc: 'Bấm trên bảng' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setType(item.id);
                      if (item.id === 'RULE') setTriggerType('CARD_MOVED');
                      else if (item.id === 'SCHEDULED') setTriggerType('SCHEDULED');
                      else if (item.id === 'DUE_DATE') setTriggerType('DUE_DATE_APPROACHING');
                      else if (item.id === 'CARD_BUTTON') setTriggerType('CARD_BUTTON_CLICKED');
                      else if (item.id === 'BOARD_BUTTON') setTriggerType('BOARD_BUTTON_CLICKED');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 text-amber-900 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold leading-tight block">{item.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Thông tin chung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Tên tự động hóa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Đánh dấu hoàn thành khi chuyển sang Đã xong"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Mô tả (tùy chọn)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục đích hoạt động..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Cấu hình Nút (nếu là CARD_BUTTON hoặc BOARD_BUTTON) */}
          {['CARD_BUTTON', 'BOARD_BUTTON'].includes(type) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Cấu hình hiển thị Nút bấm</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                    Nhãn hiển thị trên nút
                  </label>
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    placeholder={name || 'Tên nút...'}
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                    Biểu tượng nút
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_ICONS.map((ic) => {
                      const Icon = ic.icon;
                      const isSel = buttonIcon === ic.name;
                      return (
                        <button
                          key={ic.name}
                          type="button"
                          onClick={() => setButtonIcon(ic.name)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={ic.label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. BƯỚC 1: KHI (Trigger) */}
          <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                KHI (Trigger) — Điều kiện bắt đầu
              </h3>
            </div>

            {/* RULE TRIGGER */}
            {type === 'RULE' && (
              <div className="space-y-3 pl-7">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Sự kiện
                    </label>
                    <select
                      value={triggerType}
                      onChange={(e) => {
                        setTriggerType(e.target.value);
                        setTriggerConfig({});
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="CARD_MOVED">Thẻ được di chuyển</option>
                      <option value="CARD_CREATED">Thẻ mới được tạo</option>
                      <option value="CARD_COMPLETED">Thẻ được hoàn thành</option>
                      <option value="CARD_DUE_DATE_CHANGED">Ngày hết hạn thay đổi</option>
                      <option value="CHECKLIST_COMPLETED">Xong tất cả Checklist</option>
                    </select>
                  </div>

                  {triggerType === 'CARD_MOVED' && (
                    <>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                          Từ danh sách
                        </label>
                        <select
                          value={triggerConfig.source_list_id || ''}
                          onChange={(e) =>
                            setTriggerConfig((prev) => ({
                              ...prev,
                              source_list_id: e.target.value || undefined,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">(Bất kỳ danh sách nào)</option>
                          {boardLists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                          Đến danh sách
                        </label>
                        <select
                          value={triggerConfig.destination_list_id || ''}
                          onChange={(e) =>
                            setTriggerConfig((prev) => ({
                              ...prev,
                              destination_list_id: e.target.value || undefined,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">(Bất kỳ danh sách nào)</option>
                          {boardLists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {triggerType === 'CARD_CREATED' && (
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Trong danh sách
                      </label>
                      <select
                        value={triggerConfig.list_id || ''}
                        onChange={(e) =>
                          setTriggerConfig((prev) => ({
                            ...prev,
                            list_id: e.target.value || undefined,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">(Bất kỳ danh sách nào)</option>
                        {boardLists.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCHEDULED TRIGGER */}
            {type === 'SCHEDULED' && (
              <div className="space-y-3 pl-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Tần suất chạy
                    </label>
                    <select
                      value={triggerConfig.frequency || 'daily'}
                      onChange={(e) =>
                        setTriggerConfig((prev) => ({ ...prev, frequency: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="daily">Hàng ngày</option>
                      <option value="weekly">Hàng tuần</option>
                      <option value="monthly">Hàng tháng</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Giờ chạy (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={triggerConfig.time || '09:00'}
                      onChange={(e) =>
                        setTriggerConfig((prev) => ({ ...prev, time: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DUE DATE TRIGGER */}
            {type === 'DUE_DATE' && (
              <div className="space-y-3 pl-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Thời điểm kích hoạt
                    </label>
                    <select
                      value={`${triggerConfig.offset_days || 1}_${triggerConfig.direction || 'before'}`}
                      onChange={(e) => {
                        const [days, dir] = e.target.value.split('_');
                        setTriggerConfig({ offset_days: Number(days), direction: dir });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="1_before">Trước hạn 1 ngày</option>
                      <option value="2_before">Trước hạn 2 ngày</option>
                      <option value="3_before">Trước hạn 3 ngày</option>
                      <option value="0_on">Vào đúng ngày đến hạn</option>
                      <option value="1_after">Sau hạn 1 ngày (Quá hạn)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* BUTTON TRIGGERS */}
            {type === 'CARD_BUTTON' && (
              <div className="pl-7 text-xs text-slate-600">
                ⚡ Kích hoạt ngay khi thành viên nhấn vào nút <span className="font-semibold text-slate-900">"{buttonLabel || name || 'Tên nút'}"</span> trên màn hình chi tiết Thẻ.
              </div>
            )}

            {type === 'BOARD_BUTTON' && (
              <div className="pl-7 text-xs text-slate-600">
                ⚡ Kích hoạt ngay khi thành viên nhấn vào nút <span className="font-semibold text-slate-900">"{buttonLabel || name || 'Tên nút'}"</span> trên thanh công cụ Bảng.
              </div>
            )}
          </div>

          {/* 4. BƯỚC 2: NẾU (Conditions - Tùy chọn) */}
          <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-200/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  NẾU (Conditions) — Bộ lọc điều kiện (Tùy chọn)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddCondition}
                className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm điều kiện</span>
              </button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-7">
                Chưa có điều kiện nào. Quy tắc sẽ chạy trên mọi thẻ thỏa mãn sự kiện.
              </p>
            ) : (
              <div className="space-y-2 pl-7">
                {conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs"
                  >
                    <select
                      value={cond.field}
                      onChange={(e) =>
                        handleUpdateCondition(idx, {
                          field: e.target.value,
                          value: e.target.value === 'is_completed' ? false : '',
                        })
                      }
                      className="px-2.5 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                    >
                      <option value="is_completed">Trạng thái hoàn thành</option>
                      <option value="list_id">Thuộc danh sách</option>
                      <option value="has_label">Có nhãn</option>
                    </select>

                    {cond.field === 'is_completed' && (
                      <select
                        value={String(cond.value)}
                        onChange={(e) =>
                          handleUpdateCondition(idx, { value: e.target.value === 'true' })
                        }
                        className="px-2.5 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                      >
                        <option value="false">Chưa hoàn thành</option>
                        <option value="true">Đã hoàn thành</option>
                      </select>
                    )}

                    {cond.field === 'list_id' && (
                      <select
                        value={cond.value}
                        onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                        className="px-2.5 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                      >
                        <option value="">(Chọn danh sách)</option>
                        {boardLists.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    )}

                    {cond.field === 'has_label' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={cond.value || ''}
                          onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                          className="px-2.5 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                        >
                          <option value="">-- Chọn nhãn lọc --</option>
                          {labels.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                        {cond.value && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                            style={{
                              backgroundColor:
                                labels.find((l) => l.id === cond.value)?.color || '#64748b',
                            }}
                          >
                            {labels.find((l) => l.id === cond.value)?.name || 'Nhãn'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCreateTarget({ type: 'condition', idOrIdx: idx });
                            setIsQuickCreateOpen(true);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-1"
                          title="Tạo nhanh nhãn mới"
                        >
                          <PlusCircle className="w-3 h-3" />
                          Tạo mới
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. BƯỚC 3: THÌ THỰC HIỆN (Actions) */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  THÌ THỰC HIỆN (Actions) — Chuỗi hành động tự động
                </h3>
              </div>
            </div>

            {/* Actions List */}
            {actions.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-emerald-300/60 rounded-xl bg-white/50 space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  Chưa có hành động nào được thêm vào quy tắc.
                </p>
                <p className="text-[11px] text-slate-400">
                  Hãy chọn một hành động bên dưới để bắt đầu chuỗi tự động hóa.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pl-7">
                {actions.map((act, index) => (
                  <div
                    key={act.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {getActionTitle(act.type)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(act.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa hành động này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Action Form specific controls */}
                    <div className="space-y-2 pt-1 text-xs">
                      {act.type === 'MOVE_CARD' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 block mb-1">
                              Danh sách đích
                            </label>
                            <select
                              value={act.params.targetListId || ''}
                              onChange={(e) =>
                                handleUpdateActionParams(act.id, { targetListId: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                            >
                              {boardLists.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 block mb-1">
                              Vị trí trong danh sách
                            </label>
                            <select
                              value={act.params.position || 'bottom'}
                              onChange={(e) =>
                                handleUpdateActionParams(act.id, { position: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                            >
                              <option value="top">Đầu danh sách</option>
                              <option value="bottom">Cuối danh sách</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {act.type === 'SET_DUE_DATE' && (
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-1">
                            Hạn chót mới
                          </label>
                          <select
                            value={act.params.preset || '+1_day'}
                            onChange={(e) =>
                              handleUpdateActionParams(act.id, { preset: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                          >
                            <option value="today">Hôm nay (23:59)</option>
                            <option value="+1_day">Ngày mai (+1 ngày)</option>
                            <option value="+3_days">Trong 3 ngày tới (+3 ngày)</option>
                            <option value="+7_days">Trong 1 tuần tới (+7 ngày)</option>
                          </select>
                        </div>
                      )}

                      {(act.type === 'ADD_LABEL' || act.type === 'REMOVE_LABEL') && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-medium text-slate-600 block">
                              Chọn nhãn {act.type === 'ADD_LABEL' ? 'để gắn vào thẻ' : 'cần gỡ khỏi thẻ'}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickCreateTarget({ type: 'action', idOrIdx: act.id });
                                setIsQuickCreateOpen(true);
                              }}
                              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="w-3 h-3" />
                              Tạo nhãn mới
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={act.params.labelId || ''}
                              onChange={(e) =>
                                handleUpdateActionParams(act.id, { labelId: e.target.value })
                              }
                              className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                            >
                              <option value="">-- Chọn nhãn thao tác --</option>
                              {labels.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>

                            {act.params.labelId && (
                              <span
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white shrink-0 shadow-xs"
                                style={{
                                  backgroundColor:
                                    labels.find((l) => l.id === act.params.labelId)?.color || '#64748b',
                                }}
                              >
                                {labels.find((l) => l.id === act.params.labelId)?.name || 'Nhãn'}
                              </span>
                            )}
                          </div>

                          {labels.length === 0 && (
                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 space-y-2">
                              <div className="flex items-start gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-amber-900">Bảng này hiện chưa có nhãn nào sẵn!</p>
                                  <p className="text-[11px] text-amber-700 leading-relaxed">
                                    Nhãn là thuộc tính của bảng công việc, cần có sẵn từ trước để bộ lọc và hành động tự động có thể chọn.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleSeedDefaultLabels}
                                  disabled={isSeedingLabels}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  {isSeedingLabels ? 'Đang tạo...' : '⚡ Tạo 6 nhãn mẫu tự động'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickCreateTarget({ type: 'action', idOrIdx: act.id });
                                    setIsQuickCreateOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                                >
                                  + Tự tạo nhãn riêng
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {act.type === 'ASSIGN_MEMBER' && (
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-1">
                            Thành viên gán vào
                          </label>
                          <select
                            value={act.params.memberId || 'current_user'}
                            onChange={(e) =>
                              handleUpdateActionParams(act.id, { memberId: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                          >
                            <option value="current_user">Người thực hiện thao tác (CurrentUser)</option>
                            {boardMembers.map((m) => (
                              <option key={m.id} value={m.user?.id}>
                                {m.user?.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {act.type === 'ADD_COMMENT' && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-600 block">
                            Nội dung bình luận
                          </label>
                          <textarea
                            value={act.params.content || ''}
                            onChange={(e) =>
                              handleUpdateActionParams(act.id, { content: e.target.value })
                            }
                            rows={2}
                            placeholder="Nhập nội dung bình luận..."
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                          />
                          {/* Biến động Variable Pills */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-slate-400 mr-1">Chèn biến:</span>
                            {['{{card.title}}', '{{actor.name}}', '{{date}}', '{{time}}', '{{list.name}}'].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => handleInsertVariable(act.id, 'content', v)}
                                className="px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-mono border border-amber-200 transition-colors cursor-pointer"
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {act.type === 'SEND_NOTIFICATION' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 block mb-1">
                              Tiêu đề thông báo
                            </label>
                            <input
                              type="text"
                              value={act.params.title || ''}
                              onChange={(e) =>
                                handleUpdateActionParams(act.id, { title: e.target.value })
                              }
                              placeholder="Tiêu đề thông báo..."
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 block mb-1">
                              Nội dung thông báo
                            </label>
                            <textarea
                              value={act.params.message || ''}
                              onChange={(e) =>
                                handleUpdateActionParams(act.id, { message: e.target.value })
                              }
                              rows={2}
                              placeholder="Nội dung thông báo..."
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
                            />
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-[10px] text-slate-400 mr-1">Chèn biến:</span>
                              {['{{card.title}}', '{{actor.name}}', '{{date}}'].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => handleInsertVariable(act.id, 'message', v)}
                                  className="px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-mono border border-amber-200 transition-colors cursor-pointer"
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Action Selector Grid */}
            <div className="pt-2 border-t border-emerald-200/40">
              <span className="text-[11px] font-bold text-slate-600 block mb-2 pl-7">
                + Thêm hành động vào chuỗi:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pl-7">
                {[
                  { type: 'MOVE_CARD', label: 'Di chuyển thẻ' },
                  { type: 'MARK_COMPLETED', label: 'Đánh dấu hoàn thành' },
                  { type: 'MARK_INCOMPLETE', label: 'Mở lại thẻ' },
                  { type: 'SET_DUE_DATE', label: 'Đặt hạn chót' },
                  { type: 'ADD_LABEL', label: 'Thêm nhãn' },
                  { type: 'REMOVE_LABEL', label: 'Gỡ nhãn' },
                  { type: 'ASSIGN_MEMBER', label: 'Gán thành viên' },
                  { type: 'ADD_COMMENT', label: 'Thêm bình luận' },
                  { type: 'ARCHIVE_CARD', label: 'Lưu trữ thẻ' },
                  { type: 'SEND_NOTIFICATION', label: 'Gửi thông báo' },
                  { type: 'SORT_LIST', label: 'Sắp xếp danh sách' },
                  { type: 'ARCHIVE_ALL_COMPLETED', label: 'Dọn dẹp bảng' },
                ].map((actBtn) => (
                  <button
                    key={actBtn.type}
                    type="button"
                    onClick={() => handleAddAction(actBtn.type)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 text-[11px] font-medium transition-colors text-left flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <PlusCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{actBtn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{editingAutomation ? 'Cập nhật Tự động hóa' : 'Tạo Tự động hóa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Create Label Modal */}
      {isQuickCreateOpen && (
        <div className="fixed inset-0 z-80 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Tạo nhãn mới cho bảng</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsQuickCreateOpen(false);
                  setQuickCreateTarget(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Tên nhãn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khẩn cấp, Frontend, Bug..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNewLabel();
                    }
                  }}
                  autoFocus
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Màu sắc</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    '#ef4444',
                    '#f97316',
                    '#f59e0b',
                    '#10b981',
                    '#06b6d4',
                    '#3b82f6',
                    '#6366f1',
                    '#8b5cf6',
                    '#ec4899',
                    '#64748b',
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-lg transition-transform cursor-pointer ${
                        newLabelColor === color
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2">
                <span className="text-[11px] text-slate-500 block mb-1">Xem trước:</span>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: newLabelColor }}
                >
                  {newLabelName.trim() || 'Tên nhãn hiển thị'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsQuickCreateOpen(false);
                  setQuickCreateTarget(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateNewLabel}
                disabled={!newLabelName.trim() || isSubmittingLabel}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingLabel ? 'Đang tạo...' : 'Tạo và Chọn ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getActionTitle(type: string): string {
  switch (type) {
    case 'MOVE_CARD':
      return 'Di chuyển thẻ tới danh sách';
    case 'MARK_COMPLETED':
      return 'Đánh dấu hoàn thành';
    case 'MARK_INCOMPLETE':
      return 'Mở lại (bỏ hoàn thành)';
    case 'SET_DUE_DATE':
      return 'Đặt ngày hết hạn';
    case 'ADD_LABEL':
      return 'Gắn nhãn vào thẻ';
    case 'REMOVE_LABEL':
      return 'Gỡ nhãn khỏi thẻ';
    case 'ASSIGN_MEMBER':
      return 'Gán thành viên phụ trách';
    case 'REMOVE_MEMBER':
      return 'Gỡ thành viên khỏi thẻ';
    case 'ADD_COMMENT':
      return 'Đăng bình luận tự động';
    case 'ARCHIVE_CARD':
      return 'Lưu trữ thẻ';
    case 'SEND_NOTIFICATION':
      return 'Gửi thông báo hệ thống';
    case 'SORT_LIST':
      return 'Sắp xếp các thẻ trong danh sách';
    case 'ARCHIVE_ALL_COMPLETED':
      return 'Lưu trữ tất cả các thẻ đã xong';
    default:
      return type;
  }
}
