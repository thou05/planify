# ĐẶC TẢ THIẾT KẾ: REALTIME ACTION & AVATAR PRESENCE CHO KHÁCH (GOOGLE DOCS STYLE)

> Tài liệu thiết kế bởi **Technical Architect**  
> Tham chiếu yêu cầu: Hiển thị avatar/icon realtime cho khách (Guest) khi truy cập vào 1 board ngoài giống Google Docs.

---

## 1. Tổng quan & Kiến trúc (Overview & Architecture)

### 1.1 Vấn đề hiện tại
- Hiện tại, thanh avatar ở góc trên bên phải của trang Board (`frontend/app/boards/[boardId]/page.tsx` dòng 1905–1950) chỉ lặp qua danh sách tĩnh `(board?.members || []).slice(0, 5)`:
  1. Nếu một **Khách (Guest)** hoặc người dùng bên ngoài truy cập vào một Bảng (kể cả khi đã tham gia qua kênh Supabase Realtime Presence WebSocket), **avatar của họ hoàn toàn không được hiển thị** nếu họ không nằm trong 5 thành viên đầu tiên của `board.members`, hoặc nếu họ là khách ngoài chưa có bản ghi tĩnh trong `board_members`.
  2. Thành viên offline vẫn chiếm vị trí avatar ở thanh tiêu đề, trong khi người đang trực tuyến (Online Presence) lại không được ưu tiên hiển thị.
  3. Thiếu trải nghiệm cộng tác trực quan kiểu **Google Docs / Figma**: khi có khách hoặc cộng tác viên truy cập vào xem/thao tác trên bảng, avatar của họ cần xuất hiện ngay lập tức theo thời gian thực (Realtime Presence) kèm viền màu sinh động, nhãn nhận diện "Khách", và tooltip hiển thị trạng thái hoạt động.

### 1.2 Giải pháp Kiến trúc Realtime Presence (Google Docs Style)
1. **Kiến trúc Kênh Presence (WebSocket Channel):**
   - Kênh WebSocket `board:${boardId}` sử dụng Supabase Realtime Presence & Broadcast:
     - Khi bất kỳ ai (Chủ sở hữu, Thành viên hay Khách ngoài) truy cập vào Bảng, client tự động kích hoạt `channel.track(...)` và gửi broadcast `USER_PRESENCE_JOIN`.
     - Payload presence bao gồm: `user_id`, `name`, `avatar`, `email`, `isGuest: boolean`, và `color: string` (mã màu Google Docs ngẫu nhiên/xác định).
     - Hỗ trợ cả trường hợp khách vãng lai/ẩn danh (tự sinh guest session ID và tên kiểu Google Docs: "Khách Ẩn Danh", "Cáo Ẩn Danh", v.v.).
     - Khi người dùng rời khỏi trang hoặc đóng tab, Supabase tự động phát `presence:leave` và broadcast `USER_PRESENCE_LEAVE` để gỡ avatar ra khỏi thanh presence tức thì.
2. **Thanh Avatar Cộng Tác Trực Tuyến (Live Presence Avatar Stack):**
   - Thay thế việc chỉ duyệt qua `board.members` bằng danh sách **Active Users** thời gian thực (`activeUsersList`):
     - Tất cả người dùng đang mở bảng (bao gồm Khách) sẽ xuất hiện trên thanh Avatar Stack.
     - Mỗi avatar có viền màu phong cách Google Docs (Emerald, Blue, Purple, Amber, Rose, Cyan, Indigo).
     - Khách (Guest) có huy hiệu nhận diện đặc trưng (Badge `Khách (Guest)` màu hổ phách/cam).
     - Hover vào avatar hiển thị Tooltip chi tiết: Tên, Email, Vai trò ("Khách (Guest) • Đang xem bảng" hoặc "Thành viên • Đang trực tuyến"), và chỉ báo "🟢 Đang hoạt động theo thời gian thực".
     - Có chỉ báo số lượng người đang xem trực tiếp (Pill `🟢 {N} đang xem`).
     - Bấm vào thanh avatar mở Popover danh sách toàn bộ người đang trực tuyến trên bảng.
3. **Đồng bộ Hành động Realtime (Realtime Actions):**
   - Khi Khách thao tác (di chuyển card, sửa nội dung card nếu có quyền Editor), các sự kiện `CARD_MOVED`, `CARD_UPDATED` vẫn được broadcast mượt mà tới tất cả người xem khác mà không cần tải lại trang.

---

## 2. Giao diện kết nối (Shared Contracts)

### 2.1 Presence User Payload (`PresenceUserState`)
```typescript
export interface PresenceUser {
  id: string; // user_id hoặc guest session id
  name: string;
  avatar?: string | null;
  email?: string | null;
  isGuest: boolean;
  color: string; // Mã màu hex Google Docs (ví dụ: #10b981, #3b82f6, #f59e0b, #8b5cf6,...)
  online_at: string;
}
```

### 2.2 Broadcast Events Schema
```typescript
// Sự kiện khi người dùng/khách gia nhập bảng
interface UserPresenceJoinPayload {
  user_id: string;
  name: string;
  avatar?: string | null;
  email?: string | null;
  isGuest: boolean;
  color: string;
}

// Sự kiện khi người dùng/khách rời bảng
interface UserPresenceLeavePayload {
  user_id: string;
}
```

### 2.3 Bảng màu sắc phong cách Google Docs
```typescript
export const GOOGLE_DOCS_PRESENCE_COLORS = [
  { border: '#10b981', bg: '#ecfdf5', text: '#065f46', ring: 'ring-emerald-500', name: 'Emerald' },
  { border: '#3b82f6', bg: '#eff6ff', text: '#1e40af', ring: 'ring-blue-500', name: 'Blue' },
  { border: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6', ring: 'ring-purple-500', name: 'Purple' },
  { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', ring: 'ring-amber-500', name: 'Amber' },
  { border: '#ec4899', bg: '#fdf2f8', text: '#9d174d', ring: 'ring-pink-500', name: 'Pink' },
  { border: '#06b6d4', bg: '#ecfeff', text: '#155e75', ring: 'ring-cyan-500', name: 'Cyan' },
  { border: '#6366f1', bg: '#eef2ff', text: '#3730a3', ring: 'ring-indigo-500', name: 'Indigo' },
  { border: '#f43f5e', bg: '#fff1f2', text: '#9f1239', ring: 'ring-rose-500', name: 'Rose' },
];
```

---

## 3. Danh sách Workstreams Chạy Song Song (Parallel Safety - Zero Overlap)

### Workstream A: Backend Presence & Guest Board Context
- **Mục tiêu:**
  1. Rà soát và đảm bảo API `GET /boards/:id` trong `backend/src/modules/boards/boards.service.ts` trả về đầy đủ cờ `isGuest: boolean`, `currentUserBoardRole`, thông tin người dùng khách và `isWorkspaceMember` để client nhận diện chính xác trạng thái Khách.
  2. Đảm bảo hỗ trợ truy cập an toàn cho người dùng ngoài đối với bảng mà họ là khách (hoặc bảng Public), không bị chặn nhầm bởi `ForbiddenException`.
- **File được phép sửa (Allowed Files):**
  - `backend/src/modules/boards/boards.service.ts`
- **Tiêu chí hoàn thành (DoD):**
  - `npm run build` tại thư mục `backend` chạy thành công 0 lỗi.
  - Phản hồi từ `findById` chứa đầy đủ metadata nhận diện Khách.

---

### Workstream B: Frontend Google Docs Live Presence Bar & Avatar Stack
- **Mục tiêu:**
  1. Tạo component mới `frontend/components/board/LivePresenceBar.tsx`:
     - Hiển thị danh sách avatar những người **đang thực sự trực tuyến** trên Bảng (bao gồm Khách và Thành viên).
     - Áp dụng phong cách Google Docs: viền avatar có màu sắc riêng biệt, dấu chấm xanh realtime nhấp nháy, tooltip chi tiết, badge nhận diện "Khách (Guest)".
     - Có nút hiển thị tổng số người đang trực tuyến (ví dụ: `🟢 2 người đang xem`), khi click mở popover danh sách chi tiết những ai đang có mặt.
     - Hiệu ứng chuyển động mượt mà khi có người gia nhập hoặc rời khỏi bảng.
  2. Cập nhật `frontend/app/boards/[boardId]/page.tsx`:
     - Nâng cấp hàm `trackCurrentPresence`: Luôn gửi đầy đủ `isGuest`, `color`, `email`, `avatar` và hỗ trợ khách ngoài (kể cả khách vãng lai qua `sessionStorage`).
     - Tích hợp component `LivePresenceBar` vào thanh công cụ của Board, thay thế avatar stack tĩnh cũ.
     - Đảm bảo khi khách di chuyển card hoặc cập nhật, các sự kiện broadcast gửi kèm thông tin định danh mượt mà.
- **File được phép sửa (Allowed Files):**
  - `frontend/components/board/LivePresenceBar.tsx`
  - `frontend/app/boards/[boardId]/page.tsx`
- **Tiêu chí hoàn thành (DoD):**
  - `npm run build` tại thư mục `frontend` chạy thành công 0 lỗi.
  - Khi mở 2 trình duyệt/tab khác nhau (hoặc 1 thành viên và 1 khách ngoài), avatar của Khách lập tức hiển thị nổi bật trên thanh công cụ giống Google Docs.

---

## 4. Kịch bản Kiểm thử cho QA Auditor (Test Scenarios)

1. **Static Build & Type Check:**
   - `backend`: `npm run build` không lỗi.
   - `frontend`: `npm run build` không lỗi.
2. **Kiểm thử Presence của Khách trên Board:**
   - Mở Board với tài khoản chính (Owner/Member).
   - Mở thêm 1 phiên trình duyệt khác (hoặc tab ẩn danh / tài khoản khách) truy cập cùng Board đó.
   - Quan sát thanh Avatar ở góc phải trên:
     - Avatar của Khách xuất hiện ngay lập tức trên thanh Live Presence mà không cần F5.
     - Avatar của Khách có viền màu sắc Google Docs, badge "Khách" rõ ràng.
     - Hover vào avatar hiển thị Tooltip: Tên khách, Email, vai trò "Khách (Guest) • Đang xem bảng", trạng thái trực tuyến.
3. **Kiểm thử Rời khỏi Board (Presence Leave):**
   - Đóng tab của Khách.
   - Quan sát tab của tài khoản chính: Avatar của Khách tự động biến mất khỏi thanh presence trong vòng 1-2 giây.
4. **Kiểm thử Thao tác Realtime:**
   - Khách hoặc thành viên di chuyển một card trên Kanban board.
   - Tab còn lại thấy vị trí card được cập nhật tức thì theo thời gian thực.
