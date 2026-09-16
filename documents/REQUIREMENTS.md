# PLANIFY — Functional, Non-Functional & Business Requirements

## 1. Phạm vi

Tài liệu này là baseline để Dev, QA và Product thống nhất behavior của hệ thống. Nội dung kế thừa các yêu cầu trong báo cáo Project 1: quản lý tài khoản/Workspace, Board/Card, tài nguyên/tương tác, tích hợp nâng cao, Dashboard/Reporting, Kanban, AI và hệ thống thông báo. 

---

# 2. Yêu cầu chức năng

## FR01 — Quản lý tài khoản

### Mục tiêu

Cho phép người dùng tạo và quản lý tài khoản an toàn.

### Chức năng

- Đăng ký.
- Xác minh email.
- Đăng nhập.
- Đăng xuất.
- Quên mật khẩu.
- Đặt lại mật khẩu.
- Quản lý session.

### Logic

```text
Register
→ Validate
→ Check duplicate email
→ Hash password
→ Create account
→ Send verification
```

### Quy tắc

- Email phải duy nhất trong phạm vi identity.
- Password không lưu plaintext.
- Reset token phải có thời hạn.
- Token reset chỉ dùng một lần.

---

## FR02 — Quản lý hồ sơ cá nhân

Cho phép:
- Cập nhật tên.
- Avatar.
- Bio.
- Timezone.
- Ngôn ngữ.
- Preference.

---

## FR03 — Quản lý Workspace

Cho phép:
- Create.
- View.
- Update.
- Archive.
- Restore.
- Delete.

Workspace chứa nhiều Board.

Creator trở thành Owner.

---

## FR04 — Quản lý lời mời

### Luồng

```text
Admin
→ nhập Email + Role
→ generate invitation
→ save invitation
→ send Email
→ User open link
→ validate token
→ accept
→ create membership
```

Token:
- Có expiry.
- Không dùng lại sau accept.
- Có thể revoke.

---

## FR05 — Quản lý thành viên Workspace

Cho phép:
- Xem danh sách.
- Mời.
- Đổi role.
- Xóa.
- Rời Workspace.
- Transfer ownership.

Không được làm mất Owner cuối cùng nếu chưa transfer.

---

## FR06 — Quản lý Board

Cho phép:
- Create.
- View.
- Edit.
- Copy.
- Archive.
- Restore.
- Delete.

Board có:
- Name.
- Description.
- Visibility.
- Members.
- Lists.
- Labels.
- Custom Fields.
- Automation.

---

## FR07 — Quản lý quyền truy cập Board

Board có thể có access riêng.

Quyền phải được kiểm tra ở Backend.

Các action:
- Add member.
- Remove member.
- Change role.
- Grant guest access.
- Revoke access.

---

## FR08 — Quản lý List

Cho phép:
- Create.
- Rename.
- Reorder.
- Archive.
- Restore.
- Delete.
- WIP Limit.

### WIP

Nếu:

```text
current_active_cards >= WIP_LIMIT
```

thì hệ thống:
- Warn nếu policy = WARNING.
- Block nếu policy = BLOCK.

---

## FR09 — Quản lý Card

Cho phép:
- Create.
- View.
- Edit.
- Delete.
- Copy.
- Archive.
- Restore.
- Move.
- Complete.

### Field chính

```text
title
description
position
list_id
assignee
labels
priority
start_date
due_date
completed_at
```

---

## FR10 — Quản lý Label

Cho phép:
- Create.
- Edit.
- Delete.
- Assign.
- Unassign.

Một Card có thể có nhiều Label.

---

## FR11 — Quản lý Checklist

Cho phép:
- Create checklist.
- Rename.
- Delete.
- Create item.
- Edit item.
- Reorder.
- Complete.
- Assign item.
- Set due date.

### Progress

```text
completed / total × 100
```

Chỉ tính active item.

---

## FR12 — Quản lý thời gian và hạn

Card có:
- Start Date.
- Due Date.
- Completion timestamp.
- Reminder.

### Overdue

```text
current_datetime > due_datetime
AND card != completed
```

→ Card được đánh dấu quá hạn.

---

## FR13 — Comment và Mention

Cho phép:
- Create.
- Edit.
- Delete.
- Mention.
- Reply.

Mention:
- Chỉ được mention user trong allowed scope.
- Tạo Notification.

---

## FR14 — Attachment

Cho phép:
- Upload.
- Preview.
- Download.
- Delete.

### Validation

- Kích thước.
- MIME type.
- Extension/content.
- Storage result.

Trong baseline của báo cáo, file hợp lệ bao gồm hình ảnh, PDF, Word/Excel với dung lượng dưới 10MB.

### Upload behavior

```text
Validate
→ Upload storage
→ Save metadata
→ Show attachment
```

---

## FR15 — Custom Field

Board định nghĩa Field.

Kiểu tối thiểu:
- Text.
- Number.
- Boolean.
- Select.

Card lưu value tương ứng.

---

## FR16 — Card Relationship

Hỗ trợ:
- Parent/Subtask.
- Blocks.
- Blocked-by.
- Duplicate.

Không được tạo dependency cycle nếu tính năng cycle protection được bật.

---

## FR17 — Search và Filter

Search:
- Board.
- List.
- Card.
- Member.
- Comment.

Filter:
- Member.
- Label.
- Status.
- Due Date.
- Priority.

Có thể kết hợp nhiều điều kiện.

---

## FR18 — Board Views

Baseline:
- Kanban.
- Table.
- Calendar.
- Timeline.

Mọi View đọc cùng Card source-of-truth.

---

## FR19 — Notification

Notification được tạo khi:
- Invitation.
- Assignment.
- Mention.
- Comment.
- Due date approaching.
- Overdue.

Có:
- In-app.
- Email.
- Push-ready architecture.

---

## FR20 — Realtime

Socket.IO đồng bộ:
- Card created.
- Card updated.
- Card moved.
- Comment.
- Member changes.
- Notifications.

### Nguyên tắc

```text
DB commit
→ event
→ Socket.IO
```

Không broadcast mutation chưa commit.

---

## FR21 — Activity / Audit Log

Activity ghi:
- Actor.
- Action.
- Entity.
- Timestamp.
- Metadata.

Audit dành cho security/admin change.

Ví dụ:

```text
User A moved Card X
from "Doing"
to "Done"
```

---

## FR22 — Import / Export / Template

Import:
- CSV.
- JSON.
- Adapter bên ngoài nếu triển khai.

Export:
- Board.
- Workspace.
- JSON/CSV.

Template:
- Lists.
- Labels.
- Custom Fields.
- Automation metadata.

---

## FR23 — Automation

Rule:

```text
Trigger
+
Condition
→
Action
```

Ví dụ:

```text
WHEN Card moves to Done
THEN mark complete
```

Automation phải hỗ trợ:
- Enable/disable.
- Execution log.
- Retry.
- Idempotency.
- Loop protection.
- Quota.

---

# 3. Yêu cầu phi chức năng

## NFR01 — Hiệu năng

Theo baseline báo cáo:

- API thông thường ≤ 3 giây ở tải bình thường.

Mục tiêu kỹ thuật khuyến nghị cho production:

- Read API p95 ≤ 300ms.
- Mutation p95 ≤ 500ms, không tính async side effects.

---

## NFR02 — Khả năng chịu tải

Hỗ trợ nhiều user cùng thao tác.

Phải đảm bảo:
- Không mất dữ liệu.
- Không duplicate position.
- Không overwrite ngoài ý muốn.

---

## NFR03 — Tính sẵn sàng

Hệ thống phải:
- Phục hồi sau lỗi tạm thời.
- Có retry cho async jobs.
- Có health check.

---

## NFR04 — Bảo mật xác thực

- Password hash bằng thuật toán adaptive.
- Session/token được bảo vệ.
- Không trả thông tin nhạy cảm.

---

## NFR05 — Auditability

Thao tác quan trọng phải truy vết được.

Bao gồm:
- quyền.
- member.
- Board.
- Card.
- dữ liệu quan trọng.

---

## NFR06 — Khả năng sử dụng

- Kanban phải dễ hiểu.
- Drag & drop phải rõ.
- Error message dễ hiểu.
- Người dùng không cần hiểu kỹ thuật để sử dụng chức năng core.

---

## NFR07 — Browser Compatibility

Baseline:
- Chrome.
- Edge.
- Firefox.

---

## NFR08 — Responsive

Hỗ trợ:
- Desktop.
- Tablet.
- Mobile.

Desktop ưu tiên cho Board Kanban.

---

## NFR09 — Error Handling

API dùng error code thống nhất.

Ví dụ:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action",
    "requestId": "..."
  }
}
```

Không trả:
- stack trace.
- SQL.
- secrets.
- internal implementation details.

---

## NFR10 — Logging

Các mức:
- INFO.
- WARN.
- ERROR.

Mỗi request nên có request/correlation ID.

---

## NFR11 — Backup / Recovery

- Backup database định kỳ.
- Có quy trình restore.
- Backup phải được kiểm tra định kỳ.

---

## NFR12 — API Documentation

REST API:
- `/api/v1`.
- OpenAPI/Swagger.
- Pagination.
- Validation.
- Consistent error schema.

---

# 4. Quy tắc nghiệp vụ

## BR01 — Unique Email

Email không phân biệt hoa thường.

---

## BR02 — Workspace Access

User chỉ được đọc Workspace protected khi:
- là member,
- hoặc có shared/public access phù hợp.

---

## BR03 — Board Access

Board access có thể đến từ:
- Board membership.
- Workspace membership theo policy.
- Guest access.
- Public access.

---

## BR04 — Child Resource Access

Có Card access phải có ancestor access:

```text
Card
→ List
→ Board
→ Workspace
```

Direct URL cũng phải kiểm tra permission.

---

## BR05 — Owner Protection

Workspace phải còn ít nhất một Owner.

Không cho xóa/demote Owner cuối cùng nếu chưa transfer.

---

## BR06 — Role Hierarchy

User không được cấp quyền cao hơn quyền của mình nếu policy không cho phép.

---

## BR07 — Archived Entity

Entity archived:
- Không xuất hiện trong active list.
- Vẫn restore được nếu user có quyền.

---

## BR08 — Position Consistency

Active Cards trong cùng List phải có thứ tự ổn định.

Server là nguồn canonical.

---

## BR09 — Timezone

Persist timestamp theo UTC.

Hiển thị và scheduled automation dùng timezone cấu hình.

---

## BR10 — Notification Deduplication

Cùng logical event/user/channel không tạo duplicate notification do retry.

---

## BR11 — Event After Commit

Chỉ phát event sau khi DB mutation commit.

---

## BR12 — Automation Recursion

Automation chain phải giới hạn:
- Depth.
- Execution count.
- Time.
- Quota.

---

## BR13 — File Authorization

Mọi download/preview phải kiểm tra access.

---

## BR14 — Search Security

Search không được trả resource ngoài scope của user.

---

## BR15 — Soft Delete

Ưu tiên archive/soft-delete trước permanent delete.

---

## BR16 — Idempotent Mutation

Retry không được tạo duplicate side effect.

---

## BR17 — Audit Immutable

Audit log không được sửa/xóa bởi normal application flow.

---

## BR18 — AI Confirmation

AI action có tác động lớn cần confirmation.

---

# 5. State Rules

## Card

```text
ACTIVE
  ↓ archive
ARCHIVED
  ↓ restore
ACTIVE
```

Completion là thuộc tính của Card:

```text completed_at != null
```

Không nên đồng nhất `Done` với `ARCHIVED`.

## Invitation

```text
PENDING
├── ACCEPTED
├── EXPIRED
└── REVOKED
```

## Subscription

```text
TRIALING
→ ACTIVE
→ PAST_DUE
→ CANCELED
→ EXPIRED
```

---

# 6. Permission Matrix

| Action | Owner | Admin | Member | Guest | Observer |
|---|---:|---:|---:|---:|---:|
| Read Workspace | ✓ | ✓ | ✓ | Scoped | Scoped |
| Manage Workspace | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Members | ✓ | ✓ | Limited | ✗ | ✗ |
| Create Board | ✓ | ✓ | Policy | ✗ | ✗ |
| Edit Board | ✓ | ✓ | Board permission | ✗ | ✗ |
| Create Card | ✓ | ✓ | ✓ | Policy | ✗ |
| Edit Card | ✓ | ✓ | ✓ | Policy | ✗ |
| Move Card | ✓ | ✓ | ✓ | Policy | ✗ |
| Comment | ✓ | ✓ | ✓ | Policy | Optional |
| Delete Board | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Automation | ✓ | ✓ | Admin | ✗ | ✗ |

**Lưu ý:** Matrix trên chỉ là policy mặc định; backend vẫn phải kiểm tra resource scope thực tế.

---

# 7. Dữ liệu chính

```text
User
Workspace
WorkspaceMember
Board
BoardMember
List
Card
CardMember
Label
CardLabel
Checklist
ChecklistItem
Comment
Attachment
CustomFieldDefinition
CardCustomFieldValue
Activity
Notification
AutomationRule
AutomationExecution
```

---

# 8. API conventions

## Request

```http
POST /api/v1/cards
```

## Response

```json
{
  "data": {},
  "requestId": "..."
}
```

## Pagination

Dùng cursor cho:
- Comment.
- Activity.
- Notification.
- Card collections lớn.

## Conflict

```http
409 Conflict
```

Ví dụ:

```json
{
  "error": {
    "code": "CARD_VERSION_CONFLICT",
    "message": "The card was modified by another user.",
    "details": {
      "expectedVersion": 5,
      "currentVersion": 6
    }
  }
}
```

---

# 9. Acceptance Criteria mức hệ thống

## MVP

- Register/Login.
- Workspace.
- Board.
- List.
- Card.
- Drag & drop.
- Member assignment.
- Label.
- Due Date.
- Checklist.
- Comment.
- Attachment.
- Permission.
- Activity.
- Tests.

## Collaboration

- Realtime.
- Notification.
- Mention.
- Reconnect.

## Productivity

- Search.
- Filter.
- Calendar.
- Timeline.
- Dashboard.

## Advanced

- Automation.
- API.
- Webhook.
- Template.
- Import/Export.
- AI.
