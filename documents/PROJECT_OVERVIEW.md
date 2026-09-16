# PLANIFY — Project Overview

## 1. Thông tin dự án

**Tên dự án:** Planify — Hệ thống quản lý công việc  
**Loại sản phẩm:** Web Application / Collaborative Work Management Platform

Planify được xây dựng nhằm giải quyết bài toán quản lý công việc tập trung cho cá nhân, nhóm dự án, câu lạc bộ và doanh nghiệp quy mô vừa và nhỏ. Hệ thống tổ chức công việc theo cấu trúc:

```text
User
  └── Workspace
        └── Board
              └── List
                    └── Card
                          ├── Members
                          ├── Labels
                          ├── Checklist
                          ├── Due Date
                          ├── Comments
                          ├── Attachments
                          ├── Custom Fields
                          └── Activity
```

Mô hình sản phẩm được định hướng theo Kanban, nhưng không giới hạn ở Kanban. Hệ thống phải có kiến trúc đủ mở để phát triển thêm Calendar, Timeline, Dashboard, Automation, AI và các tích hợp bên thứ ba.

## 2. Mục tiêu sản phẩm

### 2.1 Mục tiêu nghiệp vụ

- Tập trung hóa công việc thay cho Excel, Word và ứng dụng nhắn tin phân tán.
- Giúp người dùng tạo, giao, theo dõi và hoàn thành công việc.
- Trực quan hóa tiến độ bằng Kanban.
- Minh bạch trách nhiệm thông qua người phụ trách, lịch sử hoạt động và deadline.
- Giảm thời gian lập kế hoạch bằng AI.
- Cung cấp Dashboard và báo cáo cho người quản lý.
- Hỗ trợ làm việc nhóm và đồng bộ thay đổi theo thời gian thực.

### 2.2 Mục tiêu kỹ thuật

- Xây dựng web application full-stack.
- Tách rõ frontend, backend và persistence layer.
- API-first.
- Authorization được thực hiện ở backend, không phụ thuộc UI.
- Hỗ trợ realtime qua Socket.IO.
- Có cache qua Redis.
- Có testing tự động bằng Jest và Playwright.
- Thiết kế AI dạng module, không biến AI thành dependency bắt buộc của core workflow.

## 3. Đối tượng sử dụng

### 3.1 Guest / Visitor

Chưa đăng nhập.

Quyền:
- Xem trang giới thiệu.
- Đăng ký.
- Đăng nhập.
- Truy cập nội dung Public nếu được hệ thống cho phép.

### 3.2 User

Người dùng đã đăng nhập.

Quyền:
- Quản lý hồ sơ.
- Tham gia Workspace.
- Tạo và quản lý Board theo quyền được cấp.
- Quản lý Card.
- Bình luận, đính kèm file.
- Nhận thông báo.
- Sử dụng AI.

### 3.3 Workspace Admin

Quản lý:
- Workspace.
- Thành viên.
- Vai trò.
- Các chính sách Workspace.

### 3.4 Project/Board Admin

Quản lý:
- Board.
- Thành viên Board.
- Lists.
- Cards.
- Labels.
- Custom Fields.
- Automation.

### 3.5 Member

Người trực tiếp thực hiện công việc:
- Tạo Card nếu được phép.
- Chỉnh sửa Card.
- Di chuyển Card.
- Comment.
- Upload Attachment.
- Cập nhật Checklist.

### 3.6 Observer / Guest

Quyền đọc hoặc quyền giới hạn theo resource.

## 4. Công nghệ sử dụng

### Frontend

```text
Next.js
React
TypeScript
```

Vai trò:
- Render giao diện.
- Quản lý trạng thái UI.
- Gọi REST API.
- Kết nối Socket.IO.
- Xử lý drag & drop.
- Tối ưu trải nghiệm tương tác.

### Backend

```text
NestJS
TypeScript
REST API
WebSocket Gateway
```

Backend chịu trách nhiệm:
- Authentication.
- Authorization.
- Business logic.
- Validation.
- Transaction.
- Event publishing.
- API.
- Realtime.
- AI orchestration.

### Database

```text
Supabase
```

Supabase được sử dụng làm nền tảng dữ liệu chính, trong đó PostgreSQL là nguồn dữ liệu quan hệ chính.

Các nhóm dữ liệu:
- User.
- Workspace.
- Workspace Member.
- Board.
- Board Member.
- List.
- Card.
- Card Member.
- Label.
- Checklist.
- Checklist Item.
- Comment.
- Attachment metadata.
- Custom Field.
- Activity.
- Notification.
- Automation.

### Realtime

```text
Socket.IO
```

Socket.IO dùng cho:
- Card created.
- Card updated.
- Card moved.
- Comment created.
- Member added/removed.
- Notification.
- Presence nếu được triển khai.

Luồng:

```text
Client A
  ↓
NestJS API
  ↓
Database
  ↓
Domain Event
  ↓
Socket.IO
  ↓
Client B / C / D
```

### Cache

```text
Redis
```

Dùng cho:
- Cache dữ liệu truy vấn phổ biến.
- Rate limiting.
- Session/token state nếu cần.
- Pub/Sub cho realtime khi scale.
- Queue support.
- Temporary state.

Không dùng Redis làm nguồn dữ liệu chính cho domain data.

### AI

```text
LLM API
```

LLM API được sử dụng cho:
- AI tạo Checklist.
- AI phân rã công việc.
- Sinh mô tả công việc.
- Tóm tắt nội dung.
- Đề xuất ưu tiên.
- Natural Language Command ở giai đoạn mở rộng.

Nguyên tắc:
- AI chỉ nhận dữ liệu mà người gọi được phép truy cập.
- AI action có ảnh hưởng lớn phải yêu cầu xác nhận nếu policy chưa cho phép tự động.
- Không để AI truy cập trực tiếp database; AI gọi các service/action được backend kiểm soát.

### Testing

```text
Jest
Playwright
```

**Jest**
- Unit test.
- Service test.
- Business logic test.
- API/integration test ở mức phù hợp.

**Playwright**
- E2E.
- Browser workflow.
- Login.
- Workspace.
- Board.
- Card.
- Drag & drop.
- Comment.
- Permission.
- Realtime behavior ở mức kiểm thử có kiểm soát.

## 5. Kiến trúc logic

```text
┌─────────────────────────────────────────────┐
│                 Next.js Web                 │
│ UI / State / API Client / Socket.IO Client  │
└───────────────────────┬─────────────────────┘
                        │ HTTPS / WebSocket
                        ▼
┌─────────────────────────────────────────────┐
│                NestJS Backend               │
│                                             │
│ Auth                                        │
│ Workspace                                   │
│ Board / List                                │
│ Card / Task                                 │
│ Collaboration                               │
│ Notification                                │
│ Automation                                  │
│ AI                                          │
│ Integration                                 │
└───────────────┬────────────────┬────────────┘
                │                │
                ▼                ▼
        ┌──────────────┐    ┌──────────────┐
        │   Supabase   │    │    Redis     │
        │ PostgreSQL   │    │ Cache/Queue  │
        └──────────────┘    └──────────────┘
                │
                ▼
        ┌──────────────┐
        │  File Storage │
        │ Supabase/S3  │
        └──────────────┘

                +
          ┌──────────────┐
          │   LLM API    │
          └──────────────┘
```

## 6. Nguyên tắc kiến trúc

### 6.1 Single Source of Truth

Database là nguồn sự thật chính.

Các View như:
- Kanban.
- Table.
- Calendar.
- Timeline.
- Dashboard.

chỉ là projection của cùng một dữ liệu Card.

### 6.2 Authorization-first

Mọi protected request phải:

```text
Authenticate
  ↓
Authorize
  ↓
Validate
  ↓
Execute
```

Không được chỉ ẩn nút trên frontend.

### 6.3 Transaction

Các mutation liên quan nhiều domain record phải được xử lý trong transaction.

Ví dụ Move Card:
- Update list.
- Update position.
- Create activity/event.

### 6.4 Realtime sau commit

Không phát event thành công trước khi mutation chính được commit.

### 6.5 Idempotency

Các operation có thể retry phải có cơ chế chống duplicate effect.

### 6.6 Optimistic UI

Các thao tác như kéo Card có thể cập nhật UI ngay sau user action, sau đó reconcile với server.

## 7. Core modules

```text
apps/
├── web/
│   ├── auth
│   ├── workspace
│   ├── board
│   ├── card
│   ├── settings
│   └── notifications
│
├── api/
│   ├── auth
│   ├── users
│   ├── workspaces
│   ├── boards
│   ├── lists
│   ├── cards
│   ├── comments
│   ├── attachments
│   ├── notifications
│   ├── activities
│   ├── automation
│   ├── ai
│   └── integrations
│
└── shared/
    ├── types
    ├── validation
    └── constants
```

## 8. Core domain

### Workspace

Container quản lý nhiều Board và thành viên.

### Board

Không gian quản lý một dự án/quy trình.

### List

Container có thứ tự trong Board.

### Card

Đơn vị công việc.

### Checklist

Danh sách các bước nhỏ trong Card.

### Label

Thông tin phân loại Card.

### Comment

Trao đổi gắn trực tiếp với Card.

### Activity

Lịch sử thay đổi.

## 9. Các luồng xuyên hệ thống quan trọng

### Create Card

```text
User
→ POST /cards
→ Authenticate
→ Authorize List/Board
→ Validate
→ Generate position
→ Create Card
→ Create Activity
→ Commit
→ Socket.IO event
→ Notification/other async actions
```

### Move Card

```text
Drag & Drop
→ POST /cards/{id}/move
→ Authenticate
→ Authorize source/destination
→ Validate WIP/policy
→ Check version
→ Transaction
→ Update list_id/position
→ Create Activity
→ Commit
→ Socket.IO broadcast
```

### Assign Member

```text
Leader/Admin
→ Select member
→ Authorize
→ Create card_members record
→ Create activity
→ Commit
→ Emit realtime event
→ Create notification
```

### AI Checklist

```text
User
→ Request AI suggestion
→ Authorize Card
→ Read title/description
→ Call LLM API
→ Validate response
→ Show suggestion
→ User selects items
→ Save checklist
```

### File Upload

```text
User
→ Request upload
→ Authorization
→ Validate metadata
→ Upload object
→ Save metadata
→ Optional scan
→ Show attachment
```

## 10. Quy ước phát triển

### Branch

```text
main
develop
feature/*
fix/*
hotfix/*
```

### Commit

Khuyến nghị Conventional Commits:

```text
feat: add card assignment
fix: prevent duplicate card position
refactor: extract permission service
test: add board permission tests
docs: update API documentation
```

### API

Version:

```text
/api/v1
```

Các lỗi có cấu trúc:

```json
{
  "error": {
    "code": "CARD_VERSION_CONFLICT",
    "message": "The card was modified by another user.",
    "details": {},
    "requestId": "..."
  }
}
```

## 11. Development phases

### Phase 0 — Foundation

- Repository.
- Next.js.
- NestJS.
- Supabase.
- Redis.
- CI.
- Environment.

### Phase 1 — Core

- Auth.
- Workspace.
- Board.
- List.
- Card.
- Member.
- Label.
- Checklist.
- Due Date.

### Phase 2 — Collaboration

- Comments.
- Attachments.
- Activity.
- Notification.
- Socket.IO.

### Phase 3 — Productivity

- Search.
- Filter.
- Calendar.
- Timeline.
- Dashboard.

### Phase 4 — Platform

- Automation.
- Template.
- Import/Export.
- API.
- Webhook.
- Integrations.

### Phase 5 — Intelligence

- AI Checklist.
- AI Task Breakdown.
- AI Summary.
- AI Planning.
- AI Command.

## 12. Source of product decisions

Các quyết định chức năng phải ưu tiên theo thứ tự:

```text
1. Project report / approved requirements
2. FRS
3. SRS
4. Product Owner decision
5. Implementation convention
```

Không tự thêm behavior làm thay đổi nghiệp vụ mà chưa được thống nhất.
