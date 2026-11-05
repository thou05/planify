'use client';

/**
 * AppDialog — thay thế window.confirm / window.alert / window.prompt bằng popup trong giao diện.
 *
 * Cách dùng (imperative, trả về Promise):
 *   import { confirmDialog, alertDialog, promptDialog } from '@/components/ui/AppDialog';
 *
 *   if (!(await confirmDialog({ title: 'Xóa thẻ', message: 'Bạn có chắc muốn xóa?', variant: 'danger' }))) return;
 *   await alertDialog({ message: 'Không thể lưu', variant: 'error' });
 *   const name = await promptDialog({ title: 'Đổi tên', defaultValue: 'abc' }); // string | null
 *
 * <AppDialogHost /> được mount một lần ở root layout.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Trash2, X, XCircle, HelpCircle } from 'lucide-react';

export type DialogVariant = 'default' | 'danger' | 'warning' | 'info' | 'success' | 'error';

interface BaseOptions {
  title?: string;
  message?: React.ReactNode;
  variant?: DialogVariant;
}

export interface ConfirmOptions extends BaseOptions {
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions extends BaseOptions {
  okText?: string;
}

export interface PromptOptions extends BaseOptions {
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  multiline?: boolean;
}

type DialogRequest =
  | { id: number; kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { id: number; kind: 'alert'; options: AlertOptions; resolve: (v: void) => void }
  | { id: number; kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void };

type Listener = (queue: DialogRequest[]) => void;

let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(queue));
}

function push(req: DialogRequest) {
  queue = [...queue, req];
  emit();
}

function remove(id: number) {
  queue = queue.filter((q) => q.id !== id);
  emit();
}

const normalize = <T extends BaseOptions>(input: T | string): T =>
  (typeof input === 'string' ? ({ message: input } as T) : input);

export function confirmDialog(input: ConfirmOptions | string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    push({ id: nextId++, kind: 'confirm', options: normalize(input), resolve });
  });
}

export function alertDialog(input: AlertOptions | string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    push({ id: nextId++, kind: 'alert', options: normalize(input), resolve });
  });
}

export function promptDialog(input: PromptOptions | string): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    push({ id: nextId++, kind: 'prompt', options: normalize(input), resolve });
  });
}

const VARIANT_STYLES: Record<
  DialogVariant,
  { icon: React.ElementType; iconWrap: string; button: string }
> = {
  default: {
    icon: HelpCircle,
    iconWrap: 'bg-[#ffc0cb]/30 text-[#d86969]',
    button: 'bg-[#f28d8d] hover:bg-[#e57a7a] focus-visible:ring-[#f28d8d]/40',
  },
  danger: {
    icon: Trash2,
    iconWrap: 'bg-red-50 text-red-600',
    button: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-300',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-50 text-amber-600',
    button: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-300',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-sky-50 text-sky-600',
    button: 'bg-[#f28d8d] hover:bg-[#e57a7a] focus-visible:ring-[#f28d8d]/40',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-50 text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300',
  },
  error: {
    icon: XCircle,
    iconWrap: 'bg-red-50 text-red-600',
    button: 'bg-[#f28d8d] hover:bg-[#e57a7a] focus-visible:ring-[#f28d8d]/40',
  },
};

const DEFAULT_TITLES: Record<DialogRequest['kind'], Partial<Record<DialogVariant, string>> & { _: string }> = {
  confirm: { _: 'Xác nhận', danger: 'Xác nhận xóa', warning: 'Cảnh báo' },
  alert: { _: 'Thông báo', error: 'Đã xảy ra lỗi', success: 'Thành công', warning: 'Cảnh báo' },
  prompt: { _: 'Nhập thông tin' },
};

function DialogView({ req }: { req: DialogRequest }) {
  const variant: DialogVariant =
    req.options.variant || (req.kind === 'alert' ? 'info' : 'default');
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;
  const title = req.options.title || DEFAULT_TITLES[req.kind][variant] || DEFAULT_TITLES[req.kind]._;

  const [value, setValue] = useState(req.kind === 'prompt' ? req.options.defaultValue ?? '' : '');
  const primaryRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const close = (result: 'ok' | 'cancel') => {
    remove(req.id);
    if (req.kind === 'confirm') req.resolve(result === 'ok');
    else if (req.kind === 'alert') req.resolve();
    else req.resolve(result === 'ok' ? value : null);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (req.kind === 'prompt') {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        primaryRef.current?.focus();
      }
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close('cancel');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.id, value]);

  const primaryText =
    req.kind === 'alert'
      ? req.options.okText || 'Đã hiểu'
      : req.options.confirmText || (variant === 'danger' ? 'Xóa' : 'Xác nhận');
  const cancelText = req.kind !== 'alert' ? req.options.cancelText || 'Hủy' : null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close('cancel');
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`app-dialog-title-${req.id}`}
        className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4 flex gap-3.5 relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.iconWrap}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5 pr-5">
            <h3 id={`app-dialog-title-${req.id}`} className="text-sm font-bold text-slate-900">
              {title}
            </h3>
            {req.options.message && (
              <div className="mt-1.5 text-[13px] leading-relaxed text-slate-600 whitespace-pre-line break-words">
                {req.options.message}
              </div>
            )}
            {req.kind === 'prompt' && (
              <form
                className="mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  close('ok');
                }}
              >
                {req.options.multiline ? (
                  <textarea
                    ref={inputRef}
                    rows={3}
                    value={value}
                    placeholder={req.options.placeholder}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  />
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    placeholder={req.options.placeholder}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  />
                )}
              </form>
            )}
          </div>
          <button
            type="button"
            onClick={() => close('cancel')}
            className="absolute top-3.5 right-3.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          {cancelText && (
            <button
              type="button"
              onClick={() => close('cancel')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={() => close('ok')}
            className={`px-4 py-1.5 text-xs font-semibold text-white rounded-md transition-colors cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 ${style.button}`}
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppDialogHost() {
  const [items, setItems] = useState<DialogRequest[]>(queue);

  useEffect(() => {
    const l: Listener = (q) => setItems(q);
    listeners.add(l);
    setItems(queue);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (items.length === 0) return null;
  // Hiển thị dialog đầu tiên trong hàng đợi (tuần tự như native dialog)
  return <DialogView key={items[0].id} req={items[0]} />;
}

