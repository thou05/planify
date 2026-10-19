# ĐẶC TẢ THIẾT KẾ: GỘP KHÁCH (GUEST) VÀ PHÂN QUYỀN WORKSPACE GUEST

> Tài liệu thiết kế bởi **Technical Architect**  
> Tham chiếu nghiệp vụ: `documents/PERMISSION_AND_ASSIGNMENT_PLAN_v2.md`

---

## 1. Tổng quan & Kiến trúc (Overview & Architecture)

### 1.1 Bối cảnh & Vấn đề
- Trước đây hệ thống tách riêng biệt giữa "Khách 1 bảng" (Single-board guest) và "Khách đa bảng" (Multi-board guest) trong giao diện Không gian làm việc và API payload. Điều này gây phân mảnh trải nghiệm quản lý thành viên và không đồng nhất với tài liệu nghiệp vụ chuẩn (`PERMISSION_AND_ASSIGNMENT_PLAN_v2.md`).
- Theo tài liệu nghiệp vụ chuẩn:
  - Cấp Workspace chỉ có 3 role: `ADMIN`, `MEMBER`, `GUEST` (thứ tự quyền: `ADMIN > MEMBER > GUEST`).
  - Khách (Guest) là khái niệm thống nhất cho người dùng bên ngoài được mời tham gia vào một hoặc nhiều Board trong Workspace, hoặc có vai trò `GUEST` tại Workspace.
  - **Quyền hạn của Khách (Guest) tại Workspace:**
    - Được xem Workspace ở mức cơ bản.
    - Chỉ được xem danh sách những Board mà Khách được thêm vào (`BoardMember`).
    - **TUYỆT ĐỐI KHÔNG ĐƯỢC TẠO BOARD** (`canCreateBoard: false`). Backend phải từ chối khi Khách gọi API tạo Board.
    - Không được sửa/xóa Workspace, không được mời/xóa thành viên Workspace, không đổi role Workspace.
  - **Quyền hạn của Khách tại từng Board:**
    - Được xác định độc lập thông qua `BoardMember.role` (`ADMIN`, `EDITOR`, `VIEWER`), không được suy luận mặc định `Workspace GUEST = Board VIEWER`.

### 1.2 Giải pháp Kiến trúc Thống nhất
1. **Dữ liệu & API Backend:**
   - Hợp nhất dữ liệu danh sách khách thành một danh sách duy nhất `guests` trong payload của Workspace:
     - Mỗi khách có `guestType: 'GUEST'`, `guestTypeLabel: 'Khách (Guest)'`, `boardCount: number`, và danh sách `boards: Array<{ id, name, role, boardMemberId }>`.
     - Trả về `guestCount = guests.length`. Vẫn duy trì các alias tương thích ngược (`singleBoardGuests: guests`, `multiBoardGuests: guests`) để tránh break các client cũ nếu có.
   - Chặn quyền tạo Bảng:
     - Trong `boards.service.ts` -> method `create()`: Kiểm tra quyền Workspace của user. Nếu user là `GUEST` (hoặc chỉ là board guest không phải Workspace Owner/Admin/Member), ném `ForbiddenException('Thành viên dạng Khách (Guest) không có quyền tạo Bảng mới trong Không gian làm việc.')`.
   - Lọc danh sách Bảng cho Khách:
     - Trong `boards.service.ts` -> `findAllInWorkspace()` và `workspaces.service.ts` -> `findById()`: Nếu user là `GUEST`, chỉ trả về danh sách các Board mà user đó có bản ghi trong `board_members`.
2. **Giao diện Frontend:**
   - Trong `frontend/app/workspaces/[workspaceId]/page.tsx`:
     - Gộp 2 sub-tab `single_guests` và `multi_guests` thành 1 sub-tab duy nhất: `guests` với nhãn `Khách (Guest) ({workspace?.guestCount || 0})`.
     - Hợp nhất UI danh sách khách: hiển thị thông tin user, nhãn "Khách (Guest)", số lượng bảng tham gia, danh sách các bảng kèm role trên từng bảng (có dropdown cho phép Workspace Admin đổi role trên từng bảng), nút thêm vào Workspace, nút xóa khỏi bảng.
     - Ẩn hoặc disable nút "Tạo Board mới" (cả ở Hero Header và trong Grid danh sách Board) khi `currentUserRole === 'GUEST'` hoặc `!canCreateBoard(...)`.
   - Trong `frontend/lib/permissions.ts`:
     - Đảm bảo hàm `canCreateBoard` chỉ trả về `true` cho `OWNER`, `ADMIN`, `MEMBER`. Role `GUEST` trả về `false`.

---

## 2. Giao diện kết nối (Shared Contracts)

### 2.1 Workspace Guest Model
```typescript
export interface WorkspaceGuestItem {
  id: string; // user_id
  user_id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  guestType: 'GUEST';
  guestTypeLabel: 'Khách (Guest)';
  boardCount: number;
  boards: Array<{
    id: string;
    name: string;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    boardMemberId: string;
    joined_at?: string;
  }>;
}
```

### 2.2 Workspace Detail Response (Phần mở rộng)
```typescript
export interface WorkspaceDetailResponse {
  // ... fields cơ bản
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  isOwner: boolean;
  isAdmin: boolean;
  guests: WorkspaceGuestItem[];
  guestCount: number;
  // Aliases tương thích ngược:
  singleBoardGuests: WorkspaceGuestItem[];
  multiBoardGuests: WorkspaceGuestItem[];
  singleBoardGuestsCount: number;
  multiBoardGuestsCount: number;
}
```

### 2.3 Frontend Permission Contract (`frontend/lib/permissions.ts`)
```typescript
export function canCreateBoard(ctx?: WorkspacePermissionContext | null): boolean {
  if (!ctx) return false;
  return ctx.isOwner === true || ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.role === 'MEMBER';
}
// Nếu ctx.role === 'GUEST' -> return false
```

---

## 3. Danh sách Workstreams Chạy Song Song (Parallel Safety - Zero Overlap)

### Workstream A: Backend Implementation (Core Logic & Permissions)
- **Mục tiêu:**
  1. Hợp nhất `guests` trong `workspaces.service.ts`: gom chung mọi guest vào mảng `guests`, gán nhãn `Khách (Guest)`, tính `boardCount` và `guestCount`.
  2. Cập nhật `workspaces.service.ts` method `findById`: Cho phép Guest truy cập xem Workspace cơ bản (nếu là member role GUEST hoặc board guest của workspace); và lọc danh sách `boards` chỉ trả về những board mà Guest tham gia.
  3. Cập nhật `boards.service.ts`:
     - Method `verifyWorkspaceAccess`: Trả về thông tin role workspace (hoặc nhận diện role `GUEST` nếu là board guest).
     - Method `create`: Chặn không cho user role `GUEST` tạo Board, ném `ForbiddenException`.
     - Method `findAllInWorkspace`: Nếu user là `GUEST`, lọc chỉ trả về những board mà user là thành viên (`board_members`).
- **File được phép sửa (Allowed Files):**
  - `backend/src/modules/workspaces/workspaces.service.ts`
  - `backend/src/modules/boards/boards.service.ts`
- **Tiêu chí hoàn thành (DoD):**
  - `npm run build` tại thư mục `backend` chạy thành công 0 lỗi.
  - Logic phân quyền Guest và lọc Board hoạt động đúng theo spec.

---

### Workstream B: Frontend UI & Permission Hook (Workspace Page & UI Controls)
- **Mục tiêu:**
  1. Cập nhật `frontend/lib/permissions.ts`: Xác nhận hàm `canCreateBoard` chặn hoàn toàn `GUEST`.
  2. Cập nhật `frontend/app/workspaces/[workspaceId]/page.tsx`:
     - Chuyển đổi state `memberSubTab`: Thay vì `'single_guests' | 'multi_guests'`, dùng `'guests'` (giá trị mặc định hoặc khi bấm vào tab Khách).
     - Gộp 2 nút sub-tab Khách 1 bảng và Khách đa bảng thành 1 nút sub-tab duy nhất: "Khách (Guest) ({workspace?.guestCount || 0})".
     - Gom khối giao diện hiển thị danh sách khách thành 1 bảng duy nhất: hiển thị avatar, tên, email, badge "Khách (Guest)", số lượng bảng tham gia, pill bảng kèm dropdown đổi role trên từng board, nút thêm vào Workspace, nút xóa khách.
     - Ẩn hoặc disable nút "Tạo Board mới" (ở Hero Header và trong tab danh sách Bảng) đối với người dùng có vai trò `GUEST` (sử dụng `canCreateBoard({ role: workspace?.currentUserRole, isOwner: workspace?.isOwner })`).
- **File được phép sửa (Allowed Files):**
  - `frontend/lib/permissions.ts`
  - `frontend/app/workspaces/[workspaceId]/page.tsx`
- **Tiêu chí hoàn thành (DoD):**
  - `npm run build` tại thư mục `frontend` chạy thành công 0 lỗi.
  - Giao diện Không gian làm việc hiển thị duy nhất nhóm "Khách (Guest)", không còn phân tách 1 bảng / đa bảng.
  - Khách không thể bấm tạo Board trên UI.

---

## 4. Kịch bản Kiểm thử cho QA Auditor (Test Scenarios)

1. **Static Build & Type Check:**
   - `npm run build` tại `backend` không có lỗi biên dịch TypeScript.
   - `npm run build` tại `frontend` không có lỗi biên dịch Next.js / TypeScript.
2. **Kiểm tra Danh sách Khách Thống nhất:**
   - Vào Workspace có khách -> Tab "Thành viên & Khách": Chỉ hiển thị 1 sub-tab "Khách (Guest)".
   - Khách chỉ tham gia 1 board và khách tham gia nhiều board đều nằm chung trong 1 danh sách, hiển thị rõ số lượng bảng tham gia.
   - Role của khách trên từng Board vẫn được chỉnh sửa độc lập (`EDITOR`, `ADMIN`, `VIEWER`).
3. **Kiểm tra Phân quyền Guest:**
   - User là Guest:
     - Nút "Tạo Board mới" tại Workspace Header bị ẩn/vô hiệu hóa.
     - Nút "Tạo Board mới" trong Grid danh sách Board bị ẩn/vô hiệu hóa.
     - Gọi trực tiếp API `POST /api/v1/workspaces/:workspaceId/boards` bằng token của Guest -> Trả về `403 Forbidden` kèm thông báo tiếng Việt.
     - Danh sách Bảng của Workspace khi Guest xem chỉ hiển thị các Bảng mà Guest được phân quyền.
   - User là Admin/Member:
     - Nút "Tạo Board mới" hiển thị bình thường và tạo được Board thành công.
