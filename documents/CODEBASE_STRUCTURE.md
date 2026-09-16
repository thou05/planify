# PLANIFY — SYSTEM CODEBASE STRUCTURE

> Tài liệu định nghĩa cấu trúc source code cho Planify theo hướng **feature-based + layered architecture**, tách rõ Frontend/Backend, API contracts, types/interfaces, hooks, services, repositories, modules và shared utilities.
>
> Mục tiêu chính: dự án lớn vẫn dễ đọc, dễ mở rộng, dễ test, hạn chế import vòng, hạn chế coupling giữa UI và business logic.

---

## 1. Kiến trúc tổng thể

Planify sử dụng mô hình:

```text
                    ┌─────────────────────────┐
                    │        Frontend         │
                    │       Next.js           │
                    └────────────┬────────────┘
                                 │
                         HTTP / WebSocket
                                 │
                    ┌────────────▼────────────┐
                    │         Backend         │
                    │         NestJS          │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
        PostgreSQL            Redis            LLM API
         Supabase             Cache                AI
```

Các nguyên tắc:

1. Frontend không truy cập database trực tiếp cho nghiệp vụ chính.
2. Frontend chỉ giao tiếp với Backend thông qua API hoặc Socket.IO.
3. Frontend không chứa business logic quan trọng trong component.
4. Backend không chứa logic UI.
5. Business logic nằm trong service/use-case layer.
6. Database access tập trung tại repository/data-access layer.
7. Request/Response có DTO và contract rõ ràng.
8. Type/interface được chia theo phạm vi sử dụng, không tạo một thư mục `types` khổng lồ không kiểm soát.
9. Mỗi feature lớn nên có module riêng.
10. Shared code chỉ chứa thứ thực sự dùng chung.

---

# 2. Monorepo structure

Khuyến nghị tổ chức repository:

```text
planify/
├── apps/
│   ├── web/                  # Next.js Frontend
│   └── api/                  # NestJS Backend
│
├── packages/
│   ├── api-contracts/        # DTO/schema/contract dùng chung nếu cần
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/                   # Shared UI primitives, nếu cần
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── decisions/
│
├── scripts/
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

Có thể triển khai Frontend và Backend thành hai repository riêng ở giai đoạn đầu. Tuy nhiên, với dự án lớn, monorepo giúp quản lý contract, types và tooling đồng bộ hơn.

---

# 3. Frontend — Next.js

## 3.1. Cấu trúc thư mục

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── workspaces/
│   │   │   ├── boards/
│   │   │   └── notifications/
│   │   │
│   │   ├── boards/
│   │   │   └── [boardId]/
│   │   │       ├── page.tsx
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       └── _components/
│   │   │
│   │   ├── settings/
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/              # Button, Modal, Input...
│   │   ├── layout/          # Sidebar, Header...
│   │   ├── feedback/        # Toast, EmptyState...
│   │   └── data-display/    # Table, AvatarGroup...
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── workspace/
│   │   ├── board/
│   │   ├── list/
│   │   ├── card/
│   │   ├── checklist/
│   │   ├── label/
│   │   ├── comment/
│   │   ├── attachment/
│   │   ├── notification/
│   │   ├── search/
│   │   ├── automation/
│   │   ├── ai/
│   │   └── dashboard/
│   │
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   ├── use-click-outside.ts
│   │   └── use-websocket.ts
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── socket/
│   │   ├── query/
│   │   ├── storage/
│   │   ├── validation/
│   │   ├── permissions/
│   │   ├── formatters/
│   │   └── utils/
│   │
│   ├── types/
│   │   ├── common.ts
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   └── pagination.ts
│   │
│   ├── constants/
│   │   ├── routes.ts
│   │   ├── query-keys.ts
│   │   ├── storage-keys.ts
│   │   └── app.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── navigation.ts
│   │   └── feature-flags.ts
│   │
│   ├── providers/
│   │   ├── query-provider.tsx
│   │   ├── auth-provider.tsx
│   │   ├── theme-provider.tsx
│   │   └── socket-provider.tsx
│   │
│   └── middleware.ts
│
├── public/
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
│
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

# 4. Frontend responsibilities

## 4.1. `app/`

`app/` chịu trách nhiệm cho routing và composition của page.

```text
app/
├── login/
│   └── page.tsx
└── boards/
    └── [boardId]/
        └── page.tsx
```

Không nên đặt business logic lớn trực tiếp trong `page.tsx`.

Ví dụ:

```tsx
export default function BoardPage() {
  return <BoardScreen />;
}
```

Business/UI phức tạp được đưa sang:

```text
features/board/
```

hoặc:

```text
app/boards/[boardId]/_components/
```

---

# 5. Frontend Feature-Based Architecture

Mỗi feature nên được tổ chức độc lập.

Ví dụ:

```text
features/card/
├── api/
│   ├── card.api.ts
│   └── card.queries.ts
│
├── components/
│   ├── card-item.tsx
│   ├── card-detail.tsx
│   ├── card-editor.tsx
│   ├── card-members.tsx
│   └── card-actions.tsx
│
├── hooks/
│   ├── use-card.ts
│   ├── use-card-mutation.ts
│   └── use-card-dnd.ts
│
├── store/
│   └── card.store.ts
│
├── schemas/
│   └── card.schema.ts
│
├── types/
│   └── card.types.ts
│
├── constants/
│   └── card.constants.ts
│
├── utils/
│   └── card.utils.ts
│
└── index.ts
```

### Quy tắc

`features/card` chỉ chịu trách nhiệm cho Card.

Ví dụ:

- render Card
- edit Card
- move Card
- assign member
- complete Card
- checklist trong Card
- xử lý state liên quan Card

Không nên để Card import trực tiếp database model hoặc Supabase client.

---

# 6. Components

Có hai loại component chính.

## 6.1. Shared Components

```text
components/ui/
├── button.tsx
├── input.tsx
├── dialog.tsx
├── dropdown.tsx
├── tooltip.tsx
├── badge.tsx
└── avatar.tsx
```

Đây là các component không biết business logic của Planify.

Ví dụ:

```tsx
<Button variant="primary">
  Save
</Button>
```

## 6.2. Feature Components

```text
features/board/components/
features/card/components/
features/workspace/components/
```

Các component này biết domain nghiệp vụ.

Ví dụ:

```tsx
<CardItem
  card={card}
  onMove={handleMove}
/>
```

---

# 7. Hooks

Chia hooks thành hai nhóm.

## 7.1. Global Hooks

```text
hooks/
├── use-debounce.ts
├── use-media-query.ts
├── use-click-outside.ts
├── use-keyboard-shortcut.ts
└── use-websocket.ts
```

Chỉ chứa logic thực sự dùng chung.

## 7.2. Feature Hooks

```text
features/card/hooks/
features/board/hooks/
features/workspace/hooks/
```

Ví dụ:

```ts
useCard()
useCreateCard()
useUpdateCard()
useMoveCard()
useDeleteCard()
```

Không nên:

```ts
useEverything()
```

Một hook nên có trách nhiệm rõ ràng.

---

# 8. API Layer — Frontend

Không gọi `fetch()` trực tiếp trong mọi component.

Sai:

```tsx
const response = await fetch("/api/boards");
```

Nên:

```text
lib/api/
├── client.ts
├── error.ts
└── request.ts
```

và feature API:

```text
features/board/api/
├── board.api.ts
├── board.queries.ts
└── board.mutations.ts
```

Ví dụ:

```ts
export const boardApi = {
  getById: (boardId: string) =>
    apiClient.get<BoardResponse>(`/boards/${boardId}`),

  create: (payload: CreateBoardRequest) =>
    apiClient.post<BoardResponse>("/boards", payload),

  update: (boardId: string, payload: UpdateBoardRequest) =>
    apiClient.patch<BoardResponse>(
      `/boards/${boardId}`,
      payload,
    ),
};
```

---

# 9. API Contracts

Contract phải rõ giữa Frontend và Backend.

Có thể tổ chức:

```text
packages/api-contracts/
├── auth/
│   ├── auth.request.ts
│   └── auth.response.ts
│
├── workspace/
├── board/
├── list/
├── card/
├── checklist/
├── comment/
├── notification/
└── common/
```

Ví dụ:

```ts
export interface CreateCardRequest {
  title: string;
  listId: string;
  description?: string;
  dueDate?: string;
}
```

Response:

```ts
export interface CardResponse {
  id: string;
  title: string;
  description: string | null;
  listId: string;
  createdAt: string;
  updatedAt: string;
}
```

Contract là "hợp đồng" giữa hai bên, không nên để Frontend tự suy đoán response.

---

# 10. Types vs Interfaces

Không tạo một file:

```text
types.ts
```

chứa toàn bộ project.

Nên chia theo domain:

```text
features/
├── card/types/
│   ├── card.types.ts
│   ├── card-status.types.ts
│   └── card-filter.types.ts
│
├── board/types/
│   ├── board.types.ts
│   └── board-view.types.ts
│
└── workspace/types/
    └── workspace.types.ts
```

### Nguyên tắc

- Entity type → domain.
- API Request/Response → contract.
- Form type → schema/form layer.
- UI state → feature/store.
- Shared primitive → `types/common.ts`.

---

# 11. Validation

Dùng schema validation riêng.

```text
features/card/schemas/
├── create-card.schema.ts
├── update-card.schema.ts
└── card-filter.schema.ts
```

Ví dụ:

```ts
const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  listId: z.string().uuid(),
  description: z.string().optional(),
});
```

Schema có thể dùng cho:

```text
Form validation
API payload validation
Data parsing
```

---

# 12. State Management

Không đưa toàn bộ state vào một global store.

Phân loại:

```text
Server state
    ↓
TanStack Query / equivalent

UI state
    ↓
Local state / Zustand

Realtime state
    ↓
Socket event handlers

Form state
    ↓
React Hook Form / equivalent
```

Ví dụ:

```text
features/card/store/
└── card.store.ts
```

Chỉ lưu state thực sự cần chia sẻ.

---

# 13. Backend — NestJS

## 13.1. Cấu trúc

```text
apps/api/
├── src/
│   ├── main.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── ai.config.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── pipes/
│   │   ├── middleware/
│   │   ├── exceptions/
│   │   ├── constants/
│   │   └── utils/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── workspaces/
│   │   ├── invitations/
│   │   ├── boards/
│   │   ├── lists/
│   │   ├── cards/
│   │   ├── labels/
│   │   ├── checklists/
│   │   ├── comments/
│   │   ├── attachments/
│   │   ├── custom-fields/
│   │   ├── notifications/
│   │   ├── search/
│   │   ├── views/
│   │   ├── activity/
│   │   ├── automation/
│   │   ├── realtime/
│   │   ├── dashboard/
│   │   └── ai/
│   │
│   ├── database/
│   │   ├── prisma/           # hoặc repository adapter tương ứng
│   │   ├── migrations/
│   │   └── seed/
│   │
│   ├── integrations/
│   │   ├── supabase/
│   │   ├── redis/
│   │   ├── ai/
│   │   ├── storage/
│   │   └── email/
│   │
│   ├── events/
│   │   ├── event-bus.ts
│   │   ├── event.types.ts
│   │   └── handlers/
│   │
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

# 14. Backend Module Structure

Mỗi module/domain nên độc lập.

Ví dụ:

```text
modules/cards/
├── cards.module.ts
│
├── controllers/
│   └── cards.controller.ts
│
├── services/
│   ├── create-card.service.ts
│   ├── update-card.service.ts
│   ├── move-card.service.ts
│   ├── delete-card.service.ts
│   └── get-card.service.ts
│
├── repositories/
│   ├── card.repository.ts
│   └── card.repository.interface.ts
│
├── dto/
│   ├── create-card.dto.ts
│   ├── update-card.dto.ts
│   └── move-card.dto.ts
│
├── entities/
│   └── card.entity.ts
│
├── interfaces/
│   ├── card.interface.ts
│   └── card-permission.interface.ts
│
├── policies/
│   └── card.policy.ts
│
├── events/
│   ├── card-created.event.ts
│   ├── card-updated.event.ts
│   └── card-moved.event.ts
│
├── mappers/
│   └── card.mapper.ts
│
├── validators/
│   └── card.validator.ts
│
└── index.ts
```

---

# 15. Controller — chỉ nhận và trả HTTP

Controller không nên chứa nghiệp vụ.

Không nên:

```ts
@Post()
async create(@Body() dto: CreateCardDto) {
  // validate quyền
  // query database
  // tính position
  // tạo card
  // emit event
  // gửi notification
}
```

Nên:

```ts
@Post()
create(
  @CurrentUser() user: AuthUser,
  @Body() dto: CreateCardDto,
) {
  return this.createCardService.execute({
    userId: user.id,
    ...dto,
  });
}
```

Controller chịu trách nhiệm:

```text
HTTP request
    ↓
Authentication
    ↓
DTO validation
    ↓
Service
    ↓
HTTP response
```

---

# 16. Service / Use Case

Business logic đặt ở đây.

```text
create-card.service.ts
move-card.service.ts
assign-card-member.service.ts
complete-card.service.ts
```

Ví dụ:

```ts
@Injectable()
export class MoveCardService {
  async execute(command: MoveCardCommand) {
    // 1. Kiểm tra Card
    // 2. Kiểm tra quyền
    // 3. Kiểm tra List
    // 4. Tính vị trí
    // 5. Transaction
    // 6. Ghi Activity
    // 7. Phát event
    // 8. Realtime notification
  }
}
```

Điều này giúp logic không bị dính vào controller hoặc database.

---

# 17. Repository

Repository là abstraction của data access.

```ts
export interface CardRepository {
  findById(id: string): Promise<Card | null>;

  create(data: CreateCardData): Promise<Card>;

  update(
    id: string,
    data: UpdateCardData,
  ): Promise<Card>;

  delete(id: string): Promise<void>;

  move(
    cardId: string,
    listId: string,
    position: number,
  ): Promise<Card>;
}
```

Implementation:

```text
repositories/
├── card.repository.interface.ts
└── supabase-card.repository.ts
```

Service không nên phụ thuộc trực tiếp vào Supabase query.

---

# 18. DTO

DTO mô tả dữ liệu vào/ra API.

```text
dto/
├── create-card.dto.ts
├── update-card.dto.ts
├── move-card.dto.ts
├── assign-member.dto.ts
└── card-filter.dto.ts
```

DTO chịu trách nhiệm:

- validation
- required fields
- optional fields
- enum
- primitive constraints

DTO không nên chứa toàn bộ business logic.

---

# 19. Entity

Entity đại diện cho domain object.

```ts
export interface Card {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  status: CardStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Không nên đồng nhất:

```text
Database row
=
Entity
=
API Response
```

Ba khái niệm này có thể giống nhau ở project nhỏ nhưng nên tách abstraction khi hệ thống phát triển.

---

# 20. Mapper

Mapper chuyển đổi giữa các layer.

```text
Database model
      ↓
Repository
      ↓
Domain Entity
      ↓
Mapper
      ↓
API Response
```

Ví dụ:

```ts
CardMapper.toResponse(card)
```

Lợi ích:

- Không expose database model.
- Dễ đổi schema database.
- Dễ thay đổi API response.
- Giảm coupling.

---

# 21. Interfaces

Interface phải đặt gần domain sử dụng.

Ví dụ:

```text
modules/cards/interfaces/
├── card.repository.ts
├── card-permission.ts
├── card-command.ts
└── card-query.ts
```

Không nên tạo:

```text
interfaces/
└── all-interfaces.ts
```

vì file sẽ phình to và tạo coupling.

---

# 22. Permission / Authorization

Quyền nên được tách thành policy/service riêng.

```text
common/
└── guards/

modules/
├── workspaces/
│   └── policies/
│       └── workspace.policy.ts
│
├── boards/
│   └── policies/
│       └── board.policy.ts
│
└── cards/
    └── policies/
        └── card.policy.ts
```

Ví dụ:

```ts
cardPolicy.canUpdate({
  user,
  card,
});
```

Thay vì viết nhiều đoạn:

```ts
if (user.role === "OWNER" || user.role === "ADMIN") {
  ...
}
```

trực tiếp trong controller.

---

# 23. Realtime Architecture

Socket.IO nên tách khỏi REST controller.

```text
modules/realtime/
├── realtime.module.ts
├── gateways/
│   └── board.gateway.ts
├── handlers/
│   ├── card-events.handler.ts
│   ├── list-events.handler.ts
│   └── board-events.handler.ts
└── rooms/
    └── board-room.service.ts
```

Flow:

```text
User A
  │
  │ HTTP mutation
  ▼
Backend Service
  │
  ├── Database transaction
  │
  ├── Activity Log
  │
  └── Domain Event
         │
         ▼
      Socket.IO
         │
         ▼
      Board Room
       /      \
      /        \
 User B      User C
```

Không emit socket trước khi transaction thành công.

---

# 24. Redis

Redis không nên được gọi rải rác trong tất cả modules.

```text
integrations/redis/
├── redis.module.ts
├── redis.client.ts
├── cache.service.ts
├── lock.service.ts
└── rate-limit.service.ts
```

Các use case:

```text
Caching
Distributed lock
Rate limiting
Temporary session/state
Pub/Sub
Job coordination
```

Ví dụ:

```ts
await this.lockService.acquire(`board:${boardId}`);
```

---

# 25. AI Layer

AI nên là một module độc lập.

```text
modules/ai/
├── ai.module.ts
│
├── controllers/
│   └── ai.controller.ts
│
├── services/
│   ├── task-breakdown.service.ts
│   ├── checklist-generation.service.ts
│   ├── description-generation.service.ts
│   └── priority-suggestion.service.ts
│
├── providers/
│   ├── llm.provider.ts
│   └── prompt.provider.ts
│
├── prompts/
│   ├── task-breakdown.prompt.ts
│   ├── checklist.prompt.ts
│   └── description.prompt.ts
│
├── dto/
│   └── ai-request.dto.ts
│
├── schemas/
│   └── ai-output.schema.ts
│
└── types/
    └── ai.types.ts
```

AI provider không được gọi trực tiếp từ UI component.

Flow:

```text
Frontend
  ↓
AI API
  ↓
AI Service
  ↓
Prompt Builder
  ↓
LLM Provider
  ↓
Output Schema Validation
  ↓
Domain Result
```

---

# 26. Notification

Notification nên là domain/module riêng.

```text
modules/notifications/
├── notifications.module.ts
├── controllers/
├── services/
│   ├── create-notification.service.ts
│   ├── mark-read.service.ts
│   └── list-notifications.service.ts
├── repositories/
├── dto/
├── entities/
├── channels/
│   ├── in-app.channel.ts
│   ├── email.channel.ts
│   └── realtime.channel.ts
└── events/
```

Có thể dùng event:

```text
CardAssignedEvent
      ↓
NotificationHandler
      ├── Database notification
      ├── Socket.IO
      └── Email (nếu bật)
```

---

# 27. Activity / Audit Log

Tách thành module:

```text
modules/activity/
├── activity.module.ts
├── controllers/
├── services/
│   ├── create-activity.service.ts
│   └── query-activity.service.ts
├── repositories/
├── dto/
└── entities/
```

Một activity nên có concept:

```ts
{
  actorId,
  action,
  targetType,
  targetId,
  timestamp,
  metadata
}
```

Ví dụ:

```text
Nguyễn A moved "Implement Login"
from "Todo" to "Doing"
```

---

# 28. Database Access

Tất cả database access nên đi qua abstraction.

```text
modules/cards/repositories/
    ↓
Database Adapter
    ↓
Supabase / PostgreSQL
```

Không nên:

```text
Controller
   ↓
supabase.from(...)
```

Không nên:

```text
Frontend
   ↓
Supabase database
```

đối với các nghiệp vụ cần authorization/business rules.

---

# 29. Shared Types

Chỉ đưa type sang `packages/api-contracts` khi Frontend và Backend thật sự cần cùng contract.

```text
packages/api-contracts/
├── common/
│   ├── pagination.ts
│   ├── api-response.ts
│   └── error-response.ts
├── auth/
├── workspace/
├── board/
├── list/
├── card/
├── checklist/
└── notification/
```

Không đưa toàn bộ domain backend sang frontend.

---

# 30. API Response Standard

Nên thống nhất response format.

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Pagination:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error:

```json
{
  "error": {
    "code": "CARD_NOT_FOUND",
    "message": "Card not found",
    "requestId": "..."
  }
}
```

Frontend dựa trên `code` để xử lý thay vì phụ thuộc vào text message.

---

# 31. Naming Convention

## Frontend

```text
button.tsx
card-item.tsx
use-card.ts
card.api.ts
card.types.ts
card.schema.ts
card.constants.ts
```

## Backend

```text
cards.controller.ts
create-card.service.ts
card.repository.ts
create-card.dto.ts
card.entity.ts
card.policy.ts
card.mapper.ts
```

Tên file phải phản ánh đúng trách nhiệm.

---

# 32. Import Rules

Đây là phần rất quan trọng để project lớn không biến thành "spaghetti code".

## Rule 1

```text
UI Component
↓
Hook
↓
Feature API
↓
API Client
```

Không:

```text
UI Component → Database
```

## Rule 2

Backend:

```text
Controller
↓
Service / Use Case
↓
Repository
↓
Database
```

## Rule 3

Repository không được gọi Controller.

## Rule 4

Domain/service không import React.

## Rule 5

Feature chỉ import shared code hoặc dependency được phép.

---

# 33. Frontend Dependency Direction

```text
app/
 ↓
features/
 ↓
components / hooks / lib
 ↓
shared utilities
```

Không cho dependency chạy ngược:

```text
lib → features
components/ui → features
```

`components/ui` phải độc lập với business domain.

---

# 34. Backend Dependency Direction

```text
Controller
    ↓
Use Case / Service
    ↓
Repository Interface
    ↓
Repository Implementation
    ↓
Infrastructure
```

Ví dụ:

```text
CardsController
      ↓
MoveCardService
      ↓
CardRepository
      ↓
SupabaseCardRepository
      ↓
Supabase
```

---

# 35. Feature Module Example — Card

Toàn bộ Card:

```text
Frontend
────────────────────────────────────
features/card/
├── api/
├── components/
├── hooks/
├── schemas/
├── store/
├── types/
├── constants/
└── utils/


Backend
────────────────────────────────────
modules/cards/
├── controllers/
├── services/
├── repositories/
├── dto/
├── entities/
├── interfaces/
├── policies/
├── events/
├── mappers/
└── validators/
```

Khi cần phát triển Card, developer gần như chỉ cần tìm hai nơi này.

---

# 36. Feature Module Example — Board

```text
Frontend
features/board/
├── api/
├── components/
│   ├── board-header.tsx
│   ├── board-toolbar.tsx
│   ├── board-members.tsx
│   ├── board-settings.tsx
│   └── board-view-switcher.tsx
├── hooks/
├── types/
├── schemas/
├── store/
└── utils/


Backend
modules/boards/
├── controllers/
├── services/
├── repositories/
├── dto/
├── entities/
├── policies/
├── events/
└── mappers/
```

---

# 37. Khi nào tạo Shared Module?

Không nên đưa code vào shared chỉ vì "có vẻ dùng chung".

Quy tắc:

```text
Dùng ở 1 feature
    → đặt trong feature

Dùng ở 2–3 feature
    → cân nhắc shared

Dùng toàn hệ thống
    → shared/common
```

Ví dụ:

```text
CardDateFormatter
```

nếu chỉ dùng Card:

```text
features/card/utils/
```

Còn:

```text
formatDate()
```

dùng toàn app:

```text
lib/formatters/
```

---

# 38. Testing Structure

## Frontend

```text
apps/web/tests/
├── unit/
├── component/
└── e2e/
```

Feature test:

```text
features/card/
└── __tests__/
    ├── card.utils.test.ts
    ├── card.api.test.ts
    └── card-editor.test.tsx
```

## Backend

```text
apps/api/test/
├── unit/
├── integration/
└── e2e/
```

Module test:

```text
modules/cards/
└── __tests__/
    ├── create-card.service.spec.ts
    ├── move-card.service.spec.ts
    └── card.repository.spec.ts
```

---

# 39. Environment Variables

Không đọc `process.env` tùy ý trong mọi file.

Frontend:

```text
config/env.ts
```

Backend:

```text
config/
├── app.config.ts
├── database.config.ts
├── redis.config.ts
└── ai.config.ts
```

Ví dụ:

```ts
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
};
```

Backend validate environment khi application startup.

---

# 40. Error Handling

Frontend:

```text
lib/api/error.ts
```

Backend:

```text
common/
├── exceptions/
├── filters/
└── error-codes/
```

Ví dụ:

```text
CARD_NOT_FOUND
CARD_ACCESS_DENIED
BOARD_NOT_FOUND
BOARD_ACCESS_DENIED
INVALID_INVITATION
DUPLICATE_INVITATION
LIST_WIP_LIMIT_REACHED
ATTACHMENT_TOO_LARGE
```

Không trả stack trace hoặc internal database error cho client.

---

# 41. Logging

Backend:

```text
common/
└── logger/
    ├── logger.service.ts
    ├── logger.interceptor.ts
    └── logger.types.ts
```

Mức log:

```text
INFO
WARN
ERROR
DEBUG
```

Mỗi request nên có:

```text
requestId
userId (khi đã authenticated)
route
method
duration
statusCode
```

---

# 42. Route Organization

Frontend:

```text
routes.ts
```

Backend:

```text
/api/v1/auth
/api/v1/users
/api/v1/workspaces
/api/v1/boards
/api/v1/lists
/api/v1/cards
/api/v1/checklists
/api/v1/comments
/api/v1/attachments
/api/v1/notifications
/api/v1/search
/api/v1/automation
/api/v1/ai
```

Version API từ đầu:

```text
/api/v1/
```

để thuận tiện khi có:

```text
/api/v2/
```

---

# 43. Ví dụ Flow hoàn chỉnh — Move Card

```text
User Drag & Drop
       │
       ▼
Card DnD Component
       │
       ▼
useMoveCard()
       │
       ▼
card.api.ts
       │
       ▼
PUT/PATCH /api/v1/cards/:id/move
       │
       ▼
CardsController
       │
       ▼
MoveCardService
       │
       ├── CardPolicy
       │
       ├── CardRepository
       │
       ├── Transaction
       │
       ├── Activity Event
       │
       └── Realtime Event
                  │
                  ▼
              Socket.IO
                  │
                  ▼
            Other Clients
```

Đây là pattern cần áp dụng cho các nghiệp vụ quan trọng khác.

---

# 44. Ví dụ Flow — AI tạo Checklist

```text
User opens Card
       │
       ▼
"Generate Checklist"
       │
       ▼
useGenerateChecklist()
       │
       ▼
AI API
       │
       ▼
AiController
       │
       ▼
TaskBreakdownService
       │
       ▼
PromptProvider
       │
       ▼
LLM Provider
       │
       ▼
Schema Validation
       │
       ▼
Checklist result
       │
       ▼
Frontend Preview
       │
       ▼
User confirms
       │
       ▼
CreateChecklistService
```

AI output không nên ghi thẳng database trước khi được validate và theo flow nghiệp vụ phù hợp.

---

# 45. Quy tắc cho Developer

## Không được

```text
Component → fetch trực tiếp
Component → Supabase
Controller → SQL/query phức tạp
Service → React code
UI → business permission logic
Một file 1000+ dòng
Một global types.ts chứa toàn bộ type
Một global utils.ts chứa mọi utility
```

## Nên

```text
Feature isolation
Single responsibility
Clear interfaces
DTO validation
Repository abstraction
Service/use-case
Centralized API client
Typed contracts
Domain policies
Event-driven realtime
Unit + integration + E2E tests
```

---

# 46. Recommended "Golden Structure"

Đây là cấu trúc chuẩn nên dùng làm baseline cho Planify.

```text
planify/
│
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── features/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── types/
│   │       ├── constants/
│   │       ├── config/
│   │       └── providers/
│   │
│   └── api/
│       └── src/
│           ├── modules/
│           ├── common/
│           ├── config/
│           ├── integrations/
│           ├── events/
│           ├── database/
│           └── health/
│
├── packages/
│   ├── api-contracts/
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── decisions/
│
└── scripts/
```

---

# 47. Quy tắc phát triển feature mới

Khi thêm một chức năng mới, developer thực hiện theo thứ tự:

```text
1. Xác định Domain / Feature
         ↓
2. Định nghĩa Type / Contract
         ↓
3. Thiết kế API
         ↓
4. Backend DTO
         ↓
5. Backend Use Case / Service
         ↓
6. Repository
         ↓
7. Event / Notification nếu cần
         ↓
8. Frontend API
         ↓
9. Frontend Hook
         ↓
10. Frontend Component
         ↓
11. UI integration
         ↓
12. Unit test
         ↓
13. Integration test
         ↓
14. E2E test
```

---

# 48. Quy tắc Review Pull Request

Trước khi merge feature, kiểm tra:

```text
[ ] Có đúng module/domain không?
[ ] Controller có chứa business logic không?
[ ] Component có chứa API call trực tiếp không?
[ ] API contract đã được type chưa?
[ ] DTO có validation chưa?
[ ] Permission đã được kiểm tra chưa?
[ ] Database access có qua repository không?
[ ] Có activity/audit cần ghi không?
[ ] Có realtime event cần emit không?
[ ] Có notification cần tạo không?
[ ] Có xử lý error chuẩn không?
[ ] Có unit test không?
[ ] Có E2E test cho flow quan trọng không?
[ ] Có import vòng không?
[ ] Có code bị copy-paste không?
```

---

# 49. Kiến trúc mục tiêu

Planify nên hướng tới kiến trúc:

```text
                 PRESENTATION
                      │
          ┌───────────┴───────────┐
          │                       │
       Frontend                 API
       Next.js                 NestJS
          │                       │
          ▼                       ▼
      Components             Controllers
          │                       │
      Hooks/API               Use Cases
          │                       │
      Domain Types           Domain Services
          │                       │
          └───────────┬───────────┘
                      │
                 CONTRACTS
                      │
                Infrastructure
            ┌─────────┼──────────┐
            │         │          │
         Supabase    Redis      LLM
         PostgreSQL  Cache       AI
```

Mục tiêu không phải tạo thật nhiều thư mục, mà là đảm bảo **mỗi layer có một trách nhiệm rõ ràng và dependency đi theo một hướng**.

---

# 50. Kết luận

Cấu trúc này phù hợp với Planify khi hệ thống phát triển từ một ứng dụng Kanban thành nền tảng quản lý công việc có:

```text
Workspace
Board
List
Card
Checklist
Label
Comment
Attachment
Custom Field
Dependency
Search / Filter
Calendar / Table / Timeline
Notification
Realtime
Activity / Audit
Automation
Dashboard
AI
```

Mỗi domain được cô lập thành feature/module riêng. Frontend tập trung UI + client state + API integration; Backend tập trung business rules + authorization + persistence + events; API Contracts giữ cho hai phía giao tiếp bằng interface/type rõ ràng.

Khi số lượng feature tăng lên, developer vẫn có thể tìm code theo nguyên tắc:

```text
"What am I changing?"
        ↓
"Which domain owns it?"
        ↓
"Frontend feature + Backend module"
        ↓
"API contract"
        ↓
"Tests"
```

Đây là baseline structure nên được thống nhất trước khi bắt đầu triển khai source code chính của Planify.
