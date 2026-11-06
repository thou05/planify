/**
 * Theme & Color Utilities for Planify
 * Supports Dark Mode, Dynamic CSS Variable Injection, and WCAG AA Contrast.
 */

import { isValidHex, normalizeHex } from './color-utils';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  color: string; // Hex color code
  description?: string;
}

export interface DerivedThemePalette {
  primary: string;           // Base hex (e.g. #f28d8d)
  primaryHover: string;      // ~8% darker
  primaryDark: string;       // ~15% darker
  primaryLight: string;      // Light tint / translucent background
  primaryRgb: string;        // "r, g, b"
  contrastText: string;      // '#ffffff' or '#0f172a' according to WCAG AA
}

export const THEME_MODE_STORAGE_KEY = 'planify:theme-mode';
export const PRIMARY_COLOR_STORAGE_KEY = 'planify:primary-color';
export const DEFAULT_PRIMARY_COLOR = '#f28d8d';

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'coral', name: 'Classic Coral', color: '#f28d8d', description: 'Màu san hô cổ điển đặc trưng của Planify' },
  { id: 'ocean', name: 'Ocean Blue', color: '#3b82f6', description: 'Xanh đại dương công nghệ, tập trung' },
  { id: 'emerald', name: 'Emerald Forest', color: '#10b981', description: 'Xanh ngọc lục bảo tươi mát, cân bằng' },
  { id: 'amber', name: 'Sunset Amber', color: '#f59e0b', description: 'Vàng cam hoàng hôn năng động, sáng tạo' },
  { id: 'violet', name: 'Royal Violet', color: '#8b5cf6', description: 'Tím hoàng gia tinh tế, hiện đại' },
  { id: 'crimson', name: 'Midnight Crimson', color: '#e11d48', description: 'Đỏ thắm rực rỡ, quyết đoán' },
  { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4', description: 'Xanh lơ tương lai, thanh thoát' },
  { id: 'rose', name: 'Fuchsia Pink', color: '#ec4899', description: 'Hồng Fuchsia trẻ trung, nổi bật' },
  { id: 'indigo', name: 'Deep Indigo', color: '#6366f1', description: 'Chàm sâu lắng, tập trung cao độ' },
  { id: 'teal', name: 'Teal Mint', color: '#14b8a6', description: 'Xanh bạc hà dịu mắt, sảng khoái' },
];

/** Check if hex color is valid */
export function isValidHexColor(hex: string): boolean {
  return isValidHex(hex);
}

/** Parse hex color to RGB */
export function hexToRgb(hexColor: string): { r: number; g: number; b: number } | null {
  if (!isValidHex(hexColor)) return null;
  const hex = normalizeHex(hexColor).replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/** Convert RGB to Hex */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adjust brightness by percentage (-100 to 100)
 * Negative = darker, Positive = lighter
 */
export function adjustBrightness(hexColor: string, percent: number): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;

  const factor = percent / 100;
  let r: number, g: number, b: number;

  if (factor > 0) {
    // Lighten towards white
    r = rgb.r + (255 - rgb.r) * factor;
    g = rgb.g + (255 - rgb.g) * factor;
    b = rgb.b + (255 - rgb.b) * factor;
  } else {
    // Darken towards black
    const darkFactor = 1 + factor;
    r = rgb.r * darkFactor;
    g = rgb.g * darkFactor;
    b = rgb.b * darkFactor;
  }

  return rgbToHex(r, g, b);
}

/**
 * Calculate WCAG relative luminance contrast text color
 */
export function getContrastTextColor(hexColor: string): '#0f172a' | '#ffffff' {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#ffffff';

  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const luminance = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}

/**
 * Generate full derived palette from a primary hex code
 */
export function generateColorPalette(primaryHex: string): DerivedThemePalette {
  const cleanHex = isValidHex(primaryHex) ? normalizeHex(primaryHex) : DEFAULT_PRIMARY_COLOR;
  const rgb = hexToRgb(cleanHex) || { r: 242, g: 141, b: 141 };

  const primaryHover = adjustBrightness(cleanHex, -8);
  const primaryDark = adjustBrightness(cleanHex, -16);
  const primaryLight = adjustBrightness(cleanHex, 88);
  const contrastText = getContrastTextColor(cleanHex);

  return {
    primary: cleanHex,
    primaryHover,
    primaryDark,
    primaryLight,
    primaryRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    contrastText,
  };
}

/**
 * Apply theme and color variables to DOM
 */
export function applyThemeToDom(resolvedTheme: ResolvedTheme, palette: DerivedThemePalette): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 1. Toggle dark class
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // 2. Set color tokens
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-primary-hover', palette.primaryHover);
  root.style.setProperty('--color-primary-dark', palette.primaryDark);
  root.style.setProperty('--color-primary-light', palette.primaryLight);
  root.style.setProperty('--color-primary-rgb', palette.primaryRgb);
  root.style.setProperty('--color-primary-contrast', palette.contrastText);

  // Sync brand legacy tokens for components using --color-brand
  root.style.setProperty('--color-brand', palette.primary);
  root.style.setProperty('--color-brand-hover', palette.primaryHover);
  root.style.setProperty('--color-brand-dark', palette.primaryDark);
  root.style.setProperty('--color-brand-light', palette.primaryLight);
}
