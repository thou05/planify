# PLANIFY — Use Case Specification

## 1. Actor Catalogue

| Mã | Actor | Vai trò |
|---|---|---|
| ACT-01 | Visitor | Người chưa đăng nhập |
| ACT-02 | User | Người dùng đã đăng nhập |
| ACT-03 | Workspace Admin | Quản trị Workspace |
| ACT-04 | Board Admin / Project Manager | Quản trị Board |
| ACT-05 | Member | Thành viên thực hiện công việc |
| ACT-06 | Guest / Observer | Người dùng có quyền truy cập giới hạn |
| ACT-07 | AI Agent | Tác nhân AI |
| ACT-08 | Integration | Hệ thống bên thứ ba |
| ACT-09 | System Worker | Tác vụ nền của hệ thống |

## 2. Use Case Diagram cấp hệ thống

```text
                           PLANIFY
                              |
       ┌──────────────────────┼────────────────────────┐
       |                      |                        |
   Account                Work Management         Collaboration
       |                      |                        |
 Register/Login       Workspace / Board / List       Comment
 Profile              Card / Checklist              Mention
 Security             Label / Deadline              Attachment
       |                      |                        |
       └──────────────────────┼────────────────────────┘
                              |
                       Productivity
                              |
                 Search / Filter / Views
                 Calendar / Timeline
                 Dashboard / Inbox
                              |
                    ┌─────────┴─────────┐
                    |                   |
               Automation              AI
                    |                   |
                 Rules              Planning
                 Triggers            Summary
                 Actions             Checklist
                    |                   |
                    └─────────┬─────────┘
                              |
                       Platform Services
                              |
                     API / Webhook / OAuth
                     Notification / Realtime
                     Template / Import / Export
```

## 3. Nhóm UC-AUTH — Tài khoản

### UC-AUTH-001 — Đăng ký

**Actor:** Visitor

**Mục tiêu:** Tạo tài khoản.

**Tiền điều kiện:** Người dùng chưa đăng nhập.

**Luồng chính:**
1. Người dùng nhập email, mật khẩu và thông tin bắt buộc.
2. Hệ thống validate dữ liệu.
3. Hệ thống kiểm tra email đã tồn tại.
4. Hệ thống hash mật khẩu.
5. Tạo User ở trạng thái chờ xác minh.
6. Gửi email xác minh.

**Ngoại lệ:**
- Email đã tồn tại.
- Email không hợp lệ.
- Password không đạt policy.

---

### UC-AUTH-002 — Xác minh Email

1. User mở link.
2. Hệ thống kiểm tra token.
3. Kiểm tra hạn sử dụng.
4. Kiểm tra token đã sử dụng hay chưa.
5. Kích hoạt tài khoản.

---

### UC-AUTH-003 — Đăng nhập

1. User nhập email/password.
2. Hệ thống xác thực.
3. Kiểm tra trạng thái account.
4. MFA nếu bật.
5. Tạo session.
6. Chuyển tới Dashboard/Workspace.

---

### UC-AUTH-004 — Đăng xuất

Hủy session/token hiện tại.

---

### UC-AUTH-005 — Quên mật khẩu

Tạo reset token dùng một lần và gửi email.

---

### UC-AUTH-006 — Quản lý Session

User:
- Xem session.
- Revoke session.
- Logout all other sessions.

## 4. Nhóm UC-USER

### UC-USER-001 — Xem hồ sơ

### UC-USER-002 — Cập nhật hồ sơ

### UC-USER-003 — Đổi Avatar

### UC-USER-004 — Đổi Timezone

### UC-USER-005 — Đổi Language

### UC-USER-006 — Cấu hình Notification

### UC-USER-007 — Cấu hình Privacy

## 5. Nhóm UC-WORKSPACE

### UC-WS-001 — Tạo Workspace

**Actor:** User

**Luồng:**
1. Chọn Create Workspace.
2. Nhập tên.
3. Validate.
4. Tạo Workspace.
5. Tạo membership Owner.
6. Khởi tạo settings.

### UC-WS-002 — Xem Workspace

### UC-WS-003 — Sửa Workspace

### UC-WS-004 — Archive Workspace

### UC-WS-005 — Restore Workspace

### UC-WS-006 — Delete Workspace

### UC-WS-007 — Mời thành viên

1. Admin nhập email + role.
2. Hệ thống tạo invitation token.
3. Lưu invitation.
4. Gửi email.
5. Người được mời mở link.
6. Hệ thống validate token.
7. User chấp nhận.
8. Tạo Workspace Membership.

### UC-WS-008 — Quản lý thành viên

- Xem.
- Thêm.
- Xóa.
- Đổi role.
- Transfer ownership.

### UC-WS-009 — Quản lý Team

- Create team.
- Add member.
- Remove member.
- Team assignment.

## 6. Nhóm UC-BOARD

### UC-BRD-001 — Tạo Board

1. Chọn Workspace.
2. Nhập tên Board.
3. Chọn visibility.
4. Tạo Board.
5. Gán creator vào Board.
6. Tạo List mặc định nếu được cấu hình.

### UC-BRD-002 — Xem Board

### UC-BRD-003 — Sửa Board

### UC-BRD-004 — Copy Board

### UC-BRD-005 — Archive Board

### UC-BRD-006 — Restore Board

### UC-BRD-007 — Delete Board

### UC-BRD-008 — Quản lý Board Members

### UC-BRD-009 — Thay đổi Visibility

### UC-BRD-010 — Quản lý Board Settings

## 7. Nhóm UC-LIST

### UC-LST-001 — Tạo List

### UC-LST-002 — Đổi tên List

### UC-LST-003 — Di chuyển List

### UC-LST-004 — Archive List

### UC-LST-005 — Restore List

### UC-LST-006 — Xóa List

### UC-LST-007 — Cấu hình WIP Limit

### UC-LST-008 — Kiểm tra WIP khi thêm Card

## 8. Nhóm UC-CARD

### UC-CARD-001 — Tạo Card

**Actor:** Member

**Tiền điều kiện:**
- Có quyền truy cập Board.
- Có quyền tạo Card trong List.

**Luồng:**
1. User chọn Add Card.
2. Nhập Title.
3. Có thể nhập Description.
4. Chọn Member/Label/Due Date.
5. Hệ thống validate.
6. Tạo Card.
7. Tạo Activity.
8. Commit.
9. Phát realtime event.

**Ngoại lệ:**
- Title rỗng.
- User không có quyền.
- List bị archive.
- WIP bị vượt giới hạn nếu policy là Block.

---

### UC-CARD-002 — Xem Card Detail

Hiển thị:
- Title.
- Description.
- Members.
- Labels.
- Dates.
- Checklist.
- Comments.
- Attachments.
- Activity.

---

### UC-CARD-003 — Chỉnh sửa Card

### UC-CARD-004 — Di chuyển Card

**Luồng:**

```text
Drag
→ Optimistic UI
→ API move
→ Authenticate
→ Authorize
→ Validate version
→ Validate WIP
→ Transaction
→ Update list_id/position
→ Activity
→ Commit
→ Realtime
```

**Ngoại lệ:**
- 403 Forbidden.
- Version conflict.
- Target list không hợp lệ.
- WIP limit.

---

### UC-CARD-005 — Archive Card

### UC-CARD-006 — Restore Card

### UC-CARD-007 — Delete Card

### UC-CARD-008 — Copy Card

### UC-CARD-009 — Assign Member

1. Chọn user.
2. Kiểm tra user thuộc scope.
3. Kiểm tra permission.
4. Tạo card_members.
5. Activity.
6. Notification.
7. Realtime.

### UC-CARD-010 — Gắn Label

### UC-CARD-011 — Thiết lập Due Date

### UC-CARD-012 — Thiết lập Reminder

### UC-CARD-013 — Quản lý Custom Field

### UC-CARD-014 — Tạo Dependency

Các loại:
- Parent / Subtask.
- Blocks.
- Blocked-by.
- Duplicate.

### UC-CARD-015 — Mirror Card

## 9. Nhóm UC-CHECKLIST

### UC-CHK-001 — Tạo Checklist
### UC-CHK-002 — Sửa Checklist
### UC-CHK-003 — Xóa Checklist
### UC-CHK-004 — Tạo Item
### UC-CHK-005 — Sửa Item
### UC-CHK-006 — Hoàn thành Item
### UC-CHK-007 — Gán Item
### UC-CHK-008 — Đặt Due Date cho Item
### UC-CHK-009 — Tính phần trăm hoàn thành

Công thức:

```text
completed active items
---------------------- × 100
total active items
```

Checklist rỗng: hiển thị `0%` hoặc `N/A` theo product decision.

## 10. Nhóm UC-COLLABORATION

### UC-COL-001 — Comment

### UC-COL-002 — Edit Comment

### UC-COL-003 — Delete Comment

### UC-COL-004 — Mention

Khi nhập `@`:
1. Hệ thống tìm member phù hợp.
2. User chọn member.
3. Comment được lưu.
4. Tạo notification.

### UC-COL-005 — Reaction

### UC-COL-006 — Reply/Thread

## 11. Nhóm UC-FILE

### UC-FILE-001 — Upload

```text
Request upload slot
→ Authorization
→ Validate size/type
→ Upload storage
→ Save metadata
→ Scan
→ Available
```

### UC-FILE-002 — Preview

### UC-FILE-003 — Download

Phải kiểm tra authorization lại.

### UC-FILE-004 — Delete

Soft-delete metadata; physical delete có thể chạy nền.

## 12. Nhóm UC-SEARCH

### UC-SRCH-001 — Global Search

Tìm:
- Board.
- List.
- Card.
- Member.
- Comment.

### UC-SRCH-002 — Board Search

### UC-SRCH-003 — Filter

Điều kiện:
- Member.
- Label.
- Status.
- Due Date.
- Priority.

### UC-SRCH-004 — Lưu Filter

### UC-SRCH-005 — Sort

## 13. Nhóm UC-VIEW

### UC-VIEW-001 — Kanban View

### UC-VIEW-002 — Table View

### UC-VIEW-003 — Calendar View

### UC-VIEW-004 — Timeline View

### UC-VIEW-005 — Dashboard

### UC-VIEW-006 — Workspace View

Mọi View phải dùng cùng source-of-truth.

## 14. Nhóm UC-NOTIFICATION

### UC-NOTIF-001 — Tạo Notification

Nguồn:
- Invitation.
- Assignment.
- Mention.
- Comment.
- Due Date.

### UC-NOTIF-002 — Xem Notification

### UC-NOTIF-003 — Mark as read

### UC-NOTIF-004 — Email Notification

### UC-NOTIF-005 — Notification Preferences

## 15. Nhóm UC-REALTIME

### UC-RT-001 — Kết nối Socket.IO

### UC-RT-002 — Nhận Card Event

### UC-RT-003 — Nhận Comment Event

### UC-RT-004 — Nhận Member Event

### UC-RT-005 — Presence

### UC-RT-006 — Reconnect

Khi reconnect:
1. Client nhận sequence/version hiện tại.
2. Lấy các event bị thiếu nếu còn khả dụng.
3. Nếu không thể reconcile → refetch resource.
4. Áp dụng dữ liệu canonical.

## 16. Nhóm UC-AUDIT

### UC-AUD-001 — Ghi Activity

### UC-AUD-002 — Xem Card Activity

### UC-AUD-003 — Xem Board Activity

### UC-AUD-004 — Xem Audit Log

### UC-AUD-005 — Filter Audit

Các trường tối thiểu:
- Actor.
- Action.
- Target.
- Timestamp.
- Before.
- After.

## 17. Nhóm UC-AUTOMATION

### UC-AUTO-001 — Tạo Rule

Rule:

```text
Trigger
Condition
Action
```

### UC-AUTO-002 — Sửa Rule

### UC-AUTO-003 — Bật/Tắt Rule

### UC-AUTO-004 — Xóa Rule

### UC-AUTO-005 — Scheduled Automation

### UC-AUTO-006 — Due Date Automation

### UC-AUTO-007 — Card Button

### UC-AUTO-008 — Board Button

### UC-AUTO-009 — HTTP Action

### UC-AUTO-010 — Test/Dry Run

### UC-AUTO-011 — Xem Execution Log

### UC-AUTO-012 — Retry

### UC-AUTO-013 — Loop Protection

## 18. Nhóm UC-AI

### UC-AI-001 — AI tạo Checklist

### UC-AI-002 — AI phân rã công việc

### UC-AI-003 — AI sinh Description

### UC-AI-004 — AI tóm tắt Card/Discussion

### UC-AI-005 — AI đề xuất Priority

### UC-AI-006 — AI phát hiện Duplicate

### UC-AI-007 — AI Planning

### UC-AI-008 — AI Project Health

### UC-AI-009 — Natural Language Command

### UC-AI-010 — Meeting → Tasks

### UC-AI-011 — Xác nhận AI Action

AI action nguy hiểm hoặc tác động nhiều tài nguyên phải được xác nhận trừ khi policy cho phép.

## 19. Nhóm UC-API

### UC-API-001 — Tạo API Key
### UC-API-002 — Revoke API Key
### UC-API-003 — Cấu hình Scope
### UC-API-004 — Gọi REST API
### UC-API-005 — OAuth
### UC-API-006 — Rate Limit

## 20. Nhóm UC-WEBHOOK

### UC-WH-001 — Tạo Webhook
### UC-WH-002 — Disable Webhook
### UC-WH-003 — Delete Webhook
### UC-WH-004 — Gửi Event
### UC-WH-005 — Retry
### UC-WH-006 — Verify Signature
### UC-WH-007 — Delivery Log

## 21. Nhóm UC-DATA

### UC-DATA-001 — Import CSV
### UC-DATA-002 — Import JSON
### UC-DATA-003 — Preview Import
### UC-DATA-004 — Execute Import
### UC-DATA-005 — Export Board
### UC-DATA-006 — Export Workspace
### UC-DATA-007 — Tạo Backup
### UC-DATA-008 — Restore Backup

## 22. Nhóm UC-TEMPLATE

### UC-TPL-001 — Tạo Template
### UC-TPL-002 — Sửa Template
### UC-TPL-003 — Xóa Template
### UC-TPL-004 — Tạo Board từ Template

## 23. System Use Cases

### UC-SYS-001 — Process Outbox
### UC-SYS-002 — Process Notification Queue
### UC-SYS-003 — Process Search Index
### UC-SYS-004 — Execute Automation
### UC-SYS-005 — Process File Scan
### UC-SYS-006 — Cleanup Data
### UC-SYS-007 — Backup Database

## 24. Quy tắc dùng chung

Mọi protected use case:

```text
Authenticate
→ Authorize
→ Validate
→ Execute
→ Persist
→ Activity/Event
→ Async side effects
```

Mọi mutation có khả năng retry:
- Phải idempotent.
- Không tạo duplicate activity/notification.

Mọi resource con:
- Phải kiểm tra quyền theo ancestor resource.

## 25. Use Case ID → Module

| Use Case | Module |
|---|---|
| UC-AUTH-* | Auth |
| UC-USER-* | Users |
| UC-WS-* | Workspace |
| UC-BRD-* | Board |
| UC-LST-* | List |
| UC-CARD-* | Card |
| UC-CHK-* | Checklist |
| UC-COL-* | Collaboration |
| UC-FILE-* | Attachments |
| UC-SRCH-* | Search |
| UC-VIEW-* | Views |
| UC-NOTIF-* | Notification |
| UC-RT-* | Realtime |
| UC-AUD-* | Audit |
| UC-AUTO-* | Automation |
| UC-AI-* | AI |
| UC-API-* | API |
| UC-WH-* | Webhook |
| UC-DATA-* | Data |
| UC-TPL-* | Template |
| UC-SYS-* | Worker |
