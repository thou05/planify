'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlignLeft,
  Hash,
  CheckSquare,
  SlidersHorizontal,
  Loader2,
  Star,
  Percent,
  DollarSign,
  ListFilter,
  AlertTriangle,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export type CustomFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'CURRENCY'
  | 'RATING'
  | 'PERCENT'
  | 'CHECKBOX'
  | 'DROPDOWN';

export interface CustomField {
  id: string;
  board_id: string;
  name: string;
  field_type: CustomFieldType;
  options?: string[];
}

interface CustomFieldsModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  onFieldsChange?: () => void;
}

export const FIELD_TYPE_CONFIG: Record<
  CustomFieldType,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeBg: string;
    iconColor: string;
  }
> = {
  TEXT: {
    label: 'Văn bản ngắn',
    description: 'Mã vé, tên đối tác, phiên bản hoặc ghi chú 1 dòng',
    icon: AlignLeft,
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
  },
  NUMBER: {
    label: 'Con số',
    description: 'Story Points, số giờ ước lượng, số lượng sản phẩm',
    icon: Hash,
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  CURRENCY: {
    label: 'Tiền tệ / Ngân sách',
    description: 'Giá trị hợp đồng, ngân sách, chi phí (₫ / $)',
    icon: DollarSign,
    badgeBg: 'bg-green-50 text-green-700 border-green-200',
    iconColor: 'text-green-600',
  },
  RATING: {
    label: 'Đánh giá sao ⭐',
    description: 'Mức độ ưu tiên, độ khó hoặc chấm điểm từ 1 đến 5 sao',
    icon: Star,
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'text-amber-500',
  },
  PERCENT: {
    label: 'Tiến độ %',
    description: 'Phần trăm hoàn thành công việc từ 0% đến 100%',
    icon: Percent,
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconColor: 'text-cyan-600',
  },
  CHECKBOX: {
    label: 'Hộp kiểm (Đúng/Sai)',
    description: 'Trạng thái boolean: Đã kiểm thử QA, Đã duyệt, Khẩn cấp',
    icon: CheckSquare,
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    iconColor: 'text-rose-600',
  },
  DROPDOWN: {
    label: 'Danh sách chọn (Dropdown)',
    description: 'Chọn 1 giá trị trong danh mục định sẵn (Môi trường, Phân loại...)',
    icon: ListFilter,
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    iconColor: 'text-orange-600',
  },
};

const DROPDOWN_PRESETS: { title: string; options: string[] }[] = [
  { title: 'Môi trường', options: ['Development', 'Staging', 'Production'] },
  { title: 'Phê duyệt', options: ['Chờ duyệt', 'Đã duyệt', 'Cần sửa đổi', 'Từ chối'] },
  { title: 'Mức độ ưu tiên', options: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'] },
  { title: 'Kênh triển khai', options: ['Facebook Ads', 'Google Ads', 'SEO/Blog', 'Email', 'Tiktok'] },
];

export default function CustomFieldsModal({
  boardId,
  isOpen,
  onClose,
  onFieldsChange,
}: CustomFieldsModalProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form create state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>(['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3']);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Inline rename state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState('');

  // Options edit drawer/state for existing field
  const [managingOptionsFieldId, setManagingOptionsFieldId] = useState<string | null>(null);
  const [managingOptionsList, setManagingOptionsList] = useState<string[]>([]);
  const [managingNewOptionInput, setManagingNewOptionInput] = useState('');
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  // Delete confirm dialog
  const [deletingField, setDeletingField] = useState<CustomField | null>(null);

  useEffect(() => {
    if (isOpen && boardId) {
      fetchCustomFields();
      setErrorMsg(null);
      setEditingFieldId(null);
      setManagingOptionsFieldId(null);
    }
  }, [isOpen, boardId]);

  const fetchCustomFields = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<CustomField[]>(`/boards/${boardId}/custom-fields`);
      if (res.success && Array.isArray(res.data)) {
        setFields(res.data);
      } else {
        setFields([]);
      }
    } catch {
      setErrorMsg('Không thể tải danh sách trường tùy chỉnh');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOptionToNewField = () => {
    const val = newOptionInput.trim();
    if (!val) return;
    if (newFieldOptions.includes(val)) {
      setErrorMsg(`Tùy chọn "${val}" đã tồn tại`);
      return;
    }
    setNewFieldOptions((prev) => [...prev, val]);
    setNewOptionInput('');
  };

  const handleRemoveOptionFromNewField = (indexToRemove: number) => {
    setNewFieldOptions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateField = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newFieldName.trim();
    if (!cleanName || isSubmitting) return;

    // Check duplicate name locally
    if (fields.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg(`Trường "${cleanName}" đã tồn tại trong bảng này`);
      return;
    }

    if (newFieldType === 'DROPDOWN' && newFieldOptions.length === 0) {
      setErrorMsg('Trường danh sách chọn (Dropdown) cần có ít nhất 1 tùy chọn');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await apiClient<CustomField>(`/boards/${boardId}/custom-fields`, {
        method: 'POST',
        data: {
          name: cleanName,
          field_type: newFieldType,
          options: newFieldType === 'DROPDOWN' ? newFieldOptions : undefined,
        },
      });

      if (res.success && res.data) {
        setFields((prev) => [...prev, res.data]);
        setNewFieldName('');
        setNewFieldType('TEXT');
        setNewFieldOptions(['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3']);
        setNewOptionInput('');
        onFieldsChange?.();
      } else {
        setErrorMsg(res.error || res.message || 'Không thể tạo trường tùy chỉnh');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo trường tùy chỉnh');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRename = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditingFieldName(field.name);
  };

  const handleSaveRename = async (fieldId: string) => {
    const cleanName = editingFieldName.trim();
    if (!cleanName) {
      setEditingFieldId(null);
      return;
    }

    // Check duplicate
    if (fields.some((f) => f.id !== fieldId && f.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg(`Tên trường "${cleanName}" đã được sử dụng`);
      return;
    }

    try {
      setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, name: cleanName } : f)));
      setEditingFieldId(null);
      await apiClient(`/custom-fields/${fieldId}`, {
        method: 'PATCH',
        data: { name: cleanName },
      });
      onFieldsChange?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật tên trường');
      fetchCustomFields();
    }
  };

  // Managing existing field's dropdown options
  const handleStartManageOptions = (field: CustomField) => {
    setManagingOptionsFieldId(field.id);
    const existingOpts = field.options && field.options.length > 0
      ? [...field.options]
      : ['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3'];
    setManagingOptionsList(existingOpts);
    setManagingNewOptionInput('');
  };

  const handleAddManagingOption = () => {
    const val = managingNewOptionInput.trim();
    if (!val) return;
    if (managingOptionsList.includes(val)) {
      setErrorMsg(`Tùy chọn "${val}" đã có trong danh sách`);
      return;
    }
    setManagingOptionsList((prev) => [...prev, val]);
    setManagingNewOptionInput('');
  };

  const handleRemoveManagingOption = (indexToRemove: number) => {
    setManagingOptionsList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveManagingOptions = async (fieldId: string) => {
    if (isSavingOptions) return;
    const cleanList = managingOptionsList.map((o) => o.trim()).filter(Boolean);
    if (cleanList.length === 0) {
      setErrorMsg('Danh sách phải có ít nhất 1 tùy chọn');
      return;
    }

    try {
      setIsSavingOptions(true);
      setErrorMsg(null);
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, options: cleanList } : f))
      );
      setManagingOptionsFieldId(null);

      await apiClient(`/custom-fields/${fieldId}`, {
        method: 'PATCH',
        data: { options: cleanList },
      });
      onFieldsChange?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu danh sách tùy chọn');
      fetchCustomFields();
    } finally {
      setIsSavingOptions(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingField) return;
    const fieldId = deletingField.id;

    try {
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      setDeletingField(null);
      await apiClient(`/custom-fields/${fieldId}`, {
        method: 'DELETE',
      });
      onFieldsChange?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xóa trường tùy chỉnh');
      fetchCustomFields();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Trường tùy chỉnh</h2>
              <p className="text-xs text-slate-500">
                Tự định nghĩa các trường dữ liệu theo nhu cầu riêng của bảng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Section 1: Existing Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Các trường hiện có ({fields.length})
              </span>
            </div>

            {isLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải các trường...</span>
              </div>
            ) : fields.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <p className="text-xs text-slate-500">
                  Bảng này chưa có trường tùy chỉnh nào. Thêm trường mới bên dưới để bắt đầu!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {fields.map((f) => {
                  const cfg = FIELD_TYPE_CONFIG[f.field_type] || {
                    label: f.field_type,
                    icon: AlignLeft,
                    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const Icon = cfg.icon;
                  const isRenaming = editingFieldId === f.id;
                  const isManagingOptions = managingOptionsFieldId === f.id;

                  return (
                    <div
                      key={f.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0">
                            <Icon className="w-4 h-4" />
                          </span>

                          {isRenaming ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingFieldName}
                                onChange={(e) => setEditingFieldName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(f.id);
                                  if (e.key === 'Escape') setEditingFieldId(null);
                                }}
                                autoFocus
                                className="px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(f.id)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                                title="Lưu"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFieldId(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {f.name}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${cfg.badgeBg}`}
                          >
                            {cfg.label}
                          </span>

                          {!isRenaming && (
                            <div className="flex items-center gap-1">
                              {f.field_type === 'DROPDOWN' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    isManagingOptions
                                      ? setManagingOptionsFieldId(null)
                                      : handleStartManageOptions(f)
                                  }
                                  className={`p-1.5 rounded-md transition-colors cursor-pointer border flex items-center gap-1 text-[11px] font-semibold ${
                                    isManagingOptions
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                                  }`}
                                  title="Chỉnh sửa danh sách tùy chọn lựa chọn"
                                >
                                  <Settings2 className="w-3.5 h-3.5" />
                                  <span>Tùy chọn ({f.options?.length || 3})</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleStartRename(f)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                title="Đổi tên trường"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingField(f)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                title="Xóa trường này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Options Sub-editor for this field */}
                      {isManagingOptions && (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Chỉnh sửa các tùy chọn cho &quot;{f.name}&quot;
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (Thẻ sẽ hiển thị danh sách này khi chọn)
                            </span>
                          </div>

                          {/* Existing chips */}
                          <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                            {managingOptionsList.map((opt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                              >
                                <span>{opt}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManagingOption(idx)}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Xóa tùy chọn này"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            {managingOptionsList.length === 0 && (
                              <span className="text-xs text-rose-500 italic">
                                Chưa có tùy chọn nào. Vui lòng thêm ít nhất 1 mục bên dưới.
                              </span>
                            )}
                          </div>

                          {/* Add option input */}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={managingNewOptionInput}
                              onChange={(e) => setManagingNewOptionInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddManagingOption();
                                }
                              }}
                              placeholder="Nhập tên tùy chọn mới..."
                              className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                            />
                            <button
                              type="button"
                              onClick={handleAddManagingOption}
                              disabled={!managingNewOptionInput.trim()}
                              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              + Thêm
                            </button>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setManagingOptionsFieldId(null)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveManagingOptions(f.id)}
                              disabled={isSavingOptions || managingOptionsList.length === 0}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {isSavingOptions ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Lưu tùy chọn</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Create New Field Form */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
              + Tạo trường mới
            </span>

            <form onSubmit={handleCreateField} className="space-y-4">
              {/* Field Name Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tên trường tùy chỉnh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Ví dụ: Môi trường, Trạng thái QC, Story Points, Ngân sách..."
                  maxLength={100}
                  className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl text-slate-900 font-medium transition-all"
                />
              </div>

              {/* Field Type Selection (7 Types) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Chọn loại dữ liệu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(FIELD_TYPE_CONFIG) as CustomFieldType[]).map((typeKey) => {
                    const item = FIELD_TYPE_CONFIG[typeKey];
                    const Icon = item.icon;
                    const isSelected = newFieldType === typeKey;

                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setNewFieldType(typeKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isSelected
                              ? 'bg-white/15 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-bold block truncate ${
                                isSelected ? 'text-white' : 'text-slate-800'
                              }`}
                            >
                              {item.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </div>
                          <span
                            className={`text-[11px] block line-clamp-1 mt-0.5 ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Option Builder when DROPDOWN is selected */}
              {newFieldType === 'DROPDOWN' && (
                <div className="p-3.5 bg-orange-50/60 border border-orange-200/80 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ListFilter className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-950">
                        Cấu hình các tùy chọn cho Dropdown ({newFieldOptions.length})
                      </span>
                    </div>
                    <span className="text-[11px] text-orange-700">Tối thiểu 1 mục</span>
                  </div>

                  {/* Option Badges */}
                  <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-white rounded-lg border border-orange-200/60">
                    {newFieldOptions.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-900 text-xs font-semibold rounded-md border border-orange-200"
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionFromNewField(idx)}
                          className="text-orange-600 hover:text-orange-950 cursor-pointer"
                          title="Xóa mục này"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {newFieldOptions.length === 0 && (
                      <span className="text-xs text-slate-400 italic">
                        Chưa có tùy chọn nào. Nhập bên dưới và bấm Thêm!
                      </span>
                    )}
                  </div>

                  {/* Add option input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOptionToNewField();
                        }
                      }}
                      placeholder="Nhập tên tùy chọn mới (ví dụ: Staging, Khẩn cấp...)"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddOptionToNewField}
                      disabled={!newOptionInput.trim()}
                      className="px-3.5 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      + Thêm
                    </button>
                  </div>

                  {/* Fast presets */}
                  <div className="pt-2 border-t border-orange-200/60 space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-900">
                      <Sparkles className="w-3 h-3 text-orange-600" />
                      <span>Áp dụng nhanh danh mục mẫu:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DROPDOWN_PRESETS.map((preset) => (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setNewFieldOptions([...preset.options]);
                            if (!newFieldName.trim()) {
                              setNewFieldName(preset.title);
                            }
                          }}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white hover:bg-orange-100 text-orange-800 border border-orange-200 transition-colors cursor-pointer"
                        >
                          {preset.title} ({preset.options.length})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!newFieldName.trim() || isSubmitting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Tạo trường tùy chỉnh</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingField && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xóa trường tùy chỉnh?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toàn bộ giá trị của trường &quot;{deletingField.name}&quot; trên tất cả thẻ sẽ bị xóa vĩnh viễn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingField(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
