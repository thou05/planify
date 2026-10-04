'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FolderPlus,
  Layers,
  ArrowRight,
  Info,
  Check,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import * as XLSX from 'xlsx';

interface ImportBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentBoardId?: string;
  currentBoardTitle?: string;
  onSuccess?: (newBoardId?: string) => void;
}

interface ValidationSummary {
  boardName?: string;
  description?: string;
  totalLists?: number;
  listsCount?: number;
  totalCards?: number;
  cardsCount?: number;
  totalLabels?: number;
  labelsCount?: number;
  totalChecklists?: number;
  checklistsCount?: number;
}

export default function ImportBoardModal({
  isOpen,
  onClose,
  workspaceId,
  currentBoardId,
  currentBoardTitle,
  onSuccess,
}: ImportBoardModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<{
    valid?: boolean;
    isValid?: boolean;
    summary: ValidationSummary;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const [destination, setDestination] = useState<'new' | 'existing'>(
    currentBoardId ? 'existing' : 'new'
  );
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'replace' | 'create_new'>('skip');

  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showWarnings, setShowWarnings] = useState(false);

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setValidationResult(null);
    setDestination(currentBoardId ? 'existing' : 'new');
    setNewBoardTitle('');
    setDuplicateStrategy('skip');
    setIsValidating(false);
    setIsImporting(false);
    setErrorMsg('');
    setShowWarnings(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset modal state every time the modal is opened or closed
  React.useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, currentBoardId]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    processFile(droppedFile);
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setErrorMsg('');
    setValidationResult(null);
    setParsedData(null);
    setIsValidating(true);

    try {
      const fileName = uploadedFile.name.toLowerCase();
      let rawData: any = null;

      if (fileName.endsWith('.json')) {
        const text = await uploadedFile.text();
        rawData = JSON.parse(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        rawData = parseExcelWorkbook(workbook, XLSX);
      } else {
        throw new Error('Vui lòng chọn tệp định dạng JSON (.json) hoặc Excel (.xlsx)');
      }

      setParsedData(rawData);

      // Validate with backend
      const res = await apiClient(`/workspaces/${workspaceId}/validate-import`, {
        method: 'POST',
        data: { rawData },
      });

      if (res.data) {
        setValidationResult(res.data);
        const detectedName =
          res.data.summary?.boardName ||
          rawData.board?.name ||
          rawData.name ||
          uploadedFile.name.replace(/\.[^/.]+$/, '');
        setNewBoardTitle(`${detectedName} (Imported)`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đọc hoặc phân tích cú pháp tệp');
    } finally {
      setIsValidating(false);
    }
  };

  const parseExcelWorkbook = (workbook: any, xlsxLib: any): any => {
    const sheetNames: string[] = workbook.SheetNames || [];
    const result: any = {
      board: {},
      lists: [],
      labels: [],
    };

    // Helper to find a value from row by checking exact then lowercase keys with precedence
    const findRowVal = (row: any, keywords: string[]): any => {
      if (!row || typeof row !== 'object') return undefined;
      const keys = Object.keys(row);
      // 1. Try exact match first
      for (const kw of keywords) {
        const exactKey = keys.find((k) => k.toLowerCase().trim() === kw.toLowerCase().trim());
        if (exactKey && row[exactKey] !== undefined && row[exactKey] !== null && String(row[exactKey]).trim() !== '') {
          return row[exactKey];
        }
      }
      // 2. Try prefix/contains match in order of keywords precedence
      for (const kw of keywords) {
        const matchedKey = keys.find((k) => k.toLowerCase().includes(kw.toLowerCase()));
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
          return row[matchedKey];
        }
      }
      return undefined;
    };

    // 1. Board Info sheet
    const infoSheetName = sheetNames.find(
      (s) => s.toLowerCase().includes('info') || s.toLowerCase().includes('thông tin'),
    );
    if (infoSheetName) {
      const sheet = workbook.Sheets[infoSheetName];
      const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
      rows.forEach((row) => {
        const prop = String(findRowVal(row, ['thuộc tính (property)', 'thuộc tính', 'property', 'key']) || '').toLowerCase();
        const val = findRowVal(row, ['giá trị (value)', 'giá trị', 'value', 'val']);
        if (prop.includes('tên') || prop.includes('name')) result.board.name = val;
        if (prop.includes('mô tả') || prop.includes('description') || prop.includes('desc')) result.board.description = val;
      });
    }

    // 2. Labels sheet
    const labelSheetName = sheetNames.find(
      (s) => s.toLowerCase().includes('label') || s.toLowerCase().includes('nhãn'),
    );
    if (labelSheetName) {
      const sheet = workbook.Sheets[labelSheetName];
      const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
      result.labels = rows
        .map((r) => {
          const name = findRowVal(r, ['tên nhãn (label name)', 'tên nhãn', 'label name', 'name', 'nhãn']);
          const color = findRowVal(r, ['màu sắc (color)', 'màu sắc', 'màu', 'color']);
          return name ? { name: String(name).trim(), color: color || '#3b82f6' } : null;
        })
        .filter(Boolean);
    }

    // 3. Checklists mapping helper
    const cardChecklistsMap: Record<string, any[]> = {};
    const checklistSheetName = sheetNames.find(
      (s) => s.toLowerCase().includes('checklist') || s.toLowerCase().includes('việc cần làm'),
    );
    if (checklistSheetName) {
      const sheet = workbook.Sheets[checklistSheetName];
      const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
      rows.forEach((r) => {
        const cardTitle = String(
          findRowVal(r, ['tên thẻ (card title)', 'tên thẻ', 'card title', 'tiêu đề thẻ', 'thẻ', 'card', 'title']) || ''
        ).trim();
        const checkTitle = String(
          findRowVal(r, ['tiêu đề checklist', 'checklist title', 'checklist', 'tiêu đề', 'title']) || 'Checklist'
        ).trim();
        const itemContent = String(
          findRowVal(r, ['nội dung mục (item)', 'nội dung mục', 'item content', 'nội dung', 'mục', 'item', 'content']) || ''
        ).trim();
        const isDoneVal = String(
          findRowVal(r, ['đã xong (is done)', 'đã xong', 'is done', 'hoàn thành', 'completed', 'done', 'trạng thái']) || ''
        ).toLowerCase();
        const isDone =
          isDoneVal === 'true' ||
          isDoneVal === 'có' ||
          isDoneVal === 'yes' ||
          isDoneVal === '1' ||
          isDoneVal.includes('xong');

        if (!cardTitle) return;

        const normKey = cardTitle.toLowerCase().trim();
        if (!cardChecklistsMap[normKey]) {
          cardChecklistsMap[normKey] = [];
        }

        let cl = cardChecklistsMap[normKey].find((c) => c.title === checkTitle);
        if (!cl) {
          cl = { title: checkTitle, items: [] };
          cardChecklistsMap[normKey].push(cl);
        }

        if (itemContent) {
          cl.items.push({ content: itemContent, is_completed: isDone });
        }
      });
    }

    // 4. Lists & Cards sheet (skip info/label/checklist sheets)
    const listCardsSheetName =
      sheetNames.find(
        (s) =>
          !s.toLowerCase().includes('info') &&
          !s.toLowerCase().includes('thông tin') &&
          !s.toLowerCase().includes('label') &&
          !s.toLowerCase().includes('nhãn') &&
          !s.toLowerCase().includes('checklist') &&
          !s.toLowerCase().includes('việc cần làm') &&
          (s.toLowerCase().includes('card') ||
            s.toLowerCase().includes('thẻ') ||
            s.toLowerCase().includes('list') ||
            s.toLowerCase().includes('danh sách') ||
            s.toLowerCase().includes('task') ||
            s.toLowerCase().includes('công việc')),
      ) ||
      sheetNames.find(
        (s) =>
          !s.toLowerCase().includes('info') &&
          !s.toLowerCase().includes('thông tin') &&
          !s.toLowerCase().includes('label') &&
          !s.toLowerCase().includes('nhãn') &&
          !s.toLowerCase().includes('checklist') &&
          !s.toLowerCase().includes('việc cần làm'),
      ) ||
      sheetNames[0];

    if (listCardsSheetName) {
      const sheet = workbook.Sheets[listCardsSheetName];
      const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
      const listsMap: Record<string, any[]> = {};
      let currentListName = 'Cần làm';

      rows.forEach((r) => {
        const rowList = findRowVal(r, ['danh sách (list)', 'danh sách', 'list name', 'list', 'cột', 'status', 'trạng thái']);
        if (rowList && String(rowList).trim()) {
          currentListName = String(rowList).trim();
        }
        const listName = currentListName;

        const cardTitle = String(
          findRowVal(r, [
            'tiêu đề thẻ (title)',
            'tiêu đề thẻ',
            'card title',
            'tên thẻ',
            'tiêu đề',
            'tên công việc',
            'nhiệm vụ',
            'task',
            'title',
            'card',
          ]) || ''
        ).trim();

        if (!cardTitle) return;

        if (!listsMap[listName]) {
          listsMap[listName] = [];
        }

        const labelsVal = findRowVal(r, ['nhãn (labels)', 'nhãn', 'labels', 'label', 'tag', 'tags']);
        let labels: string[] = [];
        if (Array.isArray(labelsVal)) {
          labels = labelsVal.map((l: any) => String(l.name || l).trim()).filter(Boolean);
        } else if (typeof labelsVal === 'string' && labelsVal.trim()) {
          labels = labelsVal.split(',').map((s) => s.trim()).filter(Boolean);
        }

        const isCompletedVal = String(
          findRowVal(r, ['hoàn thành (completed)', 'hoàn thành', 'completed', 'due completed', 'done', 'đã xong', 'trạng thái hoàn thành']) || ''
        ).toLowerCase();
        const isCompleted =
          isCompletedVal === 'true' ||
          isCompletedVal.includes('xong') ||
          isCompletedVal === 'yes' ||
          isCompletedVal === 'có' ||
          isCompletedVal === '1';

        const description = String(
          findRowVal(r, ['mô tả (description)', 'mô tả', 'description', 'desc', 'nội dung', 'chi tiết', 'ghi chú', 'note']) || ''
        ).trim();

        const rawStart = findRowVal(r, ['ngày bắt đầu (start date)', 'ngày bắt đầu', 'start date', 'start_date', 'start']);
        const rawDue = findRowVal(r, ['hạn chót (due date)', 'hạn chót', 'due date', 'due_date', 'due', 'deadline', 'hạn']);

        const normKey = cardTitle.toLowerCase().trim();
        let checklists = cardChecklistsMap[normKey] ? [...cardChecklistsMap[normKey]] : [];

        // Check if there are checklists in an in-row column (e.g. multiline checklist)
        const rowChecklistText = String(findRowVal(r, ['tiến độ checklist', 'checklist', 'việc cần làm', 'công việc con']) || '').trim();
        if (checklists.length === 0 && rowChecklistText && !rowChecklistText.includes('%')) {
          const lines = rowChecklistText.split(/[\r\n;]+/).map((s) => s.trim()).filter(Boolean);
          if (lines.length > 0) {
            checklists.push({
              title: 'Checklist',
              items: lines.map((line) => {
                const isItemDone = line.startsWith('[x]') || line.startsWith('[X]');
                const cleanContent = line.replace(/^\[[ xX]\]\s*/, '').trim();
                return {
                  content: cleanContent || line,
                  is_completed: isItemDone,
                };
              }),
            });
          }
        }

        const cardObj: any = {
          title: cardTitle,
          description: description || undefined,
          start_date: rawStart || undefined,
          due_date: rawDue || undefined,
          is_completed: isCompleted,
          labels,
          checklists: checklists.length > 0 ? checklists : undefined,
        };

        listsMap[listName].push(cardObj);
      });

      result.lists = Object.keys(listsMap).map((name) => ({
        name,
        cards: listsMap[name],
      }));
    }

    return result;
  };

  const handleExecuteImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    setErrorMsg('');

    try {
      if (destination === 'new') {
        const payload = {
          data: parsedData,
          targetBoardName: newBoardTitle.trim() || undefined,
        };

        const res = await apiClient(`/workspaces/${workspaceId}/import-board`, {
          method: 'POST',
          data: payload,
        });

        if (res.data) {
          onClose();
          const targetId = res.data.id || res.data.boardId;
          onSuccess?.(targetId);
        }
      } else {
        const targetBoardId = currentBoardId;
        if (!targetBoardId) {
          throw new Error('Không tìm thấy Board đích để nhập dữ liệu');
        }

        const payload = {
          data: parsedData,
          duplicateStrategy,
        };

        const res = await apiClient(`/boards/${targetBoardId}/import-data`, {
          method: 'POST',
          data: payload,
        });

        if (res.data) {
          onClose();
          onSuccess?.(targetBoardId);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi nhập dữ liệu');
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParsedData(null);
    setValidationResult(null);
    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isFileValid = Boolean(validationResult && (validationResult.isValid ?? validationResult.valid));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-300 p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[90vh]">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Nhập dữ liệu (Import)</h2>
            <p className="text-xs text-slate-500">Nhập danh sách & thẻ từ tệp JSON hoặc Excel (.xlsx)</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Step 1: Upload or Drop file */}
          {!file && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-300 hover:border-slate-800 rounded-lg p-7 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/60 hover:bg-slate-50 transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mb-3 group-hover:bg-slate-200 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">
                Kéo thả tệp vào đây hoặc nhấn để duyệt
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <FileJson className="w-3.5 h-3.5 text-amber-600" /> JSON (.json)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xlsx)
                </span>
              </div>
            </div>
          )}

          {/* Loading validation */}
          {isValidating && (
            <div className="p-8 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-slate-800" />
              <div className="text-xs font-semibold text-slate-700">Đang kiểm tra và phân tích tệp...</div>
            </div>
          )}

          {/* Step 2: File parsed & validated preview */}
          {file && !isValidating && validationResult && (
            <div className="space-y-4 animate-fade-in">
              {/* File details card */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                    {file.name.endsWith('.json') ? (
                      <FileJson className="w-4 h-4 text-amber-600" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">{file.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                >
                  Chọn tệp khác
                </button>
              </div>

              {/* Validation Status */}
              {isFileValid ? (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-900">Tệp hợp lệ để nhập</div>
                    <div className="text-[11px] text-emerald-700">
                      Cấu trúc dữ liệu chuẩn, sẵn sàng tạo danh sách và thẻ.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-rose-900">Tệp có lỗi cấu trúc</div>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-700">
                      {(validationResult.errors || []).map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Warnings if any */}
              {validationResult.warnings && validationResult.warnings.length > 0 && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{validationResult.warnings.length} cảnh báo trong dữ liệu</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWarnings(!showWarnings)}
                      className="text-[10px] font-bold text-amber-800 underline cursor-pointer"
                    >
                      {showWarnings ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                    </button>
                  </div>
                  {showWarnings && (
                    <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-800/90 pt-1">
                      {validationResult.warnings.slice(0, 10).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Preview Stats */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">Xem trước nội dung (Preview)</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-md bg-white border border-slate-200">
                    <div className="text-base font-bold text-slate-900">
                      {validationResult.summary?.totalLists ?? validationResult.summary?.listsCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">Danh sách</div>
                  </div>
                  <div className="p-2 rounded-md bg-white border border-slate-200">
                    <div className="text-base font-bold text-slate-900">
                      {validationResult.summary?.totalCards ?? validationResult.summary?.cardsCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">Thẻ</div>
                  </div>
                  <div className="p-2 rounded-md bg-white border border-slate-200">
                    <div className="text-base font-bold text-slate-900">
                      {validationResult.summary?.totalLabels ?? validationResult.summary?.labelsCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">Nhãn</div>
                  </div>
                  <div className="p-2 rounded-md bg-white border border-slate-200">
                    <div className="text-base font-bold text-slate-900">
                      {validationResult.summary?.totalChecklists ?? validationResult.summary?.checklistsCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">Checklist</div>
                  </div>
                </div>
              </div>

              {/* Step 3: Destination selection */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Chọn vị trí nhập dữ liệu (Destination)
                </label>

                <div className="space-y-2">
                  {/* Option 1: New Board */}
                  <div
                    onClick={() => setDestination('new')}
                    className={`p-3 rounded-md border transition-all cursor-pointer ${
                      destination === 'new'
                        ? 'bg-white border-slate-800 ring-1 ring-slate-800'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="destination"
                        checked={destination === 'new'}
                        onChange={() => setDestination('new')}
                        className="text-slate-900 focus:ring-slate-900"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FolderPlus className="w-3.5 h-3.5 text-slate-700" />
                          <span>Tạo Bảng mới (New Board)</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Tạo bảng riêng biệt chứa toàn bộ dữ liệu tệp nhập
                        </div>
                      </div>
                    </div>

                    {destination === 'new' && (
                      <div className="mt-3 pl-6">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tên Bảng mới:
                        </label>
                        <input
                          type="text"
                          value={newBoardTitle}
                          onChange={(e) => setNewBoardTitle(e.target.value)}
                          placeholder="Nhập tên bảng..."
                          className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Option 2: Existing Board (if in a board) */}
                  {currentBoardId && (
                    <div
                      onClick={() => setDestination('existing')}
                      className={`p-3 rounded-md border transition-all cursor-pointer ${
                        destination === 'existing'
                          ? 'bg-white border-slate-800 ring-1 ring-slate-800'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="destination"
                          checked={destination === 'existing'}
                          onChange={() => setDestination('existing')}
                          className="text-slate-900 focus:ring-slate-900"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-700" />
                            <span>Nhập vào Bảng hiện tại ({currentBoardTitle || 'Board'})</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Thêm các danh sách và thẻ vào bảng đang mở
                          </div>
                        </div>
                      </div>

                      {destination === 'existing' && (
                        <div className="mt-3 pl-6 space-y-2 border-t border-slate-200 pt-2.5">
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                            Xử lý thẻ trùng tên trong cùng danh sách:
                          </label>
                          <div className="space-y-1.5 text-[11px] text-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="duplicateStrategy"
                                value="skip"
                                checked={duplicateStrategy === 'skip'}
                                onChange={() => setDuplicateStrategy('skip')}
                                className="text-slate-900 focus:ring-slate-900"
                              />
                              <span>Bỏ qua thẻ trùng lặp (Skip)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="duplicateStrategy"
                                value="replace"
                                checked={duplicateStrategy === 'replace'}
                                onChange={() => setDuplicateStrategy('replace')}
                                className="text-slate-900 focus:ring-slate-900"
                              />
                              <span>Cập nhật/Ghi đè mô tả & checklist (Replace)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="duplicateStrategy"
                                value="create_new"
                                checked={duplicateStrategy === 'create_new'}
                                onChange={() => setDuplicateStrategy('create_new')}
                                className="text-slate-900 focus:ring-slate-900"
                              />
                              <span>Tạo thẻ mới trùng tên (Create new)</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 mt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            Hủy
          </button>

          {file && validationResult && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || !isFileValid}
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>
                {destination === 'new' ? 'Tạo Bảng & Nhập dữ liệu' : 'Bắt đầu Nhập dữ liệu'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
