# BẢN ĐẶC TẢ THIẾT KẾ KIẾN TRÚC & PHÂN CHIA GÓI CÔNG VIỆC
## Tính Năng: Dark Mode Toàn Diện & Tùy Biến Màu Sắc Toàn Bộ Dashboard (Theme Customizer) — Hệ Thống Planify

> **Mã đặc tả:** `/plans/dark-mode-and-theme-customizer-spec.md`  
> **Kiến trúc sư:** Technical Architect (Antigravity System)  
> **Trạng thái:** Đã thẩm định & Sẵn sàng phân công song song (Zero-Overlap)

---

### 1. Tổng quan & Kiến trúc (Overview & Architecture)

#### 1.1. Mục tiêu tính năng
Cung cấp khả năng tùy biến giao diện toàn diện cho người dùng Planify:
1. **Chế độ hiển thị (Theme Mode):** Hỗ trợ 3 chế độ: **Sáng (Light)**, **Tối (Dark)**, và **Tự động theo hệ điều hành (System Preference)**.
2. **Tùy biến màu sắc thương hiệu cá nhân (Custom Brand & Accent Colors):** Người dùng có thể chọn màu chủ đạo cho các nút bấm (`btn-primary`), icon nổi bật, thanh highlight, badges và active indicators từ bảng màu phối sẵn (Presets) hoặc chọn bất kỳ màu mã HEX nào (Custom Color Picker).
3. **Phản hồi tức thì & Không nhấp nháy (Zero-FOUC & 0ms Live Reactive):** Thay đổi áp dụng ngay lập tức trên DOM mà không cần reload trang; lưu trạng thái vào `localStorage` và tự động áp dụng class `.dark` cùng CSS variables trước khi hydrate để tránh hiện tượng màn hình chớp trắng khi tải lại (Flash of Unstyled Content).

---

#### 1.2. Luồng dữ liệu & Cơ chế hoạt động (Data Flow & Technical Solution)

```
┌────────────────────────────────────────────────────────┐
│                   ThemeContext                         │
│  - themeMode: 'light' | 'dark' | 'system'              │
│  - resolvedTheme: 'light' | 'dark'                     │
│  - primaryColor: '#f28d8d' (Hex code)                  │
└────────────────────────────────────────────────────────┘
          │                                  │
          ▼                                  ▼
┌──────────────────────┐           ┌──────────────────────────────────────┐
│  document.documentElement        │  localStorage Persistence            │
│  - class="dark" (nếu dark)       │  - 'planify:theme-mode'              │
│  - style="--color-primary: ..."  │  - 'planify:primary-color'           │
└──────────────────────┘           └──────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Dynamic Derived Tokens (Tính toán tự động từ mã Hex):                   │
│ --color-primary-hover      (Đậm hơn 8% cho hover)                       │
│ --color-primary-dark       (Đậm hơn 15% cho border/active)              │
│ --color-primary-light      (Tint nhạt 90-95% cho nền badge/active pill) │
│ --color-primary-rgb        ("r, g, b" cho hàm rgba())                   │
│ --color-primary-contrast   ('#ffffff' hoặc '#0f172a' theo WCAG AA)      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Giao diện kết nối (Shared Contracts & Types)

Các Workstream sẽ dùng chung các interface sau tại `frontend/lib/theme-context.tsx` và `frontend/lib/theme-utils.ts`:

#### 2.1. Type Definitions & Palette Models
```typescript
// frontend/lib/theme-utils.ts

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  color: string; // Mã HEX
  description?: string;
}

export interface DerivedThemePalette {
  primary: string;           // Mã HEX gốc (vd: #3b82f6)
  primaryHover: string;      // Đậm hơn 8% cho trạng thái hover
  primaryDark: string;       // Đậm hơn 15% cho border và shadow
  primaryLight: string;      // Sắc độ nhạt (tint) cho nền mềm
  primaryRgb: string;        // "r, g, b" để dùng với rgba(var(--color-primary-rgb), alpha)
  contrastText: string;      // #ffffff hoặc #0f172a bảo đảm WCAG AA
}

// Bảng màu Presets được phối sẵn đẹp mắt theo phong cách Flat SaaS
export const THEME_PRESETS: ThemePreset[] = [
  { id: 'coral', name: 'Classic Coral', color: '#f28d8d', description: 'Màu san hô cổ điển đặc trưng của Planify' },
  { id: 'ocean', name: 'Ocean Blue', color: '#3b82f6', description: 'Xanh đại dương công nghệ, tập trung' },
  { id: 'emerald', name: 'Emerald Forest', color: '#10b981', description: 'Xanh ngọc lục bảo tươi mát, cân bằng' },
  { id: 'amber', name: 'Sunset Amber', color: '#f59e0b', description: 'Vàng cam hoàng hôn năng động, sáng tạo' },
  { id: 'violet', name: 'Royal Violet', color: '#8b5cf6', description: 'Tím hoàng gia tinh tế, hiện đại' },
  { id: 'crimson', name: 'Midnight Crimson', color: '#e11d48', description: 'Đỏ thắm rực rỡ, quyết đoán' },
  { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4', description: 'Xanh lơ tương lai, thanh thoát' },
  { id: 'rose', name: 'Fuchsia Pink', color: '#ec4899', description: 'Hồng Fuchsia trẻ trung, nổi bật' },
];

export const DEFAULT_PRIMARY_COLOR = '#f28d8d';
```

#### 2.2. Theme Context Contract
```typescript
// frontend/lib/theme-context.tsx

export interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  primaryColor: string;
  palette: DerivedThemePalette;
  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (hexColor: string) => void;
  resetToDefault: () => void;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
}
```

#### 2.3. CSS Variable Design Tokens (`globals.css`)
```css
/* Light Mode (Root) */
:root {
  --color-brand: #f28d8d;
  --color-primary: #f28d8d;
  --color-primary-hover: #e57a7a;
  --color-primary-dark: #d86969;
  --color-primary-light: #fff0f3;
  --color-primary-rgb: 242, 141, 141;
  --color-primary-contrast: #ffffff;

  --bg-canvas: #f8fafc;
  --bg-surface: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-muted: #e2e8f0;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  --border-subtle: #e2e8f0;
  --border-default: #cbd5e1;
  --border-strong: #94a3b8;

  --grid-line: rgba(15, 23, 42, 0.035);
  --dot-color: rgba(15, 23, 42, 0.12);
}

/* Dark Mode Tokens */
.dark {
  --bg-canvas: #0b0f19;
  --bg-surface: #111827;
  --bg-subtle: #1e293b;
  --bg-muted: #334155;

  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  --border-subtle: #1e293b;
  --border-default: #2d3748;
  --border-strong: #4a5568;

  --grid-line: rgba(255, 255, 255, 0.04);
  --dot-color: rgba(255, 255, 255, 0.12);
}
```

---

### 3. Danh sách Workstreams chạy song song (Zero-Overlap Breakdown)

Nguyên tắc phân chia: Không có 2 file mã nguồn nào bị chồng chéo giữa các Workstream.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKSTREAM A (Theme Engine & CSS Tokens):                                  │
│ - frontend/app/globals.css                                                  │
│ - frontend/lib/theme-utils.ts                                               │
│ - frontend/lib/theme-context.tsx                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ WORKSTREAM B (Theme Customizer UI & App Integration):                       │
│ - frontend/components/theme/ThemeCustomizerModal.tsx                        │
│ - frontend/components/theme/ThemeToggle.tsx                                 │
│ - frontend/components/layout/TopBar.tsx                                     │
│ - frontend/components/layout/Sidebar.tsx                                    │
│ - frontend/components/layout/AppShell.tsx                                   │
│ - frontend/components/layout/AppLayoutClient.tsx                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ WORKSTREAM C (Dashboard & UI Elements Theming):                             │
│ - frontend/app/dashboard/page.tsx                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 🔵 WORKSTREAM A: Theme Engine & CSS Tokens
- **Mục tiêu:**
  - Xây dựng tầng nền tảng: thuật toán màu phái sinh, Provider quản lý trạng thái theme và bộ CSS Tokens toàn diện cho Dark Mode trong Tailwind 4.
  - Ngăn ngừa hiện tượng FOUC (chớp sáng) khi tải lại trang bằng inline script kiểm tra theme trong `document.documentElement`.
- **Tập file được phép tạo/sửa (Exclusive Allowed Files):**
  1. `frontend/app/globals.css`
  2. `frontend/lib/theme-utils.ts` (File mới)
  3. `frontend/lib/theme-context.tsx` (File mới)

---

#### 🟢 WORKSTREAM B: Theme Customizer UI & App Integration
- **Mục tiêu:**
  - Tạo giao diện điều khiển tùy biến theme: Nút chuyển nhanh Light/Dark trên thanh TopBar và Modal tùy biến màu sắc đầy đủ tính năng.
  - Tích hợp `ThemeProvider` vào layout ứng dụng (`AppLayoutClient`, `AppShell`, `TopBar`, `Sidebar`).
- **Tập file được phép tạo/sửa (Exclusive Allowed Files):**
  1. `frontend/components/theme/ThemeToggle.tsx` (File mới)
  2. `frontend/components/theme/ThemeCustomizerModal.tsx` (File mới)
  3. `frontend/components/layout/AppLayoutClient.tsx`
  4. `frontend/components/layout/AppShell.tsx`
  5. `frontend/components/layout/TopBar.tsx`
  6. `frontend/components/layout/Sidebar.tsx`

---

#### 🟣 WORKSTREAM C: Dashboard & UI Elements Theming
- **Mục tiêu:**
  - Tối ưu hóa toàn bộ trang Dashboard (`/dashboard`) tương thích 100% với Dark Mode và phản chiếu màu chủ đạo (Primary Accent) được người dùng lựa chọn.
- **Tập file được phép tạo/sửa (Exclusive Allowed Files):**
  1. `frontend/app/dashboard/page.tsx`

---

### 4. Kịch bản Kiểm thử cho QA Auditor (Test Cases & Matrix)

| Mã test | Kịch bản kiểm thử | Hành động & Dữ liệu | Kết quả mong đợi |
|---|---|---|---|
| **TC-01** | **Chuyển nhanh Dark / Light Mode** | Bấm nút Sun/Moon trên thanh TopBar | - Giao diện chuyển đổi tức thì giữa Light Mode và Dark Mode.<br>- Thẻ `<html>` có/mất class `.dark`.<br>- Icon chuyển đổi giữa Mặt trời và Mặt trăng tương ứng. |
| **TC-02** | **Chế độ Hệ thống (System Mode)** | Mở modal tùy biến, chọn "Hệ thống". Đổi theme máy tính sang Dark | - Ứng dụng tự động chuyển sang Dark Mode.<br>- Khi đổi theme máy tính sang Light, ứng dụng tự động chuyển sang Light Mode. |
| **TC-03** | **Thay đổi màu chủ đạo qua Presets** | Mở modal tùy biến, lần lượt click chọn các màu: Ocean Blue (#3b82f6), Emerald (#10b981), Violet (#8b5cf6) | - Nút bấm chính, icon, avatar workspace và live preview đổi màu ngay lập tức.<br>- Trạng thái hover của các nút bấm mang sắc thái đậm hơn một cách tự nhiên. |
| **TC-04** | **Chọn màu tự do (Custom Color Picker)** | Nhập mã HEX tự do (ví dụ `#ff5722` hoặc `#00bcd4`) vào ô nhập | - Hệ thống nhận diện mã HEX hợp lệ, cập nhật màu toàn bộ ứng dụng trong 0ms.<br>- Nếu chọn màu quá sáng (như vàng chanh #ffff00), chữ bên trong nút tự đổi sang màu đen (#0f172a) theo chuẩn WCAG AA. |
| **TC-05** | **Xem trước trực tiếp (Live Preview)** | Thay đổi chế độ và màu trong Modal Tùy biến | - Khung Live Preview trong modal hiển thị đúng màu nền, nút bấm và badge trạng thái ngay tức thì mà không cần bấm Lưu. |
| **TC-06** | **Duy trì trạng thái qua F5 (Persistence & Zero-FOUC)** | Đổi sang Dark Mode + màu Ocean Blue, sau đó tải lại trang (F5 hoặc mở tab mới) | - Ứng dụng mở ra ngay ở trạng thái Dark Mode + Ocean Blue.<br>- **KHÔNG** xảy ra hiện tượng màn hình chớp trắng rồi mới chuyển đen (Zero-FOUC). |
| **TC-07** | **Độ phủ Dark Mode toàn diện trên Dashboard & App Shell** | Kiểm tra toàn bộ Dashboard, TopBar, Sidebar, Dropdowns, Modals | - Không còn các mảng màu trắng hard-code bị lỗi hiển thị.<br>- Chữ hiển thị rõ nét, viền sắc nét, nền lưới 24px dịu mắt. |
| **TC-08** | **Khôi phục mặc định (Reset to Default)** | Bấm nút "Khôi phục mặc định" trong modal | - Ứng dụng quay về chế độ Sáng (Light Mode) và màu Classic Coral (#f28d8d) gốc ban đầu. |

