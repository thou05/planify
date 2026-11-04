/**
 * Tiện ích chuẩn hóa và xử lý màu sắc
 * Tuân thủ DESIGN.md & DESIGN_SYSTEM.md (Modern Flat SaaS, WCAG AA Contrast)
 */

export interface ColorPreset {
  name: string;
  value: string; // Mã HEX #RRGGBB
}

export interface ColorPaletteCategory {
  id: string;
  label: string;
  colors: ColorPreset[];
}

/** Danh mục bảng màu tuyển chọn theo DESIGN.md */
export const CURATED_PALETTES: ColorPaletteCategory[] = [
  {
    id: 'brand-status',
    label: 'Chủ đạo & Trạng thái',
    colors: [
      { name: 'Coral Rose (Brand Primary)', value: '#f28d8d' },
      { name: 'Soft Pink (Brand Tint)', value: '#ffc0cb' },
      { name: 'Sky Blue (Brand Accent)', value: '#87ceeb' },
      { name: 'Emerald Success', value: '#16a34a' },
      { name: 'Amber Warning', value: '#d97706' },
      { name: 'Rose Danger', value: '#dc2626' },
      { name: 'Midnight Slate', value: '#0f172a' },
      { name: 'Deep Purple', value: '#2b1572' },
    ],
  },
  {
    id: 'cool',
    label: 'Tông lạnh / Kỹ thuật',
    colors: [
      { name: 'Ocean Cyan', value: '#0284c7' },
      { name: 'Indigo Cobalt', value: '#4f46e5' },
      { name: 'Teal Forest', value: '#0d9488' },
      { name: 'Deep Sea', value: '#0369a1' },
      { name: 'Dark Slate', value: '#334155' },
      { name: 'Electric Blue', value: '#2563eb' },
      { name: 'Muted Cyan', value: '#0891b2' },
      { name: 'Midnight Blue', value: '#1e293b' },
    ],
  },
  {
    id: 'warm',
    label: 'Tông ấm / Năng lượng',
    colors: [
      { name: 'Ruby Red', value: '#e11d48' },
      { name: 'Tangerine Orange', value: '#f97316' },
      { name: 'Warm Amber', value: '#f59e0b' },
      { name: 'Terracotta', value: '#c2410c' },
      { name: 'Brick Crimson', value: '#b91c1c' },
      { name: 'Gold Ochre', value: '#d97706' },
      { name: 'Coral Bronze', value: '#78350f' },
      { name: 'Rosewood', value: '#831843' },
    ],
  },
  {
    id: 'pastel',
    label: 'Pastel / Tối giản',
    colors: [
      { name: 'Pastel Rose', value: '#fecdd3' },
      { name: 'Pastel Peach', value: '#fed7aa' },
      { name: 'Pastel Mint', value: '#bbf7d0' },
      { name: 'Pastel Sky', value: '#bae6fd' },
      { name: 'Pastel Lavender', value: '#e9d5ff' },
      { name: 'Pastel Cream', value: '#fef3c7' },
      { name: 'Pastel Sage', value: '#cbd5e1' },
      { name: 'Pastel Slate', value: '#f1f5f9' },
    ],
  },
  {
    id: 'vibrant',
    label: 'Sống động / Nổi bật',
    colors: [
      { name: 'Vivid Violet', value: '#7c3aed' },
      { name: 'Vivid Pink', value: '#ec4899' },
      { name: 'Vivid Lime', value: '#84cc16' },
      { name: 'Vivid Emerald', value: '#10b981' },
      { name: 'Vivid Cyan', value: '#06b6d4' },
      { name: 'Vivid Amber', value: '#eab308' },
      { name: 'Vivid Red', value: '#ef4444' },
      { name: 'Vivid Indigo', value: '#6366f1' },
    ],
  },
];

/** Kiểm tra chuỗi có phải mã HEX hợp lệ (#RGB hoặc #RRGGBB) */
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

/** Tự động chuẩn hóa mã hex (thêm # nếu thiếu, mở rộng 3 ký tự lên 6 ký tự) */
export function normalizeHex(raw: string): string {
  if (!raw) return '#000000';
  let val = raw.trim();
  if (!val.startsWith('#')) val = `#${val}`;
  if (/^#[0-9a-fA-F]{3}$/.test(val)) {
    val = `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`;
  }
  return val.toLowerCase();
}

/**
 * Tính toán độ tương phản (WCAG Relative Luminance)
 * Trả về text '#0f172a' (nếu nền sáng) hoặc '#ffffff' (nếu nền tối)
 */
export function getContrastTextColor(hexColor: string): '#0f172a' | '#ffffff' {
  if (!isValidHex(hexColor)) return '#ffffff';
  const hex = normalizeHex(hexColor).replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}

