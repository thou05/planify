# Bản Thiết Kế Tính Năng: Tùy Biến Thông Tin Cá Nhân & Ảnh Bìa (Profile Customization)

> **Tài liệu đặc tả kiến trúc kỹ thuật (Technical Specification)**  
> **Người lập:** Technical Architect  
> **Trạng thái:** Sẵn sàng triển khai song song (Ready for Parallel Engineering)  
> **Ngày lập:** 2026-10-21  
> **Tuân thủ:** [DESIGN.md](file:///e:/VisualStudioCode/planify/DESIGN.md) & [documents/DESIGN_SYSTEM.md](file:///e:/VisualStudioCode/planify/documents/DESIGN_SYSTEM.md) (Modern Flat & Structured SaaS, Zero Shadow, Zero Gradient, Crisp Radius 4-8px, Technical Grid Backgrounds)

---

## 1. Tổng quan & Kiến trúc Giải pháp

### 1.1. Mục tiêu Nghiệp vụ
Nâng cấp trang Hồ sơ cá nhân (`/profile`) của Planify để người dùng có thể linh hoạt tùy biến diện mạo và thông tin cá nhân chuyên nghiệp, tương tự Linear, GitHub và Raycast:
1. **Ảnh đại diện (Avatar Customization):**
   - Hỗ trợ tải tệp ảnh trực tiếp từ thiết bị (PNG, JPG, WEBP, GIF tối đa 5MB) với Live Preview tức thì.
   - Nhập URL ảnh đại diện tùy chỉnh.
   - Bộ sưu tập avatar mẫu đa dạng (ảnh chân dung thực tế + avatar hình khối phẳng).
   - Nút đặt lại / gỡ bỏ avatar (tự động fallback về chữ cái đầu tiên của tên).
2. **Ảnh bìa hồ sơ (Profile Cover Banner):**
   - Bổ sung banner ảnh bìa (Cover Banner) trên Profile Hero Card với tỷ lệ chuẩn 16:4 hoặc chiều cao 140px–160px.
   - Hỗ trợ tải ảnh bìa trực tiếp từ máy tính (tối đa 15MB) với cơ chế lưu trữ Supabase Storage hoặc Base64 fallback.
   - Bộ sưu tập ảnh bìa mẫu: Nền Technical Grid phẳng (chuẩn DESIGN.md), các khối màu phẳng Solid Palette (`#f8fafc`, `#ffc0cb`, `#87ceeb`, `#f28d8d`), và hình nền Unsplash chất lượng cao.
   - Nút gỡ ảnh bìa (chuyển về nền Technical Grid mặc định).
3. **Mở rộng Thông tin Cá nhân (Extended Profile Details):**
   - **Chức danh / Vị trí (Job Title):** ví dụ: *Lead Product Designer*, *Senior Fullstack Engineer*.
   - **Phòng ban / Đội ngũ (Department / Team):** ví dụ: *Product & Engineering*, *Design Systems*.
   - **Địa điểm làm việc (Location):** ví dụ: *Hà Nội, Việt Nam*, *Remote (GMT+7)*.
   - **Website / Portfolio:** ví dụ: `https://thangnguyen.dev`.
   - **Liên kết mạng xã hội (Social Links):** GitHub, LinkedIn.
   - **Trạng thái làm việc (Work Status / Availability):** `WORKING` (🟢 Đang làm việc), `BUSY` (🟡 Đang tập trung / Bận), `AWAY` (⚪ Nghỉ phép / Đi vắng).
4. **Tuân thủ Tuyệt đối Quy chuẩn Thiết kế [DESIGN.md](file:///e:/VisualStudioCode/planify/DESIGN.md):**
   - **Zero Shadows:** Không dùng box-shadow mờ ảo, phân định bằng viền sắc nét `1px solid #e2e8f0`.
   - **Zero Gradients:** Không dùng hiệu ứng chuyển màu trên thành phần UI; dùng màu phẳng Solid Brand Trio: Coral Rose (`#f28d8d`), Soft Pink (`#ffc0cb`), Sky Blue (`#87ceeb`), và thang xám Slate (`#f8fafc` – `#0f172a`).
   - **Bo góc nhỏ (Crisp Radius):** Giữ bo viền ở mức 4px – 8px (`rounded-md`, `rounded-sm`).
   - **Nền kỹ thuật:** Sử dụng Technical Grid Pattern hoặc Dot Matrix Pattern cho ảnh bìa mặc định và nền canvas.

---

### 1.2. Sơ đồ Kiến trúc & Luồng Dữ liệu

```
+-----------------------------------------------------------------------------------+
| Frontend: /app/profile/page.tsx                                                  |
| - Profile Hero Card: Cover Banner + Avatar floating + Work Status badge           |
| - Tab "Thông tin cá nhân":                                                        |
|   + Uploader Avatar (Device file / Presets / URL / Remove)                        |
|   + Uploader Cover Banner (Device file / Presets / URL / Reset)                   |
|   + Core info: Name, Email (read-only), Job Title, Department                     |
|   + Bio & Work Status                                                             |
|   + Contact & Socials: Phone, Location, Website, GitHub, LinkedIn                 |
|   + Regional: Timezone, Language                                                  |
+-----------------------------------------------------------------------------------+
       |                                   |                                   |
       | POST /users/upload-avatar         | POST /users/upload-cover          | PATCH /users/profile
       | (multipart/form-data)             | (multipart/form-data)             | (JSON payload)
       v                                   v                                   v
+-----------------------------------------------------------------------------------+
| Backend: UsersController & UsersService (NestJS)                                  |
| - uploadAvatar: Lưu vào Supabase storage 'attachments' -> update avatar           |
| - uploadCover: Lưu vào Supabase storage 'attachments' -> update cover_image      |
| - updateProfile: Cập nhật name, avatar, cover_image, job_title, department,       |
|                  location, website, social_links, work_status, bio, phone, v.v.   |
| - Graceful schema fallback nếu DB thiếu cột mở rộng                              |
+-----------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| Database: public.users (PostgreSQL / Supabase)                                    |
| - Thêm các cột: cover_image, job_title, department, location, website,           |
|                 social_links (JSONB), work_status (VARCHAR)                       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Giao diện Kết nối (Shared Contracts)

### 2.1. Payload API `PATCH /users/profile`

```typescript
export interface UpdateProfilePayload {
  name?: string;
  avatar?: string | null;
  cover_image?: string | null;
  job_title?: string | null;
  department?: string | null;
  location?: string | null;
  website?: string | null;
  social_links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  } | null;
  work_status?: 'WORKING' | 'BUSY' | 'AWAY' | string;
  bio?: string | null;
  phone?: string | null;
  timezone?: string;
  language?: string;
  theme?: string;
}
```

### 2.2. Endpoints Tải File Mới

- `POST /users/upload-avatar`
  - Content-Type: `multipart/form-data`
  - Field: `file` (image/*, <= 5MB)
  - Phản hồi: `{ success: true, url: string }`
  - Tác dụng phụ: Tự động lưu `avatar = url` vào bảng `users`.

- `POST /users/upload-cover`
  - Content-Type: `multipart/form-data`
  - Field: `file` (image/*, <= 15MB)
  - Phản hồi: `{ success: true, url: string }`
  - Tác dụng phụ: Tự động lưu `cover_image = url` vào bảng `users`.

### 2.3. Cấu trúc Đối tượng User Mở rộng (Frontend `auth-context.tsx`)

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  cover_image?: string | null;
  job_title?: string | null;
  department?: string | null;
  location?: string | null;
  website?: string | null;
  social_links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  } | null;
  work_status?: 'WORKING' | 'BUSY' | 'AWAY' | string;
  bio?: string | null;
  timezone?: string;
  language?: string;
  phone?: string | null;
  theme?: string;
  status: string;
  created_at?: string;
}
```

---

## 3. Danh sách Workstreams Chạy Song Song

> **Nguyên tắc Zero-Overlap:** Hai Workstream hoàn toàn không có file trùng lặp.

### 🔹 Workstream A: Backend & Database Schema
- **Mục tiêu:**
  - Viết file migration SQL mở rộng cấu trúc bảng `public.users`.
  - Cập nhật Prisma Schema đồng bộ.
  - Cập nhật `UpdateProfileDto` chứa tất cả các trường mới (`cover_image`, `job_title`, `department`, `location`, `website`, `social_links`, `work_status`).
  - Thêm 2 endpoints upload (`POST /users/upload-avatar` và `POST /users/upload-cover`) trong `users.controller.ts` và `users.service.ts`.
  - Mở rộng `findById` và `updateProfile` để trả về đầy đủ các trường mới kèm cơ chế fallback an toàn.
- **Allowed Files (Chỉ được sửa/tạo các file này):**
  1. `database/migration_user_profile_customizations.sql` (Tạo mới)
  2. `backend/prisma/schema.prisma`
  3. `backend/src/modules/users/dto/update-profile.dto.ts`
  4. `backend/src/modules/users/users.controller.ts`
  5. `backend/src/modules/users/users.service.ts`
- **Tiêu chí Hoàn thành:**
  - `npx tsc --noEmit` trong `backend` vượt qua với exit code 0.
  - Các endpoint `/users/profile`, `/users/upload-avatar`, `/users/upload-cover` sẵn sàng hoạt động.

---

### 🔹 Workstream B: Frontend UI & Profile Experience
- **Mục tiêu:**
  - Cập nhật interface `User` trong `frontend/lib/auth-context.tsx`.
  - Tái cấu trúc Profile Hero Card trên `frontend/app/profile/page.tsx`:
    - Banner ảnh bìa (Cover photo) với nút đổi ảnh bìa nhanh.
    - Avatar bo góc nhỏ 8px viền sắc cạnh 1px, hỗ trợ badge trạng thái làm việc (🟢 🟡 ⚪).
    - Hiển thị Chức danh, Phòng ban, Vị trí địa lý, Website và Liên kết mạng xã hội trực tiếp trên Hero.
  - Nâng cấp Tab **"Thông tin cá nhân"**:
    - Khu vực upload Avatar từ thiết bị (kéo thả / chọn tệp) + Avatar mẫu + xóa avatar.
    - Khu vực upload Cover Banner từ thiết bị (kéo thả / chọn tệp) + Preset hình nền mẫu (Technical Grid, Solid Colors, Unsplash) + gỡ ảnh bìa.
    - Các ô nhập dữ liệu: Chức danh, Phòng ban, Trạng thái làm việc, Vị trí, Website, GitHub, LinkedIn, Bio, Số điện thoại, Múi giờ, Ngôn ngữ.
  - Tuân thủ 100% `DESIGN.md`: Không gradient, không đổ bóng blur, bo góc nhỏ 4px-8px, viền mảnh 1px, màu Coral Rose `#f28d8d`.
- **Allowed Files (Chỉ được sửa các file này):**
  1. `frontend/lib/auth-context.tsx`
  2. `frontend/app/profile/page.tsx`
- **Tiêu chí Hoàn thành:**
  - `npx tsc --noEmit` trong `frontend` vượt qua với exit code 0.
  - Giao diện khớp chính xác hình chụp hiện tại và bổ sung hoàn hảo các khối tùy biến mới.

---

## 4. Kịch bản Kiểm thử cho QA (QA Test Scenarios)

1. **Kiểm tra Tải ảnh đại diện (Avatar Upload):**
   - Chọn tệp ảnh từ máy tính -> Xem trước hiển thị ngay lập tức trên Hero Card và Form -> Lưu -> Avatar được cập nhật.
   - Chọn avatar từ danh sách mẫu có sẵn -> Xem trước cập nhật tức thời -> Lưu thành công.
   - Bấm nút "Gỡ ảnh đại diện" -> Khôi phục về chữ cái đầu của tên người dùng.
2. **Kiểm tra Ảnh bìa (Cover Banner):**
   - Kéo thả hoặc chọn tệp ảnh bìa từ thiết bị -> Hero banner lập tức hiển thị ảnh bìa mới.
   - Chọn mẫu ảnh bìa (Technical Grid hoặc Solid Palette) -> Banner đổi màu/họa tiết tương ứng.
   - Bấm "Gỡ ảnh bìa" -> Khôi phục về nền Technical Grid mặc định.
3. **Kiểm tra Các trường thông tin mở rộng:**
   - Nhập Chức danh ("Lead Architect"), Phòng ban ("Platform Team"), Vị trí ("Hà Nội"), Website, GitHub, LinkedIn.
   - Đổi trạng thái làm việc sang "Đang bận" (BUSY) hoặc "Nghỉ phép" (AWAY).
   - Nhấn "Lưu thay đổi" -> Thông báo thành công hiển thị, Hero Card lập tức phản ánh các thông tin vừa lưu.
   - Tải lại trang (F5) -> Dữ liệu cá nhân vẫn giữ nguyên đầy đủ.
4. **Kiểm tra Tuân thủ DESIGN.md:**
   - Kiểm tra trực quan: Không có box-shadow lớn, viền mảnh 1px `#e2e8f0`, không có gradient tím/hồng, các nút bấm chính dùng màu `#f28d8d`, focus ring dùng `#87ceeb`.
