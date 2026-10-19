# KẾ HOẠCH TRIỂN KHAI PHÂN QUYỀN & PHÂN CÔNG (PERMISSION & ASSIGNMENT SPEC)

> Tham chiếu gốc: `documents/PERMISSION_AND_ASSIGNMENT_PLAN_v2.md`
> Phiên bản: 2.0 (Triển khai chuẩn hóa theo mô hình 2 tầng phân quyền độc lập)

---

## 1. Tổng quan & Kiến trúc

Hệ thống Planify phân tách rành mạch giữa 2 khái niệm:
- **Quyền truy cập (Permission)**: Quyết định người dùng được phép thực hiện những hành động gì. Tồn tại ở 2 tầng độc lập:
  1. `Workspace Role`: `ADMIN`, `MEMBER`, `GUEST` (quản trị không gian làm việc).
  2. `Board Role`: `ADMIN`, `EDITOR`, `VIEWER` (quản trị và thao tác trong từng bảng cụ thể).
- **Phân công nhiệm vụ (Assignment)**: Chỉ thể hiện ai chịu trách nhiệm cho Card (`card_assignees` / `CardMember`). **Assignment tuyệt đối không sinh thêm quyền chỉnh sửa**.

### Các nguyên tắc vàng (Invariants):
1. **Workspace ADMIN ≠ Board ADMIN**: Không suy luận tự động quyền bảng từ quyền workspace. Người dùng muốn truy cập và thao tác trong Board bắt buộc phải có bản ghi `board_members`.
2. **Quyền thao tác Board**:
   - `ADMIN`: Toàn quyền trên Board (sửa board, quản lý thành viên, đổi role, xóa thành viên, tạo/sửa/xóa list & card, assign).
   - `EDITOR`: Làm việc trực tiếp (tạo/sửa/xóa list & card, assign card, mời thành viên vào board). **Không được xóa thành viên, không được đổi role, không được sửa settings board**.
   - `VIEWER`: Chỉ xem thông tin bảng, danh sách, thẻ, checklist, tệp đính kèm và gửi bình luận (comment). **Không được tạo/sửa/di chuyển/xóa bất kỳ nội dung nào và không được gán nhiệm vụ**.
3. **Quy tắc phân công Card**:
   - Chỉ thành viên đã tham gia Board (`BoardMember`) với vai trò `ADMIN` hoặc `EDITOR` mới được hiển thị trong danh sách gán và được phân công Card.
   - `VIEWER` và người dùng chỉ thuộc Workspace (chưa vào Board) **không được phép gán vào Card**.
   - Người thực hiện thao tác gán (Actor) phải có vai trò `ADMIN` hoặc `EDITOR`.
4. **Xử lý dọn dẹp liên hoàn (Cascading Cleanups)**:
   - Khi hạ quyền thành viên Board từ `ADMIN`/`EDITOR` xuống `VIEWER`: Tự động gỡ bỏ thành viên đó khỏi tất cả các Card được gán trong Board này.
   - Khi xóa thành viên khỏi Board (hoặc thành viên rời Board): Tự động gỡ bỏ tất cả các Card Assignment của thành viên đó trong Board trước khi xóa `BoardMember`.
   - Khi xóa thành viên khỏi Workspace (hoặc rời Workspace): Tự động gỡ bỏ Card Assignment và Board Membership ở tất cả các Board thuộc Workspace đó trước khi xóa `WorkspaceMember`.

---

## 2. Giao diện kết nối (Shared Contracts)

### 2.1 Backend Endpoints mới & chuẩn hóa

1. **Lấy danh sách thành viên có thể phân công cho Card**:
   - **Endpoint**: `GET /api/v1/boards/:boardId/assignable-members`
   - **Mô tả**: Trả về danh sách `BoardMember` có `role IN ('ADMIN', 'EDITOR')`.
   - **Response Contract**:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "data": [
         {
           "id": "uuid-board-member",
           "board_id": "uuid-board",
           "user_id": "uuid-user",
           "role": "ADMIN" | "EDITOR",
           "joined_at": "ISO-date",
           "user": {
             "id": "uuid-user",
             "name": "Nguyen Van A",
             "email": "a@example.com",
             "avatar": "url-or-null"
           }
         }
       ]
     }
     ```

2. **Phân công / Gỡ phân công Card (`POST /api/v1/cards/:cardId/members`)**:
   - **Request Body**:
     ```json
     {
       "memberId": "uuid-user-or-board-member"
     }
     ```
   - **Validation**:
     - Actor phải có role `ADMIN` hoặc `EDITOR` trên Board chứa Card.
     - Target user phải thuộc Board và có role `ADMIN` hoặc `EDITOR`.
     - Nếu Target user là `VIEWER` hoặc không thuộc Board -> trả về HTTP 400 Bad Request.

3. **Mời / Thêm thành viên vào Board (`POST /api/v1/boards/:boardId/members`)**:
   - **Quyền gọi**: `ADMIN` hoặc `EDITOR`.
   - **Quy tắc role**: Nếu Actor là `EDITOR`, role mặc định và duy nhất gán cho thành viên mới là `EDITOR`. Chỉ `ADMIN` mới được chỉ định role ban đầu hoặc đổi role sau này.

4. **Đổi vai trò thành viên Board (`PATCH /api/v1/boards/:boardId/members/:userId`)**:
   - **Quyền gọi**: Chỉ `ADMIN`.
   - **Cleanup**: Nếu `role === 'VIEWER'`, xóa mọi bản ghi `card_assignees` của `userId` thuộc các card trong `boardId`.

5. **Xóa thành viên Board (`DELETE /api/v1/boards/:boardId/members/:userId`)**:
   - **Quyền gọi**: Chỉ `ADMIN` (`EDITOR` bị chặn HTTP 403 Forbidden).
   - **Cleanup**: Xóa mọi `card_assignees` của `userId` trong board trước khi xóa `board_members`.

---

## 3. Danh sách Workstreams chạy song song (Zero-Overlap)

### Workstream A: Backend Permission & Assignment Core
- **Mục tiêu**:
  1. Thêm endpoint `GET /boards/:boardId/assignable-members` trong `boards.controller.ts` & `boards.service.ts`.
  2. Cập nhật `cards.service.ts`:
     - Kiểm tra quyền Actor: chỉ `ADMIN` và `EDITOR` mới được assign/unassign.
     - Kiểm tra quyền Target: chỉ người có `BoardMember.role IN ('ADMIN', 'EDITOR')` mới được assign. Chặn `VIEWER` và chặn user ngoài Board (kể cả thuộc Workspace).
     - Chuẩn hóa `verifyBoardAccess`: không tự suy diễn Workspace Admin thành Board Admin; yêu cầu BoardMember rõ ràng cho các thao tác sửa đổi.
  3. Cập nhật `boards.service.ts`:
     - Phân quyền mời: `ADMIN` & `EDITOR` đều được mời; nếu `EDITOR` mời thì gán cứng role `EDITOR`.
     - Phân quyền xóa & đổi role: chỉ `ADMIN` được thực hiện.
     - Thêm logic dọn dẹp `card_assignees` khi chuyển role sang `VIEWER` hoặc khi xóa thành viên khỏi Board.
  4. Cập nhật `workspaces.service.ts`:
     - Khi xóa thành viên khỏi Workspace (hoặc rời Workspace), dọn dẹp các `card_assignees` và `board_members` của user trong các board của workspace đó.
- **Allowed Files (Độc quyền Workstream A)**:
  - `backend/src/modules/boards/boards.controller.ts`
  - `backend/src/modules/boards/boards.service.ts`
  - `backend/src/modules/cards/cards.controller.ts`
  - `backend/src/modules/cards/cards.service.ts`
  - `backend/src/modules/workspaces/workspaces.service.ts`
- **Tiêu chí hoàn thành**:
  - `npm run build` ở backend biên dịch thành công (0 lỗi).
  - Không còn lỗ hổng gán user ngoài board hoặc gán Viewer vào Card.

---

### Workstream B: Frontend Permission Helpers, Board View & Modal Experience
- **Mục tiêu**:
  1. Tạo tệp helper tập trung `frontend/lib/permissions.ts` định nghĩa các hàm:
     - `canManageWorkspace`, `canCreateBoard`
     - `canManageBoard`, `canEditBoardContent`, `canInviteBoardMember`, `canManageBoardMembers`, `canAssignCard`, `canComment`.
  2. Nâng cấp `CardDetailModal.tsx`:
     - Fetch danh sách thành viên phân công từ `/boards/:boardId/assignable-members` thay vì hiển thị toàn bộ `workspaceMembers`.
     - Ẩn/hiện nút `+ Add Member` và các chức năng chỉnh sửa checklist, attachment, due date theo role của người dùng hiện tại (chỉ `ADMIN` và `EDITOR` được sửa). `VIEWER` chỉ xem và comment.
  3. Nâng cấp `ShareBoardModal.tsx`:
     - Cho phép cả `ADMIN` và `EDITOR` mở modal và mời thành viên.
     - Nếu người dùng hiện tại là `EDITOR`: Ẩn nút Xóa thành viên (`Remove`), vô hiệu hóa hoặc ẩn dropdown đổi role (`Change Role`), mặc định role thêm mới là `EDITOR`.
     - Nếu người dùng là `ADMIN`: Giữ nguyên đầy đủ quyền quản lý.
  4. Cập nhật `frontend/app/boards/[boardId]/page.tsx`:
     - Áp dụng các helper từ `permissions.ts` cho các nút Create List, Create Card, Drag-and-drop, Board Settings, Automation.
     - Truyền `boardId` và quyền hạn chính xác vào `CardDetailModal`.
- **Allowed Files (Độc quyền Workstream B)**:
  - `frontend/lib/permissions.ts` (Tạo mới)
  - `frontend/components/modals/CardDetailModal.tsx`
  - `frontend/components/modals/ShareBoardModal.tsx`
  - `frontend/app/boards/[boardId]/page.tsx`
- **Tiêu chí hoàn thành**:
  - `npm run build` ở frontend biên dịch thành công (0 lỗi Turbopack & TypeScript).
  - Giao diện phản hồi chuẩn xác theo 3 role `ADMIN`, `EDITOR`, `VIEWER`.

---

## 4. Kịch bản Kiểm thử cho QA (`qa-auditor`)

| Mã TC | Ngữ cảnh (Given) | Hành động (When) | Kết quả kỳ vọng (Then) |
|---|---|---|---|
| **TC01** | User = Workspace ADMIN | Mời thành viên vào Workspace | **ALLOW** (Thành công) |
| **TC02** | User = Workspace MEMBER | Đổi Workspace Role người khác | **DENY** (Bị chặn 403) |
| **TC03** | User = Board ADMIN | Mời / Đổi Role / Xóa thành viên Board | **ALLOW** (Thành công) |
| **TC04** | User = Board EDITOR | Tạo Card, Sửa Card, Di chuyển Card | **ALLOW** (Thành công) |
| **TC05** | User = Board EDITOR | Mời thành viên mới vào Board | **ALLOW** (Thành công với role mặc định EDITOR) |
| **TC05B**| User = Board EDITOR | Xóa thành viên khỏi Board | **DENY** (403 Forbidden) |
| **TC05C**| User = Board EDITOR | Thay đổi Board Role của thành viên | **DENY** (403 Forbidden) |
| **TC06** | User = Board VIEWER | Thử tạo List, sửa Card, kéo thả Card | **DENY** (UI ẩn nút, Backend chặn 403) |
| **TC07** | Actor = Board ADMIN/EDITOR, Target = Board EDITOR | Gán Target vào Card | **ALLOW** (Thành công) |
| **TC08** | Actor = Board ADMIN/EDITOR, Target = Board VIEWER | Gán Target vào Card | **DENY** (400 Bad Request, không hiện trong selector) |
| **TC09** | Target ∈ Workspace nhưng Target ∉ Board | Gán Target vào Card | **DENY** (400 Bad Request, không hiện trong selector) |
| **TC10** | User đang được assign Card trong Board | Admin xóa User khỏi Board | **CLEANUP** (Toàn bộ `card_assignees` của user trong board bị gỡ bỏ) |
| **TC11** | User = EDITOR đang được assign Card | Admin hạ role User thành VIEWER | **CLEANUP** (Toàn bộ `card_assignees` của user trong board bị gỡ bỏ) |
| **TC12** | User = EDITOR không được assign Card X | User sửa nội dung Card X | **ALLOW** (Quyền sửa đến từ BoardRole, không phụ thuộc Assignment) |
