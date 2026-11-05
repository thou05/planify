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
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 p-6 relative overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-[#f28d8d] flex items-center justify-center text-white shadow-2xs">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Xuất dữ liệu Bảng</h2>
            <p className="text-xs text-slate-500">
              Bảng: <span className="font-semibold text-slate-800">{boardTitle}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleExport} className="space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Định dạng tệp xuất (Format)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-md border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  format === 'json'
                    ? 'bg-[#ffc0cb]/25 text-[#d86969] border-[#f28d8d] ring-1 ring-[#f28d8d]/30 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileJson className={`w-5 h-5 shrink-0 ${format === 'json' ? 'text-[#d86969]' : 'text-slate-600'}`} />
                <div>
                  <div className="text-xs font-bold">JSON (.json)</div>
                  <div className={`text-[10px] ${format === 'json' ? 'text-slate-600' : 'text-slate-500'}`}>
                    Chuẩn sạch, import dễ dàng
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3 rounded-md border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  format === 'xlsx'
                    ? 'bg-[#ffc0cb]/25 text-[#d86969] border-[#f28d8d] ring-1 ring-[#f28d8d]/30 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 shrink-0 ${format === 'xlsx' ? 'text-[#d86969]' : 'text-emerald-600'}`} />
                <div>
                  <div className="text-xs font-bold">Excel (.xlsx)</div>
                  <div className={`text-[10px] ${format === 'xlsx' ? 'text-slate-600' : 'text-slate-500'}`}>
                    Xem báo cáo, bảng tính
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Dữ liệu muốn bao gồm (Include)
            </label>
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-md p-3">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCards}
                  onChange={(e) => setIncludeCards(e.target.checked)}
                  className="rounded border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] accent-[#f28d8d]"
                />
                <span>Danh sách & Thẻ (Lists & Cards)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLabels}
                  onChange={(e) => setIncludeLabels(e.target.checked)}
                  className="rounded border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] accent-[#f28d8d]"
                />
                <span>Nhãn màu (Labels)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChecklists}
                  onChange={(e) => setIncludeChecklists(e.target.checked)}
                  className="rounded border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] accent-[#f28d8d]"
                />
                <span>Checklists & Công việc phụ</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMembers}
                  onChange={(e) => setIncludeMembers(e.target.checked)}
                  className="rounded border-slate-300 text-[#f28d8d] focus:ring-[#87ceeb] accent-[#f28d8d]"
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
              className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
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
