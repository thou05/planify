# PLANIFY — Design System & UI Style Guide

## 1. Định hướng thiết kế (Design Direction)

Planify áp dụng phong cách thiết kế:

> **Modern Flat & Structured SaaS — Engineering-grade Productivity**

Mục tiêu thiết kế:
- **Tối giản & Rõ ràng (Flat & Clean):** Loại bỏ hoàn toàn phong cách AI hóa (hiệu ứng gradient tím/hồng, bóng đổ phát sáng glow, các khối tròn trịa giả lập kính viễn tưởng).
- **Cấu trúc & Kỷ luật (Structured Layout):** Sử dụng nền dạng lưới kỹ thuật (**Grid Backgrounds**) hoặc chấm điểm (**Dot Pattern Backgrounds**) làm nền tảng mặc định, tạo cảm giác một công cụ làm việc thực tế, chính xác và chuyên nghiệp (tương tự Linear, GitHub, Raycast, Vercel).
- **Không Shadow (Zero Shadows):** Sử dụng các đường viền sắc nét (1px borders) để phân tách các khối giao diện thay vì dùng hiệu ứng đổ bóng mờ ảo.
- **Không Gradient (Zero Gradients):** 100% màu nền và thành phần (components) dùng màu đơn sắc phẳng (solid colors), đảm bảo độ tương phản cao và hiệu năng hiển thị tối đa.
- **Bo góc nhỏ (Crisp Small Radius):** Bo viền góc nhỏ (4px – 8px), loại bỏ hoàn toàn các khối bo cong lớn (16px – 24px) tạo cảm giác đồ chơi hoặc AI-generated UI.

---

## 2. Hệ màu chuẩn (Color Palette)

Toàn bộ hệ màu sử dụng màu phẳng (Solid Colors), tuyệt đối **không dùng linear-gradient hay radial-gradient** trên bất kỳ thành phần nào.

### 2.1 Màu chủ đạo (Brand / Primary)

```text
Brand Navy:       #1e1050  (Chính - Header, text nhấn, primary button)
Brand Deep:       #2b1572  (Đậm - Nền thanh bên, trạng thái active)
Brand Accent:     #2563eb  (Action Blue - Link, tab active, focus ring)
```

### 2.2 Màu trung tính (Neutrals - Slate Scale)

Sử dụng thang màu Slate phẳng để phân định các bề mặt:

```text
Nền chính (Canvas):       #f8fafc  (Slate-50)
Nền thành phần (Surface): #ffffff  (White - Card, Modal, Input)
Nền phụ (Subtle):         #f1f5f9  (Slate-100 - List container, hover row)
Nền vô hiệu (Disabled):   #e2e8f0  (Slate-200)

Viền chính (Border):      #e2e8f0  (Slate-200 - Viền card, container)
Viền nhấn (Border Strong):#cbd5e1  (Slate-300 - Viền input, focusable)
Viền đậm (Border Dark):   #94a3b8  (Slate-400)

Chữ chính (Text Primary): #0f172a  (Slate-900 - Độ tương phản tối đa)
Chữ phụ (Text Secondary): #475569  (Slate-600)
Chữ mờ (Text Muted):      #94a3b8  (Slate-400)
```

### 2.3 Màu trạng thái & Nghiệp vụ (Status Colors - Solid)

Màu đơn sắc có tone rõ ràng, không kèm glow:

```text
Thành công (Success):    #16a34a  (Green-600) | Nền: #f0fdf4 | Viền: #bbf7d0
Cảnh báo (Warning):      #d97706  (Amber-600) | Nền: #fffbeb | Viền: #fde68a
Nguy hiểm (Danger):      #dc2626  (Red-600)   | Nền: #fef2f2 | Viền: #fecaca
Thông tin (Info):        #0284c7  (Sky-600)   | Nền: #f0f9ff | Viền: #bae6fd
```

> **Lưu ý về tính năng AI:** AI chỉ là một công cụ hỗ trợ logic bên trong, **không có màu nhận diện riêng biệt làm lệch tông hệ thống**. Các nút gọi AI sử dụng màu phẳng thông thường (ví dụ Slate hoặc Blue) kết hợp icon đơn giản (Sparkles), tuyệt đối không dùng gradient tím/hồng hay hiệu ứng phát sáng.

---

## 3. Hệ thống hình nền mặc định (Grid & Pattern Backgrounds)

Loại bỏ hoàn toàn nền gradient mờ và các vệt màu loang (blur blobs). Hệ thống sử dụng **Grid Background** hoặc **Pattern Background** phẳng và tinh tế làm nền mặc định.

### 3.1 Nền Lưới Kỹ Thuật (Technical Grid Pattern — Mặc định chính)

Áp dụng cho toàn bộ không gian Canvas làm việc, Kanban Board, Dashboard:

```css
/* CSS chuẩn cho nền Canvas */
body, .app-canvas {
  background-color: #f8fafc;
  background-image: 
    linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### 3.2 Nền Chấm Điểm (Dot Matrix Pattern — Nền phụ trợ)

Áp dụng cho các khu vực xem trước (Preview), Mindmap, Empty state hoặc Diagrams:

```css
.pattern-dots {
  background-color: #f8fafc;
  background-image: radial-gradient(rgba(15, 23, 42, 0.12) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

---

## 4. Quy tắc Không Shadow (Zero Shadows Rule)

- **Nguyên tắc cốt lõi:** Tuyệt đối không dùng `box-shadow` dày, bóng mờ khuếch tán lớn hoặc colored shadows (bóng màu tím, xanh) trên Card, Button, List, Navbar.
- **Phương pháp phân tách khối:** Dùng đường viền sắc nét `1px solid #e2e8f0` kết hợp màu nền tương phản nhẹ (ví dụ nền trang xám `#f8fafc`, nền Card trắng `#ffffff`).
- **Ngoại lệ duy nhất cho Modal & Dropdown:**
  Chỉ dùng 1 viền solid sắc cạnh kèm bóng mờ tối giản ở mức thấp nhất để tách lớp trục Z:
  ```css
  /* Modal / Dropdown Popup */
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  ```

---

## 5. Quy tắc Bo viền nhỏ (Crisp Corner Radius)

Loại bỏ hoàn toàn các bán kính bo tròn lớn kiểu điện thoại/bong bóng (16px, 20px, 24px, 32px). Chuyển sang chuẩn công nghiệp góc cạnh sắc nét:

| Thành phần | Kích thước bo góc | Tailwind Class |
|---|:---:|---|
| **Tag, Badge, Checkbox** | 3px – 4px | `rounded-sm` / `rounded` |
| **Button, Input, Select** | 6px | `rounded-md` |
| **Kanban Card, Table Row** | 6px | `rounded-md` |
| **List Column, Dropdown Menu** | 8px | `rounded-lg` |
| **Modal, Drawer, Dialog Panel** | 8px – 10px | `rounded-lg` / `rounded-xl` |
| **Avatar tròn** | 50% | `rounded-full` (Duy nhất cho ảnh đại diện) |

---

## 6. Thành phần giao diện (UI Components Specification)

### 6.1 Nút bấm (Buttons) — 100% Solid, Không Gradient

```css
/* 1. Primary Button */
.btn-primary {
  background-color: #2b1572;
  color: #ffffff;
  border: 1px solid #1e1050;
  border-radius: 6px;
  font-weight: 600;
  box-shadow: none;
  transition: background-color 150ms ease;
}
.btn-primary:hover {
  background-color: #1e1050;
}

/* 2. Secondary / Outline Button */
.btn-secondary {
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: none;
}
.btn-secondary:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

/* 3. Destructive Button */
.btn-danger {
  background-color: #dc2626;
  color: #ffffff;
  border: 1px solid #b91c1c;
  border-radius: 6px;
  box-shadow: none;
}
.btn-danger:hover {
  background-color: #b91c1c;
}

/* 4. Ghost / Icon Button */
.btn-ghost {
  background-color: transparent;
  color: #475569;
  border: 1px solid transparent;
  border-radius: 6px;
}
.btn-ghost:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}
```

### 6.2 Ô nhập liệu (Form Inputs)

- Nền trắng phẳng đặc 100%, không bóng đổ, không trong suốt.
- Trạng thái Focus thể hiện bằng viền sắc nét màu xanh `#2563eb`.

```css
.input-flat {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #0f172a;
  padding: 8px 12px;
  font-size: 14px;
  box-shadow: none;
  outline: none;
}
.input-flat:focus {
  border-color: #2563eb;
  outline: 1px solid #2563eb;
}
```

### 6.3 Bảng Kanban & Thẻ công việc (Kanban Board & Cards)

#### Cột danh sách (List Column)
- Nền: `#f1f5f9` (Solid xám nhạt, 100% đục).
- Viền: `1px solid #e2e8f0`.
- Bo góc: `8px`.
- Không shadow, không blur.

#### Thẻ công việc (Task Card)
- Nền: `#ffffff` (Solid trắng phẳng).
- Viền: `1px solid #e2e8f0`.
- Bo góc: `6px`.
- Không shadow.
- **Trạng thái Hover:** Đổi màu viền sang `#94a3b8` (Slate-400), giữ nguyên vị trí, không phóng to (no scale), không bay bổng.
- **Trạng thái Kéo thả (Dragging):** Đường viền nét đứt `1px dashed #2563eb`, nền `#f8fafc`.

```css
/* Card Container */
.kanban-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: none;
  transition: border-color 150ms ease;
}

.kanban-card:hover {
  border-color: #94a3b8;
}
```

### 6.4 Thanh điều hướng bên (Sidebar) & Thanh trên (TopBar)

- **TopBar:** Nền trắng `#ffffff`, viền đáy `1px solid #e2e8f0`.
- **Sidebar:** Nền `#ffffff` hoặc `#f8fafc`, viền phải `1px solid #e2e8f0`.
- **Active Navigation Item:** Nền `#f1f5f9`, chữ `#0f172a` font đậm (Semibold), có vạch chỉ báo phẳng nhỏ ở cạnh trái `w-1 bg-[#2b1572]`.
- Loại bỏ toàn bộ hiệu ứng kính mờ (backdrop-blur) ở sidebar để chống hiện tượng nhìn xuyên gây rối mắt.

### 6.5 Cửa sổ bật lên & Bảng chọn (Modals & Popovers)

- **Backdrop (Màn mờ nền):** `background-color: rgba(15, 23, 42, 0.45);` (Phẳng, không hiệu ứng loang màu).
- **Hộp thoại Modal:**
  - Nền: `#ffffff` (Đặc 100%).
  - Viền: `1px solid #cbd5e1`.
  - Bo góc: `8px`.
  - Không có header gradient, không dùng kính mờ.

---

## 7. Quy tắc Kiểu chữ (Typography)

Ưu tiên các bộ font không chân trung tính, kỹ thuật, rõ ràng:
- **Font gia đình:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`.
- **Cỡ chữ & Trọng số:**

```text
H1 (Trang / Dashboard):     24px — Bold (700)
H2 (Tiêu đề mục / Modal):   18px — Semibold (600)
H3 (Tên cột / Thẻ lớn):     14px — Semibold (600)
Body (Nội dung chính):      14px — Regular (400)
Small (Mô tả phụ, meta):    12px — Regular (400)
Caption / Tag:              11px — Medium (500)
```

---

## 8. Bảng Tokens CSS (Biến giao diện chuẩn hóa)

Định nghĩa thiết kế áp dụng cho file `globals.css`:

```css
:root {
  /* Brand Solid Colors */
  --color-brand: #2b1572;
  --color-brand-hover: #1e1050;
  --color-primary: #2563eb;
  --color-danger: #dc2626;
  --color-success: #16a34a;
  --color-warning: #d97706;

  /* Surfaces (Solid Flat) */
  --bg-canvas: #f8fafc;
  --bg-surface: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-muted: #e2e8f0;

  /* Borders */
  --border-subtle: #e2e8f0;
  --border-default: #cbd5e1;
  --border-strong: #94a3b8;

  /* Corner Radius (Crisp) */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;

  /* Shadows: Loại bỏ hoàn toàn */
  --shadow-none: none;
}
```

---

## 9. Tóm tắt nguyên tắc kiểm thử giao diện (UI Checklist)

1. [x] **Không Gradient:** Mọi nút, thẻ, banner, header đều có màu nền đơn sắc (Flat).
2. [x] **Không Shadow lớn / Glow:** Tất cả card, panel, list đều có bóng đổ bằng `none`, ngăn cách bằng `border: 1px solid #e2e8f0`.
3. [x] **Bo góc nhỏ:** Mọi component chỉ bo từ `4px` đến `8px`.
4. [x] **Nền Grid / Pattern:** Nền không gian làm việc sử dụng họa tiết lưới kỹ thuật 24px x 24px hoặc chấm điểm phẳng tinh tế.
5. [x] **Độ đục 100%:** Các thành phần đè lên nhau (Dropdown, Modal, Sidebar) đều có nền trắng đặc, không bị xuyên thấu.
