# PLANIFY – WORKSPACE, BOARD PERMISSION & CARD ASSIGNMENT PLAN

## 1. Mục tiêu

Tài liệu này định nghĩa nghiệp vụ phân quyền và phân công nhiệm vụ trong hệ thống **Planify**.

Hệ thống có 3 tầng chính:

```text
Workspace
   ↓
Board
   ↓
List
   ↓
Card
```

Phân quyền chỉ tồn tại ở 2 cấp:

```text
Workspace Role
Board Role
```

Phân công công việc tồn tại ở Card:

```text
Card Assignment
```

Phải phân biệt rõ:

```text
Permission ≠ Assignment
```

- Permission quyết định user được phép làm gì.
- Assignment xác định user nào đang chịu trách nhiệm cho Card.
- User được assign Card không nhận thêm quyền ngoài Board Role hiện tại.

---

## 2. Tổng quan mô hình quyền

### 2.1 Workspace Role

Workspace có đúng 3 role:

```text
ADMIN
MEMBER
GUEST
```

Thứ tự quyền:

```text
ADMIN > MEMBER > GUEST
```

### 2.2 Board Role

Board có đúng 3 role:

```text
ADMIN
EDITOR
VIEWER
```

Thứ tự quyền:

```text
ADMIN > EDITOR > VIEWER
```

> Trong code/database dùng `EDITOR`, không dùng `EDITER`.

### 2.3 Card Assignment

Card không có role riêng.

Không tạo:

```text
CARD_ADMIN
CARD_EDITOR
CARD_VIEWER
```

Card chỉ có danh sách:

```text
assignedMembers
```

hoặc bảng database:

```text
card_members
```

Assignment chỉ thể hiện:

> User này đang được giao hoặc cùng tham gia thực hiện Card.

Quyền thao tác Card vẫn được xác định bởi `BoardMember.role`.

---

# 3. Workspace

## 3.1 Workspace Admin

Workspace Admin là người quản trị Workspace.

Có quyền:

- Xem Workspace.
- Xem thông tin Workspace.
- Sửa tên Workspace.
- Sửa mô tả Workspace.
- Thay đổi các thiết lập Workspace.
- Mời user vào Workspace.
- Xóa user khỏi Workspace.
- Thay đổi Workspace Role.
- Tạo Board.
- Xóa Workspace.
- Xem danh sách thành viên Workspace.

Workspace Admin không mặc định trở thành Board Admin của tất cả Board.

Board permission vẫn được xác định thông qua `BoardMember`.

## 3.2 Workspace Member

Workspace Member là thành viên chính thức của Workspace.

Có quyền:

- Xem Workspace.
- Xem thông tin Workspace.
- Xem danh sách Board mà mình được phép truy cập.
- Tạo Board.
- Tham gia các Board khi được thêm vào Board.

Không có quyền:

- Sửa Workspace.
- Xóa Workspace.
- Quản lý Workspace Member.
- Đổi Workspace Role của user khác.

## 3.3 Workspace Guest

Guest là thành viên có quyền hạn chế trong Workspace.

Guest thường được sử dụng cho:

- Khách hàng.
- Cộng tác viên.
- Người ngoài nhóm.
- Người chỉ cần truy cập một số Board.

Guest có quyền:

- Xem Workspace ở mức cơ bản.
- Xem những Board mà Guest được thêm vào.

Guest không có quyền:

- Tạo Board.
- Sửa Workspace.
- Xóa Workspace.
- Mời thành viên Workspace.
- Xóa thành viên Workspace.
- Đổi Workspace Role.

---

# 4. Workspace Permission Matrix

| Action | Admin | Member | Guest |
|---|---:|---:|---:|
| View Workspace | YES | YES | YES |
| View accessible Boards | YES | YES | YES |
| View Workspace Members | YES | YES | Limited |
| Create Board | YES | YES | NO |
| Edit Workspace | YES | NO | NO |
| Invite Workspace Member | YES | NO | NO |
| Remove Workspace Member | YES | NO | NO |
| Change Workspace Role | YES | NO | NO |
| Delete Workspace | YES | NO | NO |

---

# 5. Board

Board thuộc một Workspace.

Một user muốn thao tác trong Board phải có một record:

```text
BoardMember
```

Ví dụ:

```text
board_id = BOARD_01
user_id = USER_01
role = EDITOR
```

Workspace Role và Board Role phải được lưu riêng.

---

# 6. Board Admin

Board Admin có toàn quyền quản lý Board.

Có quyền:

- Xem Board.
- Sửa thông tin Board.
- Quản lý Board settings.
- Tạo List.
- Sửa List.
- Di chuyển List.
- Xóa List.
- Tạo Card.
- Sửa Card.
- Di chuyển Card.
- Archive Card.
- Xóa Card nếu hệ thống hỗ trợ.
- Tạo Checklist.
- Sửa Checklist.
- Thêm Attachment.
- Comment.
- Assign member vào Card.
- Unassign member khỏi Card.
- Mời user vào Board.
- Xóa user khỏi Board.
- Thay đổi Board Role.
- Xóa/archive Board.

---

# 7. Board Editor

Editor là thành viên trực tiếp làm việc trong Board.

Có quyền:

- Xem Board.
- Xem List.
- Tạo List.
- Sửa List.
- Di chuyển List.
- Xóa List.
- Tạo Card.
- Sửa Card.
- Di chuyển Card.
- Archive Card.
- Tạo Checklist.
- Sửa Checklist.
- Upload Attachment.
- Comment.
- Assign member vào Card.
- Unassign member khỏi Card.

Có quyền:

- Mời thành viên vào Board.

Không có quyền:

- Xóa Board.
- Quản lý Board settings.
- Xóa thành viên khỏi Board.
- Thay đổi Board Role.

---

# 8. Board Viewer

Viewer có nhiệm vụ theo dõi nội dung Board.

Có quyền:

- Xem Board.
- Xem List.
- Xem Card.
- Xem Checklist.
- Xem Attachment.
- Xem Activity.
- Comment nếu chức năng Comment được bật.

Không có quyền:

- Tạo List.
- Sửa List.
- Xóa List.
- Di chuyển List.
- Tạo Card.
- Sửa Card.
- Xóa Card.
- Di chuyển Card.
- Sửa Checklist.
- Upload Attachment.
- Assign Member.
- Unassign Member.
- Quản lý thành viên Board.
- Thay đổi Board Role.
- Sửa Board Settings.

---

# 8.1 Quy tắc mời và xóa thành viên Board

Quy tắc nghiệp vụ:

```text
ADMIN  → Invite Member: YES
ADMIN  → Remove Member: YES

EDITOR → Invite Member: YES
EDITOR → Remove Member: NO

VIEWER → Invite Member: NO
VIEWER → Remove Member: NO
```

Editor chỉ được **mời/thêm thành viên** vào Board.

Editor không được:

- Xóa thành viên khỏi Board.
- Thay đổi Board Role.
- Chuyển thành viên thành Admin/Editor/Viewer.
- Quản lý Board Settings.

Khi Editor mời một thành viên mới, role mặc định là:

```text
EDITOR
```

Nếu cần thay đổi role của thành viên sau khi thêm vào Board, chỉ Board Admin được thực hiện.

---

# 9. Board Permission Matrix

| Action | Admin | Editor | Viewer |
|---|---:|---:|---:|
| View Board | YES | YES | YES |
| View List/Card | YES | YES | YES |
| Create List | YES | YES | NO |
| Edit List | YES | YES | NO |
| Delete List | YES | YES | NO |
| Move List | YES | YES | NO |
| Create Card | YES | YES | NO |
| Edit Card | YES | YES | NO |
| Move Card | YES | YES | NO |
| Archive Card | YES | YES | NO |
| Edit Checklist | YES | YES | NO |
| Upload Attachment | YES | YES | NO |
| Comment | YES | YES | YES |
| Assign Card Member | YES | YES | NO |
| Remove Card Member | YES | YES | NO |
| Invite Board Member | YES | YES | NO |
| Remove Board Member | YES | NO | NO |
| Change Board Role | YES | NO | NO |
| Edit Board Settings | YES | NO | NO |
| Delete/Archive Board | YES | NO | NO |

---

# 10. Quan hệ giữa Workspace Role và Board Role

Workspace Role và Board Role là hai hệ thống quyền độc lập.

Ví dụ:

```text
Workspace: Planify

User A
Workspace Role = ADMIN

User B
Workspace Role = MEMBER

User C
Workspace Role = GUEST
```

Trong Board Backend:

```text
User A → ADMIN
User B → EDITOR
User C → VIEWER
```

Trong Board Design:

```text
User A → VIEWER
User B → ADMIN
User C → EDITOR
```

Điều này hợp lệ.

Không được suy luận:

```text
Workspace ADMIN = Board ADMIN
```

và không được suy luận:

```text
Workspace GUEST = Board VIEWER
```

Board Role phải được xác định từ `BoardMember`.

---

# 11. Board Membership

Một Board có danh sách thành viên riêng.

Ví dụ:

```text
Workspace:
A
B
C
D
E
```

Board Backend chỉ có:

```text
A
B
C
```

Khi truy cập Board Backend:

```text
A → allowed
B → allowed
C → allowed

D → denied
E → denied
```

Ở phiên bản nghiệp vụ hiện tại:

> Chỉ Board Member mới có quyền truy cập Board.

---

# 12. Card Assignment

Card có thể được giao cho một hoặc nhiều thành viên.

Ví dụ:

```text
Card:
Implement Authentication

Assigned Members:
- User A
- User B
```

Một Card có thể:

```text
0 assignee
1 assignee
N assignees
```

Do đó không lưu trực tiếp:

```text
card.assignee_id
```

Nên sử dụng quan hệ many-to-many thông qua:

```text
CardMember
```

---

# 13. Điều kiện được assign vào Card

Nguyên tắc:

> Chỉ user thuộc Board chứa Card mới được phân công vào Card đó.

Không lấy user trực tiếp từ Workspace.

Ví dụ:

```text
Workspace:
A
B
C
D
E

Board Backend:
A
B
C
```

Danh sách Assign Member chỉ được hiển thị:

```text
A
B
C
```

Không hiển thị:

```text
D
E
```

---

# 14. Role được phép nhận Card

Business rule hiện tại:

```text
BOARD ADMIN → assignable
EDITOR      → assignable
VIEWER      → not assignable
```

Lý do:

```text
ADMIN / EDITOR
= người trực tiếp tham gia thực hiện công việc

VIEWER
= người chỉ theo dõi
```

Rule:

```text
canBeAssigned(user, board)
=
user is BoardMember
AND
BoardMember.role IN (ADMIN, EDITOR)
```

---

# 15. Ai được phép assign Card?

Người thực hiện thao tác Assign phải có Board Role:

```text
ADMIN
hoặc
EDITOR
```

Viewer không được Assign.

Rule:

```text
canAssignCard(actor)
=
actor.boardRole IN (ADMIN, EDITOR)
```

---

# 16. Validate khi Assign Card

Backend bắt buộc kiểm tra.

Không được chỉ dựa vào frontend.

Khi:

```http
POST /cards/{cardId}/members
```

Backend phải:

1. Tìm Card.
2. Tìm Board chứa Card.
3. Kiểm tra actor có thuộc Board hay không.
4. Kiểm tra actor.role là `ADMIN` hoặc `EDITOR`.
5. Kiểm tra targetUser có thuộc Board hay không.
6. Kiểm tra targetUser.role là `ADMIN` hoặc `EDITOR`.
7. Kiểm tra targetUser đã được assign chưa.
8. Nếu chưa, tạo `CardMember`.
9. Tạo Activity Log.
10. Tạo Notification nếu hệ thống hỗ trợ.

---

# 17. Pseudo Logic – Assign Card

```text
function assignMemberToCard(actorId, cardId, targetUserId):

    card = findCard(cardId)

    if card does not exist:
        return CARD_NOT_FOUND

    board = findBoard(card.boardId)

    actorBoardMember =
        findBoardMember(board.id, actorId)

    if actorBoardMember does not exist:
        return FORBIDDEN

    if actorBoardMember.role not in [ADMIN, EDITOR]:
        return FORBIDDEN

    targetBoardMember =
        findBoardMember(board.id, targetUserId)

    if targetBoardMember does not exist:
        return USER_NOT_IN_BOARD

    if targetBoardMember.role == VIEWER:
        return VIEWER_CANNOT_BE_ASSIGNED

    if cardMember already exists:
        return ALREADY_ASSIGNED

    create CardMember(
        cardId,
        targetUserId,
        assignedBy = actorId
    )

    create ActivityLog(...)
    create Notification(...)

    return SUCCESS
```

---

# 18. Remove Card Assignment

Admin hoặc Editor được phép bỏ assignment.

Backend validate:

```text
actor belongs to Board
AND
actor.role IN (ADMIN, EDITOR)
```

Sau đó xóa `CardMember` và tạo `ActivityLog`.

---

# 19. CardMember không tạo permission mới

Ví dụ:

```text
User A:
Board Role = EDITOR
Card Member = YES
```

User A có quyền sửa Card vì:

```text
Board Role = EDITOR
```

không phải vì:

```text
Card Member = YES
```

Tương tự:

```text
User B:
Board Role = EDITOR
Card Member = NO
```

User B vẫn có thể sửa Card.

Assignment chỉ phục vụ:

- Xác định trách nhiệm.
- Filter My Tasks.
- Notification.
- Dashboard.
- Calendar.
- Workload.
- Activity.
- Search/filter.

---

# 20. Database Model đề xuất

## WorkspaceMember

```text
WorkspaceMember
--------------------------------
workspaceId
userId
role
joinedAt
```

Role:

```text
ADMIN
MEMBER
GUEST
```

Unique:

```text
(workspaceId, userId)
```

## BoardMember

```text
BoardMember
--------------------------------
boardId
userId
role
joinedAt
```

Role:

```text
ADMIN
EDITOR
VIEWER
```

Unique:

```text
(boardId, userId)
```

## CardMember

```text
CardMember
--------------------------------
cardId
userId
assignedBy
assignedAt
```

Unique:

```text
(cardId, userId)
```

`assignedBy` tham chiếu User thực hiện thao tác phân công.

---

# 21. Enum

```text
WorkspaceRole:
- ADMIN
- MEMBER
- GUEST
```

```text
BoardRole:
- ADMIN
- EDITOR
- VIEWER
```

Không sử dụng raw string rải rác trong source code nếu framework/ngôn ngữ hỗ trợ Enum.

---

# 22. UI – Workspace

## ADMIN

Hiển thị:

```text
Create Board
Invite Member
Manage Members
Workspace Settings
```

## MEMBER

Hiển thị:

```text
Create Board
```

Không hiển thị:

```text
Manage Members
Workspace Settings
```

## GUEST

Không hiển thị:

```text
Create Board
Manage Members
Workspace Settings
```

Guest chỉ nhìn thấy các Board mà Guest tham gia.

---

# 23. UI – Board

## Admin

Hiện:

```text
Invite
Settings
Manage Members
Create List
Create Card
Assign Member
```

## Editor

Hiện:

```text
Invite
Create List
Create Card
Edit Card
Assign Member
```

Không hiện:

```text
Settings
Remove Member
Change Member Role
```

## Viewer

Ẩn tất cả action chỉnh sửa.

Chỉ hiển thị UI xem dữ liệu và Comment.

---

# 24. UI – Card Assignment

Trong Card Detail:

```text
Members

[Avatar A]
[Avatar B]

[+ Add Member]
```

Nút `+ Add Member` chỉ hiển thị cho:

```text
Board ADMIN
Board EDITOR
```

Viewer không thấy.

---

# 25. Member Selector

Frontend gọi:

```text
GET /boards/{boardId}/assignable-members
```

Backend chỉ trả:

```text
BoardMember.role = ADMIN
OR
BoardMember.role = EDITOR
```

Không trả Viewer.

Không query trực tiếp toàn bộ WorkspaceMember cho component này.

---

# 26. Nếu đổi Editor thành Viewer

Trường hợp:

```text
User A
EDITOR → VIEWER
```

nhưng User A đang được assign Card.

Business rule:

> Khi user bị đổi từ ADMIN/EDITOR thành VIEWER, hệ thống phải remove user khỏi tất cả Card Assignment trong Board đó.

Flow:

```text
Change Board Role
EDITOR
   ↓
VIEWER
   ↓
Find CardMember
WHERE
userId = User A
AND
card.boardId = currentBoard
   ↓
Remove assignments
```

Sau đó ghi Activity Log.

---

# 27. Nếu Remove Member khỏi Board

Backend phải:

1. Remove tất cả `CardMember` của user trong Board.
2. Remove `BoardMember`.
3. Cleanup dữ liệu liên quan nếu cần.
4. Create `ActivityLog`.

Không được để `CardMember` trỏ đến user không còn thuộc Board.

---

# 28. Nếu Remove Member khỏi Workspace

Với business hiện tại:

> Board Member phải thuộc Workspace.

Flow:

```text
Remove Workspace Member
        ↓
Tìm tất cả Board thuộc Workspace
mà user đang tham gia
        ↓
Remove Card assignments
        ↓
Remove Board memberships
        ↓
Remove Workspace membership
```

---

# 29. Điều kiện thêm người vào Board

Một user muốn được thêm vào Board phải:

```text
User ∈ Workspace
```

Nếu chưa thuộc Workspace:

```text
Invite user to Workspace first
```

sau đó mới:

```text
Add user to Board
```

Flow:

```text
User
 ↓
WorkspaceMember
 ↓
BoardMember
 ↓
CardMember
```

Không được bỏ qua tầng.

---

# 30. Membership Invariants

### Rule 1

```text
BoardMember
→ phải có WorkspaceMember tương ứng.
```

### Rule 2

```text
CardMember
→ phải có BoardMember tương ứng.
```

### Rule 3

```text
CardMember
→ BoardMember.role phải là ADMIN hoặc EDITOR.
```

### Rule 4

```text
VIEWER
→ không xuất hiện trong CardMember.
```

### Rule 5

```text
WorkspaceRole
không quyết định BoardPermission.
```

### Rule 6

```text
CardMember
không quyết định CardPermission.
```

---

# 31. Permission Resolution

Khi request liên quan Workspace:

```text
resolve WorkspaceMember
→ check WorkspaceRole
```

Khi request liên quan Board/List/Card:

```text
resolve Board
→ resolve BoardMember
→ check BoardRole
```

Không dùng WorkspaceRole để authorize:

```text
Create Card
Edit Card
Move Card
Assign Card
```

Những operation này dựa vào BoardRole.

---

# 32. Authorization Example

Request:

```text
PATCH /cards/{cardId}
```

Flow:

```text
Card
 ↓
List
 ↓
Board
 ↓
BoardMember(currentUser)
 ↓
role?
```

Nếu:

```text
ADMIN → ALLOW
EDITOR → ALLOW
VIEWER → DENY
not member → DENY
```

---

# 33. Frontend Permission Helper

Frontend nên có helper tập trung.

Ví dụ:

```text
canManageWorkspace(role)
canCreateBoard(role)
canManageBoard(role)
canEditBoardContent(role)
canManageBoardMembers(role)
canAssignCard(role)
canComment(role)
```

Không nên kiểm tra trực tiếp `role === "ADMIN"` rải rác khắp component nếu có thể tránh.

---

# 34. Backend Permission Helper

Backend cũng nên centralized permission.

Ví dụ:

```text
WorkspacePermissionService
BoardPermissionService
```

Pseudo:

```text
canEditBoardContent(role):
    return role == ADMIN
        OR role == EDITOR
```

```text
canManageBoard(role):
    return role == ADMIN
```

```text
canViewBoard(role):
    return role IN [
        ADMIN,
        EDITOR,
        VIEWER
    ]
```

---

# 35. Activity Log

Các thao tác permission và assignment quan trọng phải ghi log.

Ví dụ:

```text
Quân invited Thắng to Workspace.

Quân changed Thắng's Workspace role
from GUEST to MEMBER.

Quân added Thắng to Board Backend.

Quân changed Thắng's Board role
from VIEWER to EDITOR.

Quân assigned Thắng to Authentication API.

Quân removed Thắng from Authentication API.

Quân removed Thắng from Board Backend.
```

---

# 36. Notification

Các sự kiện nên tạo Notification:

```text
Added to Workspace
Added to Board
Board role changed
Assigned to Card
Removed from Card
Mentioned in Comment
Card due date approaching
```

---

# 37. My Tasks

Trang My Tasks chỉ lấy Card mà current user được assign.

Query logic:

```text
CardMember.userId = currentUser.id
```

Không lấy toàn bộ Card mà user có quyền xem.

---

# 38. Filter Card theo Member

Board filter:

```text
Member: Quân
```

phải filter theo:

```text
CardMember
```

không phải:

```text
BoardMember
```

---

# 39. Dashboard / Workload

Trong tương lai có thể tính workload:

```text
User A
5 Cards

User B
3 Cards

User C
8 Cards
```

Nguồn dữ liệu:

```text
CardMember
```

Có thể kết hợp:

```text
Card status
dueDate
priority
checklist progress
```

---

# 40. Các trường hợp AI Agent không được implement sai

### Sai 1

```text
Workspace ADMIN
≠
automatically Board ADMIN
```

### Sai 2

Không cho Workspace Member mặc định thấy/sửa tất cả Board.

Phải kiểm tra:

```text
BoardMember
```

### Sai 3

Không cho user không thuộc Board được assign Card.

### Sai 4

Không cho Viewer được assign Card.

### Sai 5

Không cho Card Assignee có quyền sửa Card chỉ vì được assign.

Quyền đến từ `BoardRole`.

### Sai 6

Không lấy `WorkspaceMember` để hiển thị dropdown Assign Card.

Phải lấy:

```text
BoardMember
WHERE role IN (ADMIN, EDITOR)
```

### Sai 7

Khi remove Board Member phải cleanup `CardMember`.

---

# 41. Luồng nghiệp vụ hoàn chỉnh

```text
CREATE WORKSPACE
        ↓
Creator becomes
Workspace ADMIN
        ↓
Invite Users
        ↓
ADMIN / MEMBER / GUEST
        ↓
Create Board
        ↓
Board creator becomes
Board ADMIN
        ↓
Add Workspace Members to Board
        ↓
ADMIN / EDITOR / VIEWER
        ↓
Create List
        ↓
Create Card
        ↓
Assign Board ADMIN / EDITOR
        ↓
CardMember created
        ↓
Notification
        ↓
Activity Log
        ↓
My Tasks / Dashboard
```

---

# 42. Default Roles

## Khi tạo Workspace

Creator:

```text
WorkspaceRole = ADMIN
```

## Khi tạo Board

Creator:

```text
BoardRole = ADMIN
```

## Khi mời vào Workspace

Default:

```text
MEMBER
```

Admin có thể chọn:

```text
MEMBER
GUEST
```

## Khi thêm vào Board

Default:

```text
EDITOR
```

Admin có thể chọn:

```text
ADMIN
EDITOR
VIEWER
```

---

# 43. Minimum API Requirements

## Workspace

```text
GET    /workspaces/{id}
GET    /workspaces/{id}/members
POST   /workspaces/{id}/members
PATCH  /workspaces/{id}/members/{userId}/role
DELETE /workspaces/{id}/members/{userId}
```

## Board

```text
GET    /boards/{id}
GET    /boards/{id}/members
POST   /boards/{id}/members
PATCH  /boards/{id}/members/{userId}/role
DELETE /boards/{id}/members/{userId}
```

## Assignment

```text
GET /boards/{boardId}/assignable-members
GET /cards/{cardId}/members
POST /cards/{cardId}/members
DELETE /cards/{cardId}/members/{userId}
```

Body khi assign:

```json
{
  "userId": "..."
}
```

---

# 44. Minimum Test Cases

## TC01 – Workspace Admin

Given:

```text
User = Workspace ADMIN
```

When:

```text
Invite Workspace Member
```

Then:

```text
ALLOW
```

## TC02 – Workspace Member

Given:

```text
User = Workspace MEMBER
```

When:

```text
Change another user's Workspace Role
```

Then:

```text
DENY
```

## TC03 – Board Admin

Given:

```text
User = Board ADMIN
```

When:

```text
Invite Board Member
```

Then:

```text
ALLOW
```

## TC04 – Board Editor

Given:

```text
User = Board EDITOR
```

When:

```text
Create Card
```

Then:

```text
ALLOW
```

## TC05 – Board Editor mời thành viên

Given:

```text
User = Board EDITOR
```

When:

```text
Invite Board Member
```

Then:

```text
ALLOW
```

## TC05B – Board Editor xóa thành viên

Given:

```text
User = Board EDITOR
```

When:

```text
Remove Board Member
```

Then:

```text
DENY
```

## TC05C – Board Editor đổi quyền thành viên

Given:

```text
User = Board EDITOR
```

When:

```text
Change Board Member Role
```

Then:

```text
DENY
```

## TC06 – Viewer

Given:

```text
User = Board VIEWER
```

When:

```text
Edit Card
```

Then:

```text
DENY
```

## TC07 – Assign Editor

Given:

```text
Actor = Board ADMIN
Target = Board EDITOR
```

When:

```text
Assign Target to Card
```

Then:

```text
ALLOW
```

## TC08 – Assign Viewer

Given:

```text
Target = Board VIEWER
```

When:

```text
Assign Target to Card
```

Then:

```text
DENY
```

## TC09 – Assign Workspace-only user

Given:

```text
Target ∈ Workspace
Target ∉ Board
```

When:

```text
Assign Target to Card
```

Then:

```text
DENY
```

## TC10 – Remove Board Member

Given:

```text
User has Card assignments
```

When:

```text
Remove User from Board
```

Then:

```text
All CardMember records
of that user in the Board
must be removed.
```

## TC11 – Downgrade to Viewer

Given:

```text
User role = EDITOR
and user has Card assignments
```

When:

```text
EDITOR → VIEWER
```

Then:

```text
Remove Card assignments
for this Board.
```

## TC12 – Card Assignee Permission

Given:

```text
User A = EDITOR
User A is NOT assigned Card X
```

When:

```text
User A edits Card X
```

Then:

```text
ALLOW
```

Reason:

```text
Board permission
is independent
from Card assignment.
```

---

# 45. Acceptance Criteria

Implementation hoàn thành khi:

1. Workspace chỉ có `ADMIN`, `MEMBER`, `GUEST`.
2. Board chỉ có `ADMIN`, `EDITOR`, `VIEWER`.
3. WorkspaceRole và BoardRole được lưu độc lập.
4. Chỉ BoardMember mới được truy cập Board.
5. Admin và Editor có thể thao tác nội dung Board.
6. Viewer chỉ được xem và comment.
7. Admin và Editor đều có thể mời thành viên vào Board; chỉ Admin được xóa thành viên, đổi Board Role và quản lý Board Settings.
8. Card không có permission role riêng.
9. Một Card có thể có nhiều assignee.
10. Chỉ Board Admin và Editor có thể được assign Card.
11. Chỉ Board Admin và Editor có thể assign/unassign.
12. Dropdown Assignment chỉ lấy BoardMember có role `ADMIN` hoặc `EDITOR`.
13. User không thuộc Board không được assign.
14. Downgrade user thành Viewer phải cleanup Card Assignment.
15. Remove user khỏi Board phải cleanup Card Assignment.
16. Backend luôn validate permission, không tin frontend.
17. Frontend ẩn/disable action dựa trên permission.
18. Activity Log ghi lại các thay đổi role và assignment.
19. Notification được tạo khi user được assign Card.
20. My Tasks dựa vào CardMember, không dựa vào BoardMember.

---

# 46. Business Model cuối cùng

AI Agent phải hiểu mô hình hệ thống như sau:

```text
USER
 │
 ▼
WORKSPACE
 │
 ├── ADMIN
 ├── MEMBER
 └── GUEST
 │
 ▼
BOARD
 │
 ├── ADMIN
 ├── EDITOR
 └── VIEWER
 │
 ▼
LIST
 │
 ▼
CARD
 │
 └── assignedMembers[]
```

Permission:

```text
Workspace actions
→ WorkspaceRole
```

```text
Board / List / Card actions
→ BoardRole
```

Assignment:

```text
Who is responsible for Card?
→ CardMember
```

Nguyên tắc quan trọng nhất:

```text
BoardRole determines ACCESS.

CardMember determines RESPONSIBILITY.
```

Hai khái niệm này tuyệt đối không được gộp chung trong implementation.
