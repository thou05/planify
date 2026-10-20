# Bản Thiết Kế Tính Năng: Thay Đổi Hình Nền & Favicon Cho Board

> **Tài liệu đặc tả kiến trúc kỹ thuật (Technical Specification)**  
> **Người lập:** Technical Architect  
> **Trạng thái:** Sẵn sàng triển khai song song (Ready for Parallel Engineering)  
> **Ngày lập:** 2026-10-20  

---

## 1. Tổng quan & Kiến trúc Giải pháp

### 1.1. Mục tiêu
Cung cấp khả năng cá nhân hóa trực quan cho Bảng công việc (Kanban Board) giống như Trello, Notion và Linear:
1. **Thay đổi Hình nền (Board Background):**
   - Bộ sưu tập màu đơn sắc (Solid Colors) hiện đại, trang nhã.
   - Bộ sưu tập dải màu Gradient thời thượng (Sunset, Ocean, Emerald, Aurora, Neon, v.v.).
   - Bộ sưu tập hình nền chất lượng cao từ Unsplash (Thiên nhiên, Kiến trúc tối giản, Không gian làm việc).
   - Tùy chỉnh link ảnh bên ngoài (Custom Image URL).
   - Tùy chọn đặt về nền lưới mặc định (Dot pattern / Clean Slate).
2. **Thay đổi Biểu tượng & Favicon (Board Icon / Favicon):**
   - Chọn biểu tượng Emoji đại diện cho Board (🚀, 🎯, 🎨, 📊, ⚡, 💡, 🔥, ✨, 💻, 📌, v.v.).
   - **Realtime Browser Tab Favicon:** Khi người dùng truy cập vào Board, Favicon trên tab trình duyệt sẽ tự động cập nhật theo biểu tượng của Board (thông qua SVG Data URL hoặc Image URL) và tiêu đề tab sẽ mang tiền tố biểu tượng: `<Emoji> <Tên Board> | Planify`.
   - Khi người dùng rời khỏi Board hoặc unmount trang, Favicon sẽ tự động khôi phục về Favicon mặc định của hệ thống Planify.
   - Hiển thị biểu tượng Board ngay cạnh tên Board ở thanh điều hướng trên cùng (cho phép click để mở nhanh Icon Picker) và trong thanh bên (Sidebar).

---

### 1.2. Kiến trúc Kỹ thuật

```
+-----------------------------------------------------------------------------------+
| Browser Tab: <link rel="icon"> dynamic SVG Data URI + document.title              |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| Frontend (Next.js App Router):                                                   |
| - frontend/app/boards/[boardId]/page.tsx (useDynamicFavicon effect, header icon)   |
| - frontend/components/board/BoardAppearanceModal.tsx (Appearance & Icon picker)   |
| - frontend/components/modals/EditBoardModal.tsx (Quick link / appearance section) |
| - frontend/components/layout/Sidebar.tsx (Board icon display)                     |
+-----------------------------------------------------------------------------------+
                                       | PATCH /boards/:id { background, icon }
                                       v
+-----------------------------------------------------------------------------------+
| Backend (NestJS):                                                                 |
| - UpdateBoardDto (background?: string, icon?: string)                             |
| - BoardsService (Update DB + Graceful schema fallback + emit Realtime event)      |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| Database (Supabase PostgreSQL):                                                   |
| - public.boards (background TEXT, icon VARCHAR(255))                              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Giao diện Kết nối (Shared Contracts)

### 2.1. Database Schema (`public.boards`)
```sql
-- migration_board_background_and_icon.sql
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS icon VARCHAR(255) NULL;
ALTER TABLE public.boards ALTER COLUMN background TYPE TEXT;
```

### 2.2. Backend DTO & API Contract
- **Endpoint:** `PATCH /boards/:id`
- **Payload:**
```typescript
export class UpdateBoardDto {
  name?: string;
  description?: string;
  visibility?: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC';
  is_favorite?: boolean;
  is_archived?: boolean;
  background?: string; // Dải màu gradient (linear-gradient(...)), mã màu hex (#...), hoặc URL ảnh (https://...)
  icon?: string;       // Ký tự Emoji (ví dụ: '🚀') hoặc URL icon
}
```
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Sprint 1",
    "background": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    "icon": "🚀",
    "visibility": "WORKSPACE"
  }
}
```

### 2.3. Frontend Dynamic Favicon Utility Contract
```typescript
// Chuyển đổi emoji thành SVG Favicon Data URL chuẩn cho trình duyệt
export function createEmojiFaviconDataUrl(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
```

---

## 3. Danh sách Workstreams Chạy Song Song (Zero-Overlap)

> [!IMPORTANT]
> Hai Workstream dưới đây phân tách file tuyệt đối để 2 Engineer có thể thực thi đồng thời mà không gây ra xung đột mã nguồn.

### Workstream A: Backend (API, DTO, Database Migration & Schema Fallback)
- **Kỹ sư phụ trách:** `engineer-backend`
- **Allowed Files:**
  1. `database/migration_board_background_and_icon.sql`
  2. `backend/src/modules/boards/dto/update-board.dto.ts`
  3. `backend/src/modules/boards/dto/create-board.dto.ts`
  4. `backend/src/modules/boards/boards.service.ts`
- **Mục tiêu triển khai:**
  - Viết file migration SQL `database/migration_board_background_and_icon.sql` bổ sung cột `icon` và mở rộng độ dài cột `background`.
  - Khai báo trường `icon?: string` trong `UpdateBoardDto` và `CreateBoardDto` với Swagger API property và validator.
  - Cập nhật `boards.service.ts`:
    - Trong `findById`: Lấy ra và trả về `icon: b.icon ?? null`.
    - Trong `update`: Cập nhật `icon` và `background`.
    - **Cơ chế Fallback thông minh:** Nếu database chưa chạy migration (Postgres error `42703`), bắt lỗi và tự động lưu `icon` tích hợp vào trường `background` dưới dạng JSON `{ bg: ..., icon: ... }` để đảm bảo tính năng hoạt động 100% ngay cả khi chưa migrate database.
    - Phát broadcast event `BOARD_UPDATED` qua Supabase Realtime để các client đồng bộ ngay lập tức.
- **Tiêu chí hoàn thành (DoD):**
  - Chạy `npm run build` trong `backend` thành công 0 lỗi.
  - API `PATCH /boards/:id` nhận và cập nhật được cả `background` và `icon`.

---

### Workstream B: Frontend (Appearance Modal, Dynamic Favicon & Board Header/Sidebar UI)
- **Kỹ sư phụ trách:** `engineer-frontend`
- **Allowed Files:**
  1. `frontend/components/board/BoardAppearanceModal.tsx` (File mới)
  2. `frontend/components/modals/EditBoardModal.tsx`
  3. `frontend/app/boards/[boardId]/page.tsx`
  4. `frontend/components/layout/Sidebar.tsx`
- **Mục tiêu triển khai:**
  - Tạo mới component `BoardAppearanceModal.tsx`:
    - Tab 1: **Hình nền (Background)**:
      - 8 gradient hiện đại tuyệt đẹp (Sunset, Ocean, Emerald, Violet, Midnight, Aurora, Peach, Amber).
      - 6 màu đơn sắc (Slate, Navy, Emerald, Rose, Amber, Purple).
      - 6 ảnh nền nghệ thuật Unsplash có sẵn (Thiên nhiên, Núi tuyết, Biển, Văn phòng hiện đại, Kiến trúc).
      - Tùy chọn nhập URL ảnh bất kỳ.
      - Nút "Mặc định" để xóa hình nền về dạng lưới chấm dot-pattern ban đầu.
    - Tab 2: **Biểu tượng Favicon (Board Icon)**:
      - Bảng chọn nhanh hơn 40 biểu tượng Emoji phổ biến theo nhóm (Công việc, Kỹ thuật, Sáng tạo, Mục tiêu).
      - Ô nhập emoji hoặc ký tự tùy biến.
      - Nút "Gỡ biểu tượng".
    - Khu vực Xem trước (Live Preview): Thể hiện diện mạo của Board ngay trong modal trước khi bấm Lưu.
  - Tích hợp vào `frontend/app/boards/[boardId]/page.tsx`:
    - Hiệu ứng `useEffect` cập nhật `<link rel="icon">` trên tab trình duyệt sang SVG data URI của emoji hoặc link ảnh. Tự động phục hồi icon mặc định khi unmount trang.
    - Tiêu đề tab `document.title` phản ánh đúng `<icon> <name> | Planify`.
    - Hiển thị icon cạnh tên Board ở thanh điều hướng trên cùng, cho phép click để mở nhanh `BoardAppearanceModal`.
    - Thêm mục *"Đổi hình nền & Biểu tượng"* vào Board Menu (`MoreHorizontal`).
    - Nâng cấp style container Board: Nếu có `board.background`, render background ảnh hoặc gradient với `backgroundSize: 'cover', backgroundPosition: 'center'`, kết hợp lớp phủ mờ nhẹ cho thanh công cụ và danh sách Kanban để chữ và thẻ luôn nổi bật, tương phản sắc nét.
  - Tích hợp vào `frontend/components/modals/EditBoardModal.tsx`:
    - Bổ sung section hoặc nút bấm liên kết trực tiếp để mở tùy chỉnh hình nền & favicon.
  - Tích hợp vào `frontend/components/layout/Sidebar.tsx`:
    - Hiển thị icon của board (nếu có) thay cho icon Kanban mặc định trong danh sách Bảng.
- **Tiêu chí hoàn thành (DoD):**
  - Chạy `npx tsc --noEmit` trong `frontend` đạt 0 lỗi.
  - Người dùng có thể chọn đổi hình nền và biểu tượng, tab trình duyệt đổi favicon tức thì.

---

## 4. Kịch bản Kiểm thử cho QA (`qa-auditor`)

Sau khi cả 2 Workstream hoàn tất, `qa-auditor` sẽ thực hiện kiểm thử nghiệm thu theo các bước sau:

1. **Kiểm tra Tích hợp Tĩnh (Static Build Check):**
   - Chạy `npm run build` trong `backend` -> Đạt 0 lỗi.
   - Chạy `npx tsc --noEmit` trong `frontend` -> Đạt 0 lỗi.
2. **Kiểm thử Thay đổi Biểu tượng & Favicon (Browser E2E):**
   - Mở Board bất kỳ trên trình duyệt (`http://localhost:3000/boards/...`).
   - Bấm vào biểu tượng cạnh tên Board hoặc vào Menu -> *"Đổi hình nền & Biểu tượng"*.
   - Chọn một icon (ví dụ: `🚀`).
   - **Xác minh:**
     - [ ] Tiêu đề tab trình duyệt đổi thành `🚀 [Tên Board] | Planify`.
     - [ ] Favicon trên tab trình duyệt hiển thị đúng emoji `🚀`.
     - [ ] Biểu tượng `🚀` xuất hiện cạnh tên Board trên thanh header.
     - [ ] Thanh Sidebar hiển thị `🚀` cạnh tên Board.
3. **Kiểm thử Thay đổi Hình nền (Browser E2E):**
   - Chọn một hình nền Gradient (ví dụ: Ocean Blue hoặc Sunset).
   - **Xác minh:**
     - [ ] Toàn bộ không gian Board chuyển sang nền Gradient tương ứng.
     - [ ] Các thẻ và danh sách Kanban hiển thị rõ ràng, không bị chìm hay khó đọc.
   - Chọn một ảnh Unsplash hoặc dán URL ảnh -> Nền Board đổi sang ảnh nền hiển thị vừa vặn (`cover`).
   - Bấm "Đặt lại mặc định" -> Nền Board trở về nền lưới chấm sáng ban đầu.
4. **Kiểm thử Tính Bền vững (Persistence & Refresh):**
   - F5 (Reload trang) -> Hình nền và Favicon đã lưu vẫn được giữ nguyên vẹn.
   - Mở tab mới hoặc chuyển sang Dashboard -> Favicon tab trở về mặc định của Planify.
