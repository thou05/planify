# TECHNICAL SPECIFICATION & WORKSTREAM PLAN: BOARD MEMBER FILTER FIX V2

- **Feature ID:** `FEAT-BOARD-FILTER-FIX-V2`
- **Scope:** 
  - `frontend/app/boards/[boardId]/page.tsx`
  - `frontend/components/board/BoardFilterModal.tsx`
- **Author:** Technical Architect
- **Status:** Approved for Implementation

---

## 1. Tổng quan & Kiến trúc

### 1.1. Giải pháp kỹ thuật tổng thể
Xây dựng cơ chế so khớp thành viên đa tầng và toàn diện (Universal Bidirectional Member Matcher):
1. **Thiết lập bản đồ tra cứu hai chiều từ `board.members`:**
   - `memberIdToUserIdMap`: Map từ `board_member.id` -> `user_id`
   - `userIdToMemberIdMap`: Map từ `user_id` -> `board_member.id`
   - `currentMemberId`: ID của bản ghi `board_members` thuộc về `user.id` hiện tại.
2. **Bộ giải mã nhận dạng gán thẻ (Card Assignee Matcher):**
   Một assignee `ca` trên thẻ được coi là khớp với mục tiêu `target` (có thể là User ID, BoardMember ID hoặc 'assigned_to_me') nếu thỏa mãn bất kỳ điều kiện nào sau đây:
   - Khớp trực tiếp `user_id`: `ca.user_id === targetUserId || ca.user?.id === targetUserId`
   - Khớp qua `board_member`: `ca.board_member?.user_id === targetUserId || ca.board_member?.user?.id === targetUserId`
   - Khớp trực tiếp `board_member_id`: `ca.board_member_id === targetMemberId || ca.member_id === targetMemberId || ca.board_member?.id === targetMemberId`
   - Khớp chéo qua bảng tra cứu: `memberIdToUserIdMap.get(ca.board_member_id || ca.member_id || ca.id) === targetUserId`
   - Khớp qua email: `user?.email && (ca.user?.email === user.email || ca.board_member?.user?.email === user.email)`
3. **Hiển thị đầy đủ mọi thành viên trong `BoardFilterModal`:**
   - Xóa bỏ điều kiện lọc `uid !== currentUser?.id`.
   - Hiển thị đầy đủ tất cả thành viên trong bảng, bao gồm cả "Nguyễn Công Thắng", với nhãn `(Bạn)` tinh tế bên cạnh để người dùng dễ nhận biết.
4. **Đồng bộ tính toán đếm thẻ (Counts Calculation):**
   - Áp dụng cùng logic so khớp toàn diện cho việc tính badge `counts.assigned_to_me`, `counts.no_members` và `counts.members[id]`.

---

## 2. Giao diện kết nối (Shared Contracts & Types)

```typescript
// Shared Types & Helpers
export interface BoardFilterState {
  keyword: string;
  members: string[]; // 'no_members' | 'assigned_to_me' | userId | boardMemberId
  labels: string[];  // 'no_labels' | labelId
  cardStatus: ('completed' | 'not_completed')[];
  dueDates: ('no_date' | 'overdue' | 'due_tomorrow' | 'due_next_week' | 'due_next_month')[];
  activities: ('past_week' | 'past_2_weeks' | 'past_4_weeks' | 'no_activity_4_weeks')[];
  matchMode: 'any' | 'all';
}
```

---

## 3. Workstreams chạy song song (Zero-Overlap)

### Workstream A: Board Detail Page Filter Logic & Multi-view Synchronization
- **File được phép sửa:** `frontend/app/boards/[boardId]/page.tsx`
- **Mục tiêu:**
  1. Tạo `memberIdToUserIdMap`, `userIdToMemberIdMap` và `currentMemberId` memoized từ `board?.members` và `user`.
  2. Nâng cấp hàm kiểm tra thành viên `checkMember` bên trong `filteredLists` để hỗ trợ tra cứu chéo cả `user_id`, `board_member_id`, `member_id`, `ca.user.id`, `ca.board_member.id`, và email.
  3. Xử lý logic `boardFilters.members`:
     - `'no_members'`: thẻ không có `card_assignees` hoặc mảng rỗng.
     - `'assigned_to_me'`: kiểm tra gán cho `currentUserId` hoặc `currentMemberId`.
     - Các ID cụ thể: kiểm tra khớp qua `targetUserId` và `targetMemberId`.
     - Trong ngữ cảnh lọc thành viên: hỗ trợ chế độ OR (`some`) khi `matchMode === 'any'`, hoặc `every` khi `matchMode === 'all'`.
  4. Đảm bảo `filteredLists` cập nhật phản ứng tức thì và `totalFilteredCards` đếm chuẩn xác số thẻ đang hiển thị.

### Workstream B: Board Filter Modal UI & Badge Counts Refactor
- **File được phép sửa:** `frontend/components/board/BoardFilterModal.tsx`
- **Mục tiêu:**
  1. Xóa bỏ dòng lọc `uid !== currentUser?.id` tại danh sách thành viên cụ thể của bảng, cho phép "Nguyễn Công Thắng" xuất hiện đầy đủ trong danh sách.
  2. Bổ sung nhãn `(Bạn)` bên cạnh tên của người dùng đăng nhập trong danh sách thành viên để dễ phân biệt.
  3. Cập nhật khối tính toán `counts`:
     - Tạo bảng tra cứu ánh xạ hai chiều giữa `board_member.id` và `user_id`.
     - Sử dụng hàm kiểm tra toàn diện để tính chính xác badge cho:
       - `counts.no_members`
       - `counts.assigned_to_me`
       - `counts.members[uid]` và `counts.members[m.id]` (ghi nhận cả hai key để dù UI tra cứu theo key nào cũng hiển thị số đếm chuẩn xác 100%).
  4. Khi tích chọn thành viên cụ thể hoặc "Các thẻ đã chỉ định cho tôi", truyền mảng `filters.members` chuẩn xác tới `onChangeFilters`.

