# KẾ HOẠCH TRIỂN KHAI KỸ THUẬT: PLAYFUL LANDING & AUTH BACKGROUND SYSTEM
## Giao Diện Mở Đầu & Cụm Xác Thực Đồ Họa Doodle Chuyển Động Cho Planify

> **File:** `plans/playful-landing-and-auth-bg-spec.md`  
> **Kiến trúc sư:** Technical Architect  
> **Trạng thái:** Sẵn sàng phân bổ triển khai song song (Ready for Parallel Engineering)  
> **Tiêu chuẩn tuân thủ:** Next.js 16 (App Router), React 19, Tailwind CSS v4, WCAG AA 4.5:1 / AAA 7:1

---

## 1. TỔNG QUAN & KIẾN TRÚC HỆ THỐNG

### 1.1 Mục Tiêu Kỹ Thuật
1. **Chuyển đổi giao diện:** Nâng cấp Landing Page và cụm Auth (`/login`, `/register`, `/forgot-password`) từ phong cách tối giản phẳng sang ngôn ngữ thiết kế **Playful Engineering / Whimsical Productivity**.
2. **Nền chuyển động 60FPS không giật lag (Zero-Jank):** Hệ thống background chuyển động bằng vector SVG và GPU CSS Transform (`translate3d`), không can thiệp layout tree, CLS = 0.
3. **Bảo toàn 100% Logic Nghiệp Vụ:** Không làm gián đoạn luồng xác thực (email/password, OTP 6 số xác thực đăng ký & quên mật khẩu, Google Sign-in OAuth, backend health check, dashboard redirect).
4. **Zero-Overlap Workstreams:** Tách biệt độc lập các file giữa 3 gói công việc kỹ thuật để các engineer chạy song song an toàn tuyệt đối.

### 1.2 Luồng Dữ Liệu & Cấu Trúc Thành Phần (Architecture Diagram)

```
                    +--------------------------------------------+
                    |             Tailwind CSS v4                |
                    |         (frontend/app/globals.css)         |
                    |   - Keyframe Animations (GPU)              |
                    |   - Prefers-reduced-motion overrides       |
                    +---------------------+----------------------+
                                          |
                                          v
               +----------------------------------------------------+
               |    frontend/components/playful/DoodleIcons.tsx     |
               |       (Thư viện 12 Vector Icons thuần túy)         |
               +--------------------------+-------------------------+
                                          |
                      +-------------------+--------------------+
                      |                                        |
                      v                                        v
+-------------------------------------------+   +---------------------------------------+
| frontend/components/playful/              |   | frontend/components/landing/          |
| PlayfulBackground.tsx                     |   | - InteractiveKanbanPreview.tsx        |
| - variant='auth': Safe Zones 20%-80%      |   | - HeroStatsBadge.tsx                  |
| - variant='landing': Phủ mở rộng Hero     |   +-------------------+-------------------+
| - Radial Glow Orbs & Micro-interactions   |                       |
+---------------------+---------------------+                       |
                      |                                             |
                      v                                             v
+-------------------------------------------+   +---------------------------------------+
| frontend/app/(auth)/layout.tsx            |   | frontend/app/page.tsx                 |
| - AuthLayout bọc PlayfulBackground        |   | - Landing Page với Playful Background |
| - Trung tâm render các Auth Pages         |   | - Hero Gradient Typography            |
+---------------------+---------------------+   | - Backend Status (NestJS Port 4000)   |
                      |                         +---------------------------------------+
                      v
      +---------------+---------------+
      |               |               |
      v               v               v
 [login/page]  [register/page] [forgot-password/page]
 (Glassmorphism + Form logic + Google OAuth + OTP)
```

---

## 2. GIAO DIỆN KẾT NỐI (SHARED CONTRACTS & TYPES)

Nhằm đảm bảo các Workstream chạy song song không bị lệch kiểu dữ liệu hoặc sai tên component, dưới đây là hợp đồng chuẩn:

### 2.1 Hợp Đồng Doodle Icons (`frontend/components/playful/DoodleIcons.tsx`)
Mọi Doodle Icon đều tuân thủ interface `DoodleIconProps`:

```tsx
export interface DoodleIconProps {
  className?: string;
}

export type DoodleIconComponent = React.FC<DoodleIconProps>;

// Danh sách 12 Export chính thức:
export const DoodleRocket: DoodleIconComponent;
export const DoodleKanban: DoodleIconComponent;
export const DoodleStickyNote: DoodleIconComponent;
export const DoodleChecklist: DoodleIconComponent;
export const DoodleCoffee: DoodleIconComponent;
export const DoodleIdeaBulb: DoodleIconComponent;
export const DoodleClock: DoodleIconComponent;
export const DoodleTarget: DoodleIconComponent;
export const DoodleChat: DoodleIconComponent;
export const DoodleMascot: DoodleIconComponent;
export const DoodleFolder: DoodleIconComponent;
export const DoodleTrophy: DoodleIconComponent;
```

### 2.2 Hợp Đồng Component Nền (`frontend/components/playful/PlayfulBackground.tsx`)

```tsx
export interface PlayfulBackgroundProps {
  /** 'landing' rải đều theo hero, 'auth' tập trung 2 bên viền để trống giữa */
  variant?: 'landing' | 'auth';
  className?: string;
  showGlowOrbs?: boolean;
}

export const PlayfulBackground: React.FC<PlayfulBackgroundProps>;
```

### 2.3 Hợp Đồng CSS Keyframes & Utility Classes (`frontend/app/globals.css`)
Các class animation chuẩn hóa được cấu hình:
- `.animate-doodle-float-slow`: Dao động trục Y (-14px) và xoay nhẹ (+3deg) chu kỳ 6.5s.
- `.animate-doodle-bob-gentle`: Dao động trục Y (+12px) và xoay nhẹ (-3deg) chu kỳ 5.2s.
- `.animate-doodle-float-alt`: Dao động lượn đa hướng chu kỳ 7.8s.
- `.animate-doodle-wiggle-soft`: Lắc lư nghiêng nhẹ chu kỳ 4.8s.
- Hỗ trợ `@media (prefers-reduced-motion: reduce)`: Tự động vô hiệu hóa chuyển động để bảo vệ người dùng nhạy cảm thị giác.

### 2.4 Hợp Đồng Bố Cục Vùng An Toàn Auth (Safe Zone Contract)
- **Vùng bảo vệ trung tâm (Zero Interference Zone):** Tọa độ `left: 20%` đến `left: 80%` ở độ cao chính giữa màn hình **tuyệt đối không được chứa bất kỳ Doodle Icon nào**.
- **Biên trái (Left Margin: 0 - 18%):** Bố trí 5 icons: `DoodleRocket` (top: 8%), `DoodleKanban` (top: 28%), `DoodleCoffee` (top: 50%), `DoodleIdeaBulb` (top: 72%), `DoodleTarget` (bottom: 6%).
- **Biên phải (Right Margin: 82 - 100%):** Bố trí 5 icons: `DoodleMascot` (top: 10%), `DoodleStickyNote` (top: 30%), `DoodleTrophy` (top: 52%), `DoodleChecklist` (top: 70%), `DoodleClock` (bottom: 6%).
- **Màn hình Mobile (< 768px):** Tự động thu nhỏ size (`w-10 h-10` đến `w-12 h-12`), ghim sát viền (1% - 2%) và giảm opacity để không làm xao nhãng việc nhập liệu.

### 2.5 Hợp Đồng Thẩm Mỹ Frosted Glassmorphism (Card Surface Tokens)
- **Container Card Light Mode:** `bg-white/85 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(15,23,42,0.08)]`
- **Container Card Dark Mode:** `dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-slate-700/60 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`
- **Input Focus Ring:** `focus:border-[#87ceeb] focus:ring-2 focus:ring-[#87ceeb]/30`
- **Primary CTA:** `bg-gradient-to-r from-[#f28d8d] to-[#e57a7a] hover:from-[#e57a7a] hover:to-[#d86969] text-white shadow-md shadow-rose-200/50 dark:shadow-none active:scale-[0.98]`

---

## 3. DANH SÁCH WORKSTREAMS CHẠY SONG SONG (ZERO-OVERLAP)

### 🔴 WORKSTREAM A: Thư Viện Vector Icons & Global CSS Animations
- **Kỹ sư phụ trách:** Engineer A
- **Mục tiêu:**
  Hiện thực hóa toàn bộ 12 doodle vector SVG icons chuẩn React và khai báo các CSS keyframes GPU tối ưu trong `globals.css`.
- **File được phép tạo / chỉnh sửa (Chuyên biệt - Không trùng lặp):**
  1. `frontend/components/playful/DoodleIcons.tsx` *(Tạo mới)*
  2. `frontend/components/playful/index.ts` *(Tạo mới)*
  3. `frontend/app/globals.css` *(Chỉnh sửa phần bổ sung Keyframes)*

---

### 🟢 WORKSTREAM B: Component Background Tương Tác & Cụm Auth Layout
- **Kỹ sư phụ trách:** Engineer B
- **Mục tiêu:**
  Xây dựng component `PlayfulBackground`, tạo `layout.tsx` cho cụm auth, và nâng cấp UI của 3 trang `/login`, `/register`, `/forgot-password` theo phong cách Frosted Glassmorphism, bảo tồn 100% logic xác thực.
- **File được phép tạo / chỉnh sửa (Chuyên biệt - Không trùng lặp):**
  1. `frontend/components/playful/PlayfulBackground.tsx` *(Tạo mới)*
  2. `frontend/app/(auth)/layout.tsx` *(Tạo mới)*
  3. `frontend/app/(auth)/login/page.tsx` *(Chỉnh sửa)*
  4. `frontend/app/(auth)/register/page.tsx` *(Chỉnh sửa)*
  5. `frontend/app/(auth)/forgot-password/page.tsx` *(Chỉnh sửa)*

---

### 🔵 WORKSTREAM C: Tái Thiết Kế Hero Landing Page Sinh Động & Interactive Preview
- **Kỹ sư phụ trách:** Engineer C
- **Mục tiêu:**
  Nâng cấp trang chủ `frontend/app/page.tsx` thành giao diện mở đầu tràn ngập cảm hứng với `PlayfulBackground variant="landing"`, headline gradient, và Interactive Mini Kanban Preview Card.
- **File được phép tạo / chỉnh sửa (Chuyên biệt - Không trùng lặp):**
  1. `frontend/app/page.tsx` *(Chỉnh sửa)*
  2. `frontend/components/landing/InteractiveKanbanPreview.tsx` *(Tạo mới)*
  3. `frontend/components/landing/HeroStatsBadge.tsx` *(Tạo mới)*
  4. `frontend/components/landing/index.ts` *(Tạo mới)*

---

## 4. KỊCH BẢN KIỂM THỬ CHO QA AUDITOR (QUALITY ASSURANCE CHECKLIST)

QA Auditor sẽ dựa trên danh sách tiêu chí dưới đây để nghiệm thu toàn diện:

### 4.1 Kiểm Thử Thẩm Mỹ & Animation (Visual & Motion)
| STT | Luồng Kiểm Thử | Hành Động | Kết Quả Kỳ Vọng |
| :--- | :--- | :--- | :--- |
| 1 | Doodle Vectors | Mở Landing Page và Auth Pages | 12 icons vẽ sắc nét, đúng mã màu thương hiệu, không vỡ hạt hay lệch nét |
| 2 | Chuyển động GPU | Quan sát các doodle lơ lửng | Chuyển động mềm mại, tự nhiên, 60FPS không giật lag |
| 3 | Tương tác Hover | Rê chuột qua các Doodle Icons | Icon phóng to nhẹ 1.25x, xoay nhẹ, đổ bóng phát quang êm ái |
| 4 | Reduced Motion | Bật tính năng "Reduce Motion" trong cài đặt hệ điều hành (Windows/macOS) | Tất cả doodle icons dừng chuyển động hoàn toàn, đứng yên trang nhã |

### 4.2 Kiểm Thử Vùng An Toàn & Responsive (Safe Zones & Mobile)
| STT | Luồng Kiểm Thử | Kích Thước Màn Hình | Kết Quả Kỳ Vọng |
| :--- | :--- | :--- | :--- |
| 1 | Desktop (1920x1080 & 1440x900) | Full Screen | Doodles nằm hoàn toàn ở 2 bên mép (trái/phải), vùng form 20%-80% hoàn toàn sạch sẽ |
| 2 | Tablet (768x1024) | iPad portrait / landscape | Doodles co dãn tỷ lệ, không đè lấn lên các mép card auth |
| 3 | Mobile (375x667 & 390x844) | iPhone / Android | Doodles tự động thu nhỏ và ẩn bớt các icons phụ; Form nhập liệu rõ ràng 100% |

### 4.3 Kiểm Thử Tương Thích Chế Độ Sáng/Tối (Light & Dark Mode)
| STT | Chế Độ | Tiêu Chí Kiểm Tra | Kết Quả Kỳ Vọng |
| :--- | :--- | :--- | :--- |
| 1 | Light Mode | Nền xám bạc `#f8fafc` + Grid mờ | Nét viền doodle mực đậm `#0f172a`, card Frosted kính mờ trắng sáng bóng |
| 2 | Dark Mode | Nền Deep Cosmic `#0b0f19` | Nét viền doodle phát sáng neon nhẹ, chữ và input đạt chuẩn tương phản WCAG AA (>4.5:1) |

### 4.4 Kiểm Thử Nghiệp Vụ Xác Thực (Auth Regression Testing)
| STT | Trang | Kịch Bản | Kết Quả Kỳ Vọng |
| :--- | :--- | :--- | :--- |
| 1 | `/login` | Nhập email & password hợp lệ | Đăng nhập thành công, chuyển hướng về `/dashboard` (hoặc redirect param) |
| 2 | `/login` | Nhập sai tài khoản / mật khẩu | Banner lỗi hiển thị rõ ràng, không bị vỡ layout card |
| 3 | `/login` | Click Đăng nhập với Google | Kích hoạt Google One-Tap/Popup hoặc Dev simulation modal mượt mà |
| 4 | `/register` | Điền form và bấm Đăng ký | Mở modal OTP, nhận mã và xác thực tài khoản thành công |
| 5 | `/forgot-password` | Bước 1: Nhập email | Gửi mã thành công, chuyển sang Bước 2 với bộ đếm ngược 60 giây |
| 6 | `/forgot-password` | Bước 2: Nhập 6 số OTP & Mật khẩu mới | Hỗ trợ paste mã 6 số tự động nhảy ô, cập nhật mật khẩu thành công |

### 4.5 Kiểm Thử Landing Page & Backend Status
| STT | Hạng Mục | Kịch Bản | Kết Quả Kỳ Vọng |
| :--- | :--- | :--- | :--- |
| 1 | Backend Online | Khi NestJS backend đang chạy cổng 4000 | Chấm tròn xanh lá cây hiển thị "Backend Online (Cổng 4000)" |
| 2 | Swagger Link | Click "Swagger Docs" | Mở tab mới dẫn tới `http://localhost:4000/api/docs` |
| 3 | User Session | Khi người dùng đã đăng nhập | Header và Hero hiển thị nút "Dashboard", avatar và tên người dùng |
| 4 | Guest Session | Khi người dùng chưa đăng nhập | Hiển thị nút Đăng nhập / Đăng ký dẫn đúng route |

