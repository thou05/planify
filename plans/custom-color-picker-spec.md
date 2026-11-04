# ĐẶC TẢ KỸ THUẬT: BẢNG MÀU TÙY CHỌN (CUSTOM COLOR PICKER SYSTEM)
**Feature Code:** `FEAT-COLOR-PICKER`  
**Standard:** Tuân thủ 100% `documents/DESIGN_SYSTEM.md` & `DESIGN.md` (Flat SaaS, Zero Shadow, Zero Blur, 1px Crisp Border, Radius 6-8px, Solid Triad)

---

## 1. TỔNG QUAN & KIẾN TRÚC (OVERVIEW & ARCHITECTURE)

### 1.1 Vấn đề hiện tại
- **Nhãn thẻ (Card Labels):** Trong `frontend/components/modals/CardDetailModal.tsx`, chỉ có 10 màu cứng (`LABEL_COLOR_PALETTE`). Người dùng không thể chọn màu thương hiệu hoặc màu phân loại theo ý muốn.
- **Hình nền Bảng (Board Appearance):** Trong `frontend/components/board/BoardAppearanceModal.tsx`, phần màu đơn sắc chỉ có 6 ô màu cứng (`PRESET_COLORS`), thiếu ô nhập mã màu HEX và phổ màu mở rộng.
- **Ảnh bìa Hồ sơ (Profile Cover Banner):** Trong `frontend/app/profile/page.tsx` và `frontend/components/modals/ProfileModal.tsx`, người dùng chỉ chọn được 4 màu solid cố định (`solid:#f28d8d`, `solid:#ffc0cb`, `solid:#87ceeb`, `solid:#0f172a`), không tự do chọn màu phong thủy, màu yêu thích cá nhân.
- **Backend sẵn sàng 100%:** Cột `color` (Labels) là `VarChar(30)`, `background` (Boards) là `Text`, `cover_image` (Users) là `Text`. Các DTO NestJS (`CreateLabelDto`, `UpdateBoardDto`, `UpdateProfileDto`) đều cho phép nhận chuỗi màu tự do mà không cần thay đổi Database Schema hay API endpoint nào.

### 1.2 Giải pháp Kiến trúc
Xây dựng một Reusable Component chuẩn hóa:
- **`frontend/components/ui/ColorPicker.tsx`**: Thành phần UI độc lập, tương thích React 19, Tailwind CSS 4.
- **`frontend/lib/color-utils.ts`**: Thư viện tiện ích xử lý mã màu: chuẩn hóa HEX, kiểm tra tính hợp lệ (Regex), tính toán độ tương phản (WCAG Contrast Ratio) để tự động đảo màu chữ (đen/trắng) hiển thị trên nhãn, và tích hợp EyeDropper API (Hút màu màn hình).

### 1.3 Sơ đồ Luồng Dữ liệu (Data Flow Diagram)
```mermaid
flowchart TD
    subgraph UI_Component ["Reusable UI Component"]
        CP["ColorPicker.tsx"]
        PAL["Expanded Palettes (Warm, Cool, Pastel, Vibrant)"]
        HEX["Hex Input (#RRGGBB)"]
        NAT["HTML5 Wheel (<input type='color'>)"]
        EYE["EyeDropper API (Pipette Tool)"]
        PREV["Live Swatch & Contrast Preview"]
    end

    subgraph Consumer_Modals ["Consumer Components"]
        C1["CardDetailModal.tsx (Labels)"]
        C2["BoardAppearanceModal.tsx (Board Solid Bg)"]
        C3["ProfilePage & ProfileModal (solid:#hex Cover)"]
    end

    subgraph Backend_API ["Backend API (Already Compatible)"]
        B1["PATCH /labels/:id | POST /boards/:id/labels"]
        B2["PATCH /boards/:id { background }"]
        B3["PATCH /users/profile { cover_image }"]
    end

    PAL --> CP
    HEX --> CP
    NAT --> CP
    EYE --> CP
    CP --> PREV

    CP -->|onChange(color)| C1
    CP -->|onChange(color)| C2
    CP -->|onChange('solid:' + color)| C3

    C1 --> B1
    C2 --> B2
    C3 --> B3
```

---

## 2. GIAO DIỆN KẾT NỐI (SHARED CONTRACTS & DATA TYPES)

### 2.1 File: `frontend/lib/color-utils.ts`
```typescript
/**
 * Tiện ích chuẩn hóa và xử lý màu sắc
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
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

/** Tự động chuẩn hóa mã hex (thêm # nếu thiếu, mở rộng 3 ký tự lên 6 ký tự) */
export function normalizeHex(raw: string): string {
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
```

### 2.2 Props Interface: `frontend/components/ui/ColorPicker.tsx`
```typescript
export interface ColorPickerProps {
  /** Giá trị màu hiện tại (#hex) */
  value: string;
  /** Callback khi màu thay đổi */
  onChange: (color: string) => void;
  /** Tiêu đề hiển thị bên trên (mặc định: 'Chọn màu sắc') */
  label?: string;
  /** Cho phép chọn tabs danh mục màu (Mặc định: true) */
  showCategories?: boolean;
  /** Hiển thị ô gõ mã HEX (Mặc định: true) */
  showHexInput?: boolean;
  /** Hiển thị nút gọi native color wheel <input type="color"> (Mặc định: true) */
  showNativePicker?: boolean;
  /** Hiển thị công cụ hút màu EyeDropper nếu trình duyệt hỗ trợ (Mặc định: true) */
  showEyeDropper?: boolean;
  /** Hiển thị thanh xem trước (Preview Swatch) (Mặc định: true) */
  showPreview?: boolean;
  /** Text mô phỏng bên trong swatch (dành cho Label: vd 'Backend', 'Bug'...) */
  previewText?: string;
  /** Lớp CSS ngoài cùng */
  className?: string;
  /** Vô hiệu hóa */
  disabled?: boolean;
}
```

---

## 3. DANH SÁCH WORKSTREAMS CHẠY SONG SONG (ZERO-OVERLAP)

```text
├── Workstream 1 (Core Foundation): color-utils.ts + ColorPicker.tsx
├── Workstream 2 (Board & Label Domain): CardDetailModal.tsx + BoardAppearanceModal.tsx
└── Workstream 3 (Profile Domain): profile/page.tsx + ProfileModal.tsx
```

---

### 🟢 WORKSTREAM 1: Core Component & Utilities (Foundation)
- **Kỹ sư phụ trách:** Core UI Engineer
- **Mục tiêu:** Xây dựng module tiện ích màu sắc và Component `ColorPicker` dùng chung theo chuẩn `DESIGN.md`.
- **Tập tin ĐƯỢC PHÉP tạo mới/chỉnh sửa (Allowed Files):**
  1. `frontend/lib/color-utils.ts` (Tạo mới)
  2. `frontend/components/ui/ColorPicker.tsx` (Tạo mới)
- **Yêu cầu chi tiết:**
  - Viết `color-utils.ts` với đầy đủ các hàm: `isValidHex`, `normalizeHex`, `getContrastTextColor`, danh sách `CURATED_PALETTES`.
  - Viết `ColorPicker.tsx`:
    - Tab chuyển đổi danh mục bảng màu: *Chủ đạo*, *Tông lạnh*, *Tông ấm*, *Pastel*, *Sống động*.
    - Lưới màu phẳng tỉ lệ chuẩn: Các ô màu bo viền `rounded-md`, kích thước `w-7 h-7` hoặc `w-8 h-8`, có viền mảnh `1px solid #e2e8f0`. Trạng thái active: `ring-2 ring-offset-1 ring-[#f28d8d]`.
    - Input nhập mã màu HEX thủ công: Nền trắng, viền `1px solid #cbd5e1`, bo viền `rounded-md`, icon `#` ở cạnh trái.
    - Nút bấm Native HTML5 Color Wheel: Sử dụng input ẩn `<input type="color" className="sr-only" />` kích hoạt khi click nút icon `Palette`, mở hộp thoại 16 triệu màu của hệ điều hành.
    - Nút Hút màu màn hình (EyeDropper): Kiểm tra `typeof window !== 'undefined' && 'EyeDropper' in window`. Khi bấm, mở con trỏ hút màu bất kỳ trên màn hình và cập nhật giá trị trả về.
    - Ô Live Preview Swatch: Hiển thị màu đang chọn, mã HEX in hoa, và text xem trước với màu tương phản tự động (đen/trắng).
- **Tiêu chí hoàn thành (DoD):**
  - Không có lỗi TypeScript (`tsc --noEmit`).
  - Giao diện sắc nét, phẳng 100%, không sử dụng box-shadow mờ ảo hay gradient màu loang, bo góc đúng 6-8px.

---

### 🟢 WORKSTREAM 2: Tích hợp Nhãn Thẻ & Giao diện Bảng (Board Domain)
- **Kỹ sư phụ trách:** Board Feature Engineer
- **Mục tiêu:** Thay thế bảng màu cứng 10 màu trong Nhãn và 6 màu trong Giao diện Bảng bằng `ColorPicker`.
- **Tập tin ĐƯỢC PHÉP tạo mới/chỉnh sửa (Allowed Files):**
  1. `frontend/components/modals/CardDetailModal.tsx`
  2. `frontend/components/board/BoardAppearanceModal.tsx`
- **Yêu cầu chi tiết:**
  - **Trong `CardDetailModal.tsx`:**
    - Thay thế khối render `LABEL_COLOR_PALETTE` tĩnh bằng `<ColorPicker value={formLabelColor} onChange={setFormLabelColor} previewText={formLabelName.trim() || 'Tên nhãn'} />`.
    - Khi tạo mới nhãn hoặc sửa nhãn (`handleSaveLabel`), giữ nguyên logic gọi API `POST /boards/:id/labels` và `PATCH /labels/:id`.
    - Trong danh sách nhãn (`filteredBoardLabels`), áp dụng `color: getContrastTextColor(l.color)` để chữ nhãn luôn hiển thị sắc nét bất kể người dùng chọn màu sáng hay tối.
  - **Trong `BoardAppearanceModal.tsx`:**
    - Tại Tab "Hình nền Board" (mục 4. Màu sắc đơn sắc hiện đại):
    - Tích hợp `<ColorPicker value={selectedBg?.startsWith('#') ? selectedBg : '#334155'} onChange={(hex) => handleSelectGradient(hex)} showPreview={false} />`.
    - Giữ nguyên các mẫu chọn nhanh `PRESET_COLORS` nhưng cho phép mở rộng với ColorPicker hoàn chỉnh bên dưới.
    - Live preview của Bảng ở đầu modal lập tức phản chiếu màu được chọn.
- **Tiêu chí hoàn thành (DoD):**
  - Người dùng có thể tạo nhãn với bất kỳ mã màu HEX nào.
  - Đổi màu nền board sang màu bất kỳ và lưu thành công qua API `PATCH /boards/:id`.

---

### 🟢 WORKSTREAM 3: Tích hợp Ảnh bìa Hồ sơ Cá nhân (Profile Domain)
- **Kỹ sư phụ trách:** Profile Feature Engineer
- **Mục tiêu:** Cho phép người dùng tự do lựa chọn mọi màu phẳng (Solid Color) làm ảnh bìa cá nhân (Cover Banner) thay vì chỉ 4 màu mặc định.
- **Tập tin ĐƯỢC PHÉP tạo mới/chỉnh sửa (Allowed Files):**
  1. `frontend/app/profile/page.tsx`
  2. `frontend/components/modals/ProfileModal.tsx`
- **Yêu cầu chi tiết:**
  - **Trong `frontend/app/profile/page.tsx`:**
    - Trong modal đổi ảnh bìa (`isCoverModalOpen`): Thêm phần "Tự chọn màu phẳng cá nhân (Custom Solid Color)" sử dụng `<ColorPicker />`.
    - Khi người dùng chọn một mã màu `#RRGGBB`, tự động gán `setCoverImage('solid:' + hex)`.
    - Khối xem trước ảnh bìa (`getCoverStyle`) đã hỗ trợ tiền tố `solid:#...` nên sẽ hiển thị màu nền phẳng ngay tức thì.
  - **Trong `frontend/components/modals/ProfileModal.tsx`:**
    - Bổ sung chức năng chọn màu phẳng làm ảnh bìa tương ứng (hiện tại modal này chỉ có ô nhập URL và upload file).
    - Thêm panel chọn màu Solid với tiền tố `solid:#...` đồng bộ với `profile/page.tsx`.
- **Tiêu chí hoàn thành (DoD):**
  - Người dùng chọn màu bất kỳ (ví dụ `#059669`, `#6366f1`) và lưu hồ sơ thành công; bìa hồ sơ hiển thị màu sắc chính xác trên cả trang Profile và Profile Modal.

