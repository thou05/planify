'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Palette,
  Smile,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Kanban,
  Upload,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export interface BoardAppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: {
    id: string;
    name: string;
    background?: string | null;
    icon?: string | null;
  } | null;
  onUpdated: () => void;
}

export const PRESET_GRADIENTS = [
  { id: 'ocean', name: 'Ocean Blue', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { id: 'sunset', name: 'Sunset Glow', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'emerald', name: 'Emerald Fresh', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'purple', name: 'Royal Violet', value: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)' },
  { id: 'midnight', name: 'Midnight Dark', value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  { id: 'aurora', name: 'Aurora Neon', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  { id: 'peach', name: 'Rose Peach', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { id: 'amber', name: 'Golden Hour', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
];

export const PRESET_COLORS = [
  { id: 'slate', name: 'Slate Blue', value: '#334155' },
  { id: 'indigo', name: 'Sky Indigo', value: '#4f46e5' },
  { id: 'forest', name: 'Forest Green', value: '#065f46' },
  { id: 'rose', name: 'Deep Rose', value: '#831843' },
  { id: 'bronze', name: 'Warm Bronze', value: '#78350f' },
  { id: 'clean', name: 'Clean Light', value: '#f8fafc' },
];

export const PRESET_PHOTOS = [
  {
    id: 'mountains',
    name: 'Núi tuyết & Bình minh',
    value: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80',
  },
  {
    id: 'architecture',
    name: 'Kiến trúc tối giản',
    value: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&q=80',
  },
  {
    id: 'ocean-waves',
    name: 'Bãi biển nhiệt đới',
    value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
  },
  {
    id: 'workspace',
    name: 'Không gian làm việc',
    value: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&q=80',
  },
  {
    id: 'forest-fog',
    name: 'Rừng thông sương mù',
    value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80',
  },
  {
    id: 'galaxy',
    name: 'Bầu trời dải ngân hà',
    value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&q=80',
  },
];

export const EMOJI_CATEGORIES = [
  {
    category: 'Phổ biến & Biểu tượng',
    emojis: ['🚀', '🎯', '💡', '✨', '🔥', '💻', '🎨', '📊', '📋', '📌', '⚡', '🏆'],
  },
  {
    category: 'Quản lý & Công việc',
    emojis: ['📁', '🗓️', '⏰', '🛠️', '💼', '📈', '✅', '📝', '🔍', '🏷️', '🧩', '🧭'],
  },
  {
    category: 'Cảm hứng & Phong cách',
    emojis: ['🌟', '🍀', '☕', '🌿', '🪐', '🌈', '💎', '🦄', '🎉', '🎈', '🔮', '🕶️'],
  },
];

export default function BoardAppearanceModal({
  isOpen,
  onClose,
  board,
  onUpdated,
}: BoardAppearanceModalProps) {
  const [activeTab, setActiveTab] = useState<'background' | 'icon'>('background');
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [error, setError] = useState('');

  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (board && isOpen) {
      setSelectedBg(board.background || null);
      setSelectedIcon(board.icon || null);
      setError('');
      setCustomBgUrl(
        board.background && (board.background.startsWith('http') || board.background.startsWith('data:'))
          ? board.background
          : ''
      );
      setCustomEmojiInput('');
    }
  }, [board, isOpen]);

  if (!isOpen || !board) return null;

  const handleSelectGradient = (val: string) => {
    setSelectedBg(val);
    setCustomBgUrl('');
  };

  const handleSelectPhoto = (val: string) => {
    setSelectedBg(val);
    setCustomBgUrl(val);
  };

  const handleCustomUrlApply = () => {
    if (customBgUrl.trim()) {
      setSelectedBg(customBgUrl.trim());
    }
  };

  const handleResetBackground = () => {
    setSelectedBg(null);
    setCustomBgUrl('');
  };

  const handleSelectEmoji = (emoji: string) => {
    setSelectedIcon(emoji);
    setCustomEmojiInput('');
  };

  const handleCustomEmojiApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmojiInput.trim()) {
      setSelectedIcon(customEmojiInput.trim());
    }
  };

  const handleResetIcon = () => {
    setSelectedIcon(null);
    setCustomEmojiInput('');
  };

  const handleUploadBgFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Dung lượng ảnh vượt quá 15MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setIsUploadingBg(true);
    setError('');

    // Xem trước cục bộ ngay tức khắc: Tự động lấy ảnh nền làm Favicon & Biểu tượng
    const objectUrl = URL.createObjectURL(file);
    setSelectedBg(objectUrl);
    setSelectedIcon(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient<{ url: string; icon?: string }>(`/boards/${board.id}/upload-background`, {
        method: 'POST',
        data: formData,
      });

      if (res.success && res.data?.url) {
        setSelectedBg(res.data.url);
        setCustomBgUrl(res.data.url);
        setSelectedIcon(res.data.icon || res.data.url);
        onUpdated();
      } else {
        setError(res.message || 'Không thể tải ảnh lên máy chủ, vui lòng thử lại');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tải ảnh lên từ thiết bị');
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleUploadIconFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh biểu tượng hợp lệ');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh biểu tượng vượt quá 5MB');
      return;
    }

    setIsUploadingIcon(true);
    setError('');

    const objectUrl = URL.createObjectURL(file);
    setSelectedIcon(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient<{ url: string }>(`/boards/${board.id}/upload-icon`, {
        method: 'POST',
        data: formData,
      });

      if (res.success && res.data?.url) {
        setSelectedIcon(res.data.url);
        onUpdated();
      } else {
        setError(res.message || 'Không thể tải biểu tượng lên');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tải ảnh biểu tượng từ thiết bị');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload: { background?: string | null; icon?: string | null } = {
        background: selectedBg ?? null,
        icon: selectedIcon ?? null,
      };

      const res = await apiClient(`/boards/${board.id}`, {
        method: 'PATCH',
        data: payload,
      });

      if (res.success) {
        onUpdated();
        onClose();
      } else {
        setError(res.message || 'Không thể cập nhật diện mạo Board');
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu giao diện');
    } finally {
      setIsLoading(false);
    }
  };

  const isPhoto = Boolean(
    selectedBg &&
      (selectedBg.startsWith('http') || selectedBg.startsWith('data:') || selectedBg.startsWith('blob:'))
  );

  const isIconImage = Boolean(
    selectedIcon &&
      (selectedIcon.startsWith('http') || selectedIcon.startsWith('data:') || selectedIcon.startsWith('blob:'))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f28d8d] flex items-center justify-center text-white shadow-2xs">
              <Palette className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Tùy biến Hình nền & Biểu tượng</h2>
              <p className="text-xs text-slate-500">
                Đổi giao diện Canvas và Favicon hiển thị trên tab trình duyệt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center justify-between">
            <span>Xem trước diện mạo Bảng (Live Preview)</span>
            <span className="text-[10px] text-slate-400 font-normal">Tự động cập nhật thời gian thực</span>
          </div>
          <div
            className="relative h-24 rounded-lg overflow-hidden border border-slate-300 shadow-inner flex flex-col justify-between p-3 transition-all duration-300 bg-dot-pattern"
            style={{
              background: isPhoto ? undefined : selectedBg || undefined,
              backgroundImage: isPhoto ? `url("${selectedBg}")` : undefined,
              backgroundSize: isPhoto ? 'cover' : undefined,
              backgroundPosition: isPhoto ? 'center' : undefined,
            }}
          >
            {/* Header Glass overlay */}
            <div className="flex items-center justify-between bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md shadow-xs border border-white/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0 flex items-center justify-center">
                  {selectedIcon ? (
                    isIconImage ? (
                      <img src={selectedIcon} alt="" className="w-4 h-4 object-contain rounded-xs" />
                    ) : (
                      selectedIcon
                    )
                  ) : (
                    <Kanban className="w-4 h-4 text-[#f28d8d]" />
                  )}
                </span>
                <span className="font-bold text-xs text-slate-900 truncate">
                  {board.name || 'Tên Bảng công việc'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xs flex items-center gap-1">
                <span>Tab:</span>
                {isIconImage ? (
                  <img src={selectedIcon!} alt="" className="w-3.5 h-3.5 object-cover rounded-xs shrink-0" />
                ) : selectedIcon ? (
                  <span>{selectedIcon}</span>
                ) : null}
                <span className="truncate max-w-[130px]">{board.name}</span>
                <span>| Planify</span>
              </span>
            </div>

            {/* Mini Dummy Columns */}
            <div className="flex gap-2">
              <div className="w-16 h-8 rounded-sm bg-white/80 backdrop-blur-xs border border-white/40 shadow-xs flex items-center px-1.5 text-[9px] font-semibold text-slate-600">
                To Do
              </div>
              <div className="w-16 h-8 rounded-sm bg-white/80 backdrop-blur-xs border border-white/40 shadow-xs flex items-center px-1.5 text-[9px] font-semibold text-slate-600">
                In Progress
              </div>
              <div className="w-16 h-8 rounded-sm bg-white/80 backdrop-blur-xs border border-white/40 shadow-xs flex items-center px-1.5 text-[9px] font-semibold text-slate-600">
                Done
              </div>
            </div>
          </div>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'background'
                ? 'border-[#f28d8d] text-[#d86969]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Hình nền Board</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('icon')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'icon'
                ? 'border-[#f28d8d] text-[#d86969]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Biểu tượng & Favicon</span>
            {selectedIcon && !isIconImage && (
              <span className="text-xs ml-0.5">{selectedIcon}</span>
            )}
            {isIconImage && (
              <img src={selectedIcon!} alt="" className="w-3.5 h-3.5 object-contain ml-0.5 rounded-xs" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {activeTab === 'background' ? (
            <>
              {/* 1. Upload from Device Drag & Drop Zone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#f28d8d]" />
                    <span>Tải ảnh từ thiết bị lên</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetBackground}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại mặc định</span>
                  </button>
                </div>

                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadBgFile(file);
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingBg(true);
                  }}
                  onDragLeave={() => setIsDraggingBg(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingBg(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleUploadBgFile(file);
                  }}
                  onClick={() => bgFileInputRef.current?.click()}
                  className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDraggingBg
                      ? 'border-[#f28d8d] bg-[#ffc0cb]/20 scale-101'
                      : 'border-slate-300 hover:border-[#f28d8d] hover:bg-slate-50'
                  }`}
                >
                  {isUploadingBg ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#d86969] py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải ảnh lên máy chủ...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-[#ffc0cb]/30 flex items-center justify-center text-[#d86969]">
                        <Upload className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-bold text-slate-700">
                          Kéo thả ảnh vào đây, hoặc <span className="text-[#d86969] underline">chọn từ thiết bị</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Hỗ trợ PNG, JPG, WEBP, GIF (tối đa 15MB) • Tự động áp dụng làm hình nền & Favicon
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Gradients */}
              <div>
                <label className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dải màu Gradient phong cách</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {PRESET_GRADIENTS.map((g) => {
                    const isSelected = selectedBg === g.value;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGradient(g.value)}
                        className={`group relative h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shadow-xs hover:scale-102 ${
                          isSelected
                            ? 'border-[#d86969] ring-2 ring-[#f28d8d]/50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ background: g.value }}
                        title={g.name}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white drop-shadow-md truncate text-left opacity-90 group-hover:opacity-100">
                          {g.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Photos */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Ảnh nền nghệ thuật chất lượng cao (Unsplash)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
                  {PRESET_PHOTOS.map((p) => {
                    const isSelected = selectedBg === p.value;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPhoto(p.value)}
                        className={`group relative h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shadow-xs hover:scale-102 ${
                          isSelected
                            ? 'border-[#d86969] ring-2 ring-[#f28d8d]/50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{
                          backgroundImage: `url("${p.value}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                        title={p.name}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-semibold text-white drop-shadow-md truncate text-left">
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Colors */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Màu sắc đơn sắc hiện đại
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((c) => {
                    const isSelected = selectedBg === c.value;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectGradient(c.value)}
                        className={`relative h-10 rounded-md border-2 transition-all cursor-pointer shadow-2xs hover:scale-105 flex items-center justify-center ${
                          isSelected
                            ? 'border-[#d86969] ring-2 ring-[#f28d8d]/50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 stroke-[3] ${
                              c.value === '#f8fafc' ? 'text-slate-800' : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Custom Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dán link ảnh tùy chỉnh (Custom Image URL)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/my-wallpaper.jpg..."
                    value={customBgUrl}
                    onChange={(e) => setCustomBgUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  />
                  <button
                    type="button"
                    onClick={handleCustomUrlApply}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Board Icon / Favicon Tab */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Chọn biểu tượng đại diện & Favicon
                  </label>
                  {selectedIcon && (
                    <button
                      type="button"
                      onClick={handleResetIcon}
                      className="text-[11px] font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Gỡ biểu tượng (Dùng mặc định)</span>
                    </button>
                  )}
                </div>

                {/* Upload Custom Favicon / Icon from Device */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#d86969] shrink-0 overflow-hidden shadow-2xs">
                      {isIconImage ? (
                        <img src={selectedIcon!} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Upload className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        Tải ảnh biểu tượng từ thiết bị
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Logo, ảnh nhỏ hoặc icon riêng (PNG, SVG, JPG tối đa 5MB)
                      </div>
                    </div>
                  </div>

                  <input
                    ref={iconFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadIconFile(file);
                    }}
                  />

                  <button
                    type="button"
                    disabled={isUploadingIcon}
                    onClick={() => iconFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5 shrink-0"
                  >
                    {isUploadingIcon ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d86969]" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{isUploadingIcon ? 'Đang tải...' : 'Chọn tệp'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {EMOJI_CATEGORIES.map((cat, cIdx) => (
                    <div key={cIdx} className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {cat.category}
                      </span>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                        {cat.emojis.map((emoji) => {
                          const isSelected = selectedIcon === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleSelectEmoji(emoji)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-120 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#ffc0cb]/40 ring-2 ring-[#f28d8d] scale-110'
                                  : 'hover:bg-slate-100 bg-slate-50 border border-slate-200/60'
                              }`}
                            >
                              <span>{emoji}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Emoji Input */}
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <form onSubmit={handleCustomEmojiApply} className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 shrink-0">
                      Nhập Emoji khác:
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="✨, 🦉, 🏖️..."
                      value={customEmojiInput}
                      onChange={(e) => setCustomEmojiInput(e.target.value)}
                      className="w-24 px-2.5 py-1 text-center text-base bg-white border border-slate-300 rounded-md font-medium text-slate-900 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                    <button
                      type="submit"
                      disabled={!customEmojiInput.trim()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      Chọn
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || isUploadingBg || isUploadingIcon}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isUploadingBg || isUploadingIcon}
              className="px-4 py-2 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu thay đổi diện mạo</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
