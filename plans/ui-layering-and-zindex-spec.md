# Bản Đặc Tả Kỹ Thuật: Hệ Thống Phân Tầng Z-Index & Sửa Lỗi Hiển Thị UI (Planify)

## 1. Tổng quan & Kiến trúc

### 1.1. Hiện trạng & Lỗi giao diện
- **Lỗi chính:** Khi người dùng mở thanh tìm kiếm trực tiếp hoặc cửa sổ Thông báo (Notification Popover) trên thanh TopBar, thanh điều hướng phụ của Bảng (Board Top Navigation Bar / Subtitle Bar) đè lên trên các cửa sổ này.
- **Nguyên nhân kỹ thuật:** Cả `<TopBar>` (`<header>`) và Board Top Navigation Bar đều sử dụng `z-40`. Vì Board Top Navigation Bar nằm trong `<main>` xuất hiện sau TopBar trong cây DOM, trình duyệt ưu tiên vẽ phần tử xuất hiện sau lên trên. Do `<header>` có `sticky top-0 z-40` tạo ra Stacking Context riêng, các dropdown bên trong TopBar (mặc dù có `z-50`) vẫn bị giới hạn ở tầng `z-40` và bị che phủ bởi các nút của Board toolbar (`[Bảng]`, `[Thống kê]`, `[Lọc]`, `[Tự động hóa]`, LivePresence avatars, `[Chia sẻ]`).
- **Phạm vi mở rộng:** Toàn bộ hệ thống modal, popover, drawer và tooltips đang có sự pha trộn không thống nhất giữa `z-50`, `z-60`, `z-70`, `z-80`, `z-[100]`, khiến các modal lồng nhau (Nested Modals) có nguy cơ xung đột backdrop và thứ tự hiển thị.

### 1.2. Giải pháp kiến trúc
1. **Thiết lập quy chuẩn Stacking Hierarchy không giao thoa (Non-overlapping Stacking Order):**
   - Canvas / Viewport: `z-0` -> `z-10`
   - Sub-headers / Toolbars của trang: `z-20`
   - Popovers / Tooltips / Floating controls trong trang: `z-30`
   - Global TopBar: `z-40`
   - Dropdowns trực thuộc TopBar: `z-50` (hoạt động bên trong stacking context `z-40`, luôn đè lên `z-20` của Sub-header)
   - Drawers trượt từ cạnh phải: `z-60`
   - Modals chính (Primary Modals): `z-70`
   - Modals lồng con (Nested Modals / Sub-dialogs): `z-80`
   - Image Lightbox & Critical Block Alerts: `z-90`
   - System Portal / Toast Overlays: `z-[100]`

---

## 2. Giao diện kết nối & Ma trận Layering (Shared Contracts)

### Ma trận Z-Index Layering Matrix
```
+---------------------------------------------------------------------------------------------------+
| Layer Level   | Z-Index   | Class Tailwind     | Thành phần đại diện                              |
+---------------------------------------------------------------------------------------------------+
| Layer 0       | 0         | z-0 / auto         | Canvas nền chấm / lưới, AppShell main container  |
| Layer 1       | 10        | z-10               | Gantt timeline header sticky, Kanban viewport     |
| Layer 2       | 20        | z-20               | Board Top Navigation Bar (Thanh Subtitle)         |
| Layer 3       | 30        | z-30               | In-page dropdowns, Floating AI trigger button    |
| Layer 4       | 40        | z-40               | App TopBar (sticky top-0 z-40)                    |
| Layer 5       | 50        | z-50               | TopBar Search Dropdown, NotificationPopover, Menu |
| Layer 6       | 60        | z-60               | BoardCopilotDrawer, BoardActivity Slide-over      |
| Layer 7       | 70        | z-70               | Tất cả Primary Modals (CardDetail, CreateBoard...)|
| Layer 8       | 80        | z-80               | Nested Modals, Sub-dialogs, AutomationBuilder     |
| Layer 9       | 90        | z-90               | Image Lightbox, Blocked Warning Popup             |
| Layer 10      | 100+      | z-[100] / z-[9999] | Card Action Portal Dropdown, Toast notifications  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Danh sách Workstreams Chạy Song Song (Zero-Overlap)

### Workstream 1: Core Layout, TopBar & Board Subtitle Bar Fix (Primary Fix)
- **Mục tiêu:**
  - Sửa dứt điểm lỗi thanh Subtitle đè lên thanh tìm kiếm và popover thông báo của TopBar.
  - Hạ Board Top Navigation Bar từ `relative z-40` xuống `relative z-20`.
  - Cập nhật các menu con, tooltip, view switcher và live presence trong thanh Board toolbar về `z-30`.
  - Đảm bảo TopBar `z-40` và các dropdown `z-50` của TopBar luôn nổi lên trên toàn bộ nội dung của trang.
- **Allowed Files:**
  1. `frontend/app/boards/[boardId]/page.tsx`
  2. `frontend/components/layout/TopBar.tsx`
  3. `frontend/components/layout/AppShell.tsx`
  4. `frontend/components/board/views/BoardViewSwitcher.tsx`
  5. `frontend/components/board/LivePresenceBar.tsx`
  6. `frontend/components/board/views/BoardScheduleView.tsx`

### Workstream 2: Slide-Over Drawers, Kanban Cards & CardDetailModal Stacking Hierarchy
- **Mục tiêu:**
  - Chuẩn hóa toàn bộ cấu trúc phân tầng z-index trong `CardDetailModal.tsx` và các drawer/components liên quan.
  - Nâng `CardDetailModal` từ `z-50` lên `z-70` (Modal Layer chuẩn).
  - Nâng toàn bộ sub-modals bên trong `CardDetailModal` (Members, Labels, Dates, Attachments, Relations, AI Breakdown, Dropdown options) từ `z-60`/`z-70` lên `z-80`.
  - Nâng `previewImageAttachment` (Image Lightbox) và `blockedPopup` lên `z-90`.
  - Chuẩn hóa `BoardCopilotDrawer` và `BoardFilterModal`.
- **Allowed Files:**
  1. `frontend/components/modals/CardDetailModal.tsx`
  2. `frontend/components/board/BoardCopilotDrawer.tsx`
  3. `frontend/components/board/BoardFilterModal.tsx`
  4. `frontend/components/board/BoardRiskScannerModal.tsx`
  5. `frontend/components/board/KanbanCard.tsx`
  6. `frontend/components/board/ListColumn.tsx`

### Workstream 3: Global System Modals & Workspace/Profile Standardization
- **Mục tiêu:**
  - Chuẩn hóa toàn bộ các Modal gốc của ứng dụng sang `z-70`.
  - Xử lý các modal lồng nhau như `AutomationModal` (`z-70`) mở `AutomationBuilderModal` (`z-80`).
  - Xử lý `MoveCardModal` và `CopyCardModal` sang `z-80` khi được gọi từ `CardDetailModal`.
  - Đồng bộ hoá Modal đổi ảnh bìa trong trang Profile.
- **Allowed Files:**
  1. `frontend/components/modals/CreateBoardModal.tsx`
  2. `frontend/components/modals/CreateWorkspaceModal.tsx`
  3. `frontend/components/modals/GlobalSearchModal.tsx`
  4. `frontend/components/modals/ProfileModal.tsx`
  5. `frontend/components/modals/ShareBoardModal.tsx`
  6. `frontend/components/modals/EditBoardModal.tsx`
  7. `frontend/components/modals/BoardAppearanceModal.tsx`
  8. `frontend/components/modals/CopyBoardModal.tsx`
  9. `frontend/components/modals/SaveAsTemplateModal.tsx`
  10. `frontend/components/modals/ExportBoardModal.tsx`
  11. `frontend/components/modals/ImportBoardModal.tsx`
  12. `frontend/components/modals/CreateListModal.tsx`
  13. `frontend/components/modals/CopyListModal.tsx`
  14. `frontend/components/modals/MoveListModal.tsx`
  15. `frontend/components/modals/MoveCardsModal.tsx`
  16. `frontend/components/modals/MoveCardModal.tsx`
  17. `frontend/components/modals/CopyCardModal.tsx`
  18. `frontend/components/modals/CustomFieldsModal.tsx`
  19. `frontend/components/modals/AutomationModal.tsx`
  20. `frontend/components/modals/AutomationBuilderModal.tsx`
  21. `frontend/components/modals/UseTemplateModal.tsx`
  22. `frontend/components/modals/ArchivedBoardsModal.tsx`
  23. `frontend/components/modals/EditWorkspaceModal.tsx`
  24. `frontend/components/modals/InviteMemberModal.tsx`
  25. `frontend/components/modals/TransferOwnershipModal.tsx`
  26. `frontend/components/board/views/BoardCalendarView.tsx`
  27. `frontend/app/profile/page.tsx`

