'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  Check,
  Loader2,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react';

interface ExportBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
}

export default function ExportBoardModal({
  isOpen,
  onClose,
  boardId,
  boardTitle,
}: ExportBoardModalProps) {
  const [format, setFormat] = useState<'json' | 'xlsx'>('json');
  const [includeCards, setIncludeCards] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [includeChecklists, setIncludeChecklists] = useState(true);
  const [includeMembers, setIncludeMembers] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('planify_token') : '';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const params = new URLSearchParams({
        format,
        includeCards: String(includeCards),
        includeLabels: String(includeLabels),
        includeChecklists: String(includeChecklists),
        includeMembers: String(includeMembers),
      });

      const response = await fetch(`${apiUrl}/boards/${boardId}/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Xuất dữ liệu thất bại');
      }

      const sanitizedName = (boardTitle || 'board').replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_');

      if (format === 'xlsx') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planify_export_${sanitizedName}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planify_export_${sanitizedName}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi xuất dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/25 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-strong border border-white/80 rounded-3xl p-6 sm:p-8 relative shadow-2xl overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/40 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2b1572]">Xuất dữ liệu Bảng</h2>
            <p className="text-xs text-[#2b1572]/70">
              Bảng: <span className="font-semibold text-[#2b1572]">{boardTitle}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#c40000]/10 border border-[#c40000]/20 text-[#c40000] text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleExport} className="space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-xs font-bold text-[#2b1572] mb-2">
              Định dạng tệp xuất (Format)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  format === 'json'
                    ? 'bg-[#2b1572] text-white border-[#2b1572] shadow-md shadow-[#2b1572]/20'
                    : 'bg-white/50 border-white/80 text-[#2b1572] hover:bg-white/80'
                }`}
              >
                <FileJson className={`w-6 h-6 shrink-0 ${format === 'json' ? 'text-[#a6d1fd]' : 'text-[#2b1572]'}`} />
                <div>
                  <div className="text-xs font-bold">JSON (.json)</div>
                  <div className={`text-[10px] ${format === 'json' ? 'text-white/70' : 'text-[#2b1572]/60'}`}>
                    Chuẩn sạch, import lại dễ dàng
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  format === 'xlsx'
                    ? 'bg-[#2b1572] text-white border-[#2b1572] shadow-md shadow-[#2b1572]/20'
                    : 'bg-white/50 border-white/80 text-[#2b1572] hover:bg-white/80'
                }`}
              >
                <FileSpreadsheet className={`w-6 h-6 shrink-0 ${format === 'xlsx' ? 'text-emerald-300' : 'text-emerald-600'}`} />
                <div>
                  <div className="text-xs font-bold">Excel (.xlsx)</div>
                  <div className={`text-[10px] ${format === 'xlsx' ? 'text-white/70' : 'text-[#2b1572]/60'}`}>
                    Nhiều Sheet, xem & báo cáo
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-xs font-bold text-[#2b1572] mb-2">
              Dữ liệu muốn bao gồm (Include)
            </label>
            <div className="space-y-2 bg-white/40 border border-white/60 rounded-2xl p-3">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#2b1572] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCards}
                  onChange={(e) => setIncludeCards(e.target.checked)}
                  className="rounded text-[#2b1572] focus:ring-[#2b1572]"
                />
                <span>Danh sách & Thẻ (Lists & Cards)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#2b1572] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLabels}
                  onChange={(e) => setIncludeLabels(e.target.checked)}
                  className="rounded text-[#2b1572] focus:ring-[#2b1572]"
                />
                <span>Nhãn màu (Labels)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#2b1572] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChecklists}
                  onChange={(e) => setIncludeChecklists(e.target.checked)}
                  className="rounded text-[#2b1572] focus:ring-[#2b1572]"
                />
                <span>Checklists & Công việc phụ</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#2b1572] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMembers}
                  onChange={(e) => setIncludeMembers(e.target.checked)}
                  className="rounded text-[#2b1572] focus:ring-[#2b1572]"
                />
                <span>Danh sách thành viên (Members)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2b1572]/70 hover:bg-white/50 cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Tải tệp {format.toUpperCase()}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
