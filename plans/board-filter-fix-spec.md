# TECHNICAL SPECIFICATION & WORKSTREAM PLAN: BOARD MULTI-CRITERIA FILTER FIX

- **Feature ID:** `FEAT-BOARD-FILTER-FIX`
- **Component Scope:** `frontend/app/boards/[boardId]/page.tsx` & `frontend/components/board/BoardFilterModal.tsx`
- **Author:** Technical Architect
- **Status:** Approved for Implementation

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 The Reported Defect
In the Board page, when the user opens the "Lọc thẻ" (`BoardFilterModal`) popover and selects a member (e.g., "Nguyễn Công Thắng"):
- The member item badge in the modal correctly displays count = `1`.
- However, the modal header displays: `Khớp 0 / 8 thẻ` ("0 thẻ hiển thị").
- All cards in the Kanban board (and Table/Calendar/Schedule views) disappear, showing 0 matching cards.

### 1.2 Root Cause Mechanism
1. **Assignee Data Structure from Backend:**
   In `backend/src/modules/boards/boards.service.ts` (lines 268–274), card assignees are fetched via Supabase:
   ```typescript
   card_assignees (
     id,
     card_id,
     user_id,
     assigned_at,
     user:users (id, name, email, avatar)
   )
   ```
   Each assignee object `ca` contains:
   - `ca.user_id`: string (UUID of the user)
   - `ca.user`: object `{ id, name, email, avatar }`
   - **`ca.board_member` is `undefined`!**

2. **The Flawed Code in `frontend/app/boards/[boardId]/page.tsx`:**
   In lines 582–618:
   ```typescript
   // Line 582-586 (Keyword member search)
   const memberMatch = (card.card_assignees || []).some((ca: any) => {
     const name = (ca.board_member?.user?.name || '').toLowerCase();
     const email = (ca.board_member?.user?.email || '').toLowerCase();
     return name.includes(q) || email.includes(q);
   });

   // Line 595-597 (isAssignedToMe)
   const isAssignedToMe = (card.card_assignees || []).some((ca: any) =>
     ca.board_member?.user?.id === user?.id || ca.board_member?.user_id === user?.id
   );

   // Line 603-605 & 612-614 (Specific member filtering)
   return (card.card_assignees || []).some(
     (ca: any) => ca.board_member?.user?.id === m || ca.board_member?.user_id === m
   );
   ```
   Because `ca.board_member` is `undefined`:
   - `ca.board_member?.user?.id` $\to$ `undefined`
   - `ca.board_member?.user_id` $\to$ `undefined`
   - Every member comparison returns `false`!

3. **Why did `BoardFilterModal.tsx` show count `1`?**
   In `BoardFilterModal.tsx` line 160:
   ```typescript
   const uId = ca.board_member?.user?.id || ca.board_member?.user_id || ca.user_id;
   ```
   The modal had `|| ca.user_id`, so it successfully mapped the card to the user's ID for the count badge, while `page.tsx` failed to filter.

---

## 2. Technical Solution Design

### 2.1 Unified Helper for Card Assignee User ID Extraction
Both `page.tsx` and `BoardFilterModal.tsx` must use a standardized helper:
```typescript
export const getAssigneeUserId = (ca: any): string | undefined => {
  return ca?.user_id || ca?.user?.id || ca?.board_member?.user_id || ca?.board_member?.user?.id;
};
```

### 2.2 Updating `frontend/app/boards/[boardId]/page.tsx`
1. **Keyword Search (Line 582–586):**
   ```typescript
   const memberMatch = (card.card_assignees || []).some((ca: any) => {
     const name = (ca.user?.name || ca.board_member?.user?.name || '').toLowerCase();
     const email = (ca.user?.email || ca.board_member?.user?.email || '').toLowerCase();
     return name.includes(q) || email.includes(q);
   });
   ```

2. **Member Filtering (Line 593–618):**
   ```typescript
   if (boardFilters.members.length > 0) {
     const hasNoMembers = !card.card_assignees || card.card_assignees.length === 0;
     const isAssignedToMe = (card.card_assignees || []).some((ca: any) =>
       getAssigneeUserId(ca) === user?.id
     );

     const checkMember = (m: string) => {
       if (m === 'no_members') return hasNoMembers;
       if (m === 'assigned_to_me') return isAssignedToMe;
       return (card.card_assignees || []).some((ca: any) => getAssigneeUserId(ca) === m);
     };

     if (boardFilters.matchMode === 'all') {
       const allMembersMatch = boardFilters.members.every(checkMember);
       if (!allMembersMatch) return false;
     } else {
       const anyMemberMatch = boardFilters.members.some(checkMember);
       if (!anyMemberMatch) return false;
     }
   }
   ```

3. **Label Filtering (Line 620–641):**
   Ensure fallback to `cl.label_id || cl.label?.id || cl.id`:
   ```typescript
   if (boardFilters.labels && boardFilters.labels.length > 0) {
     const hasNoLabels = !card.card_labels || card.card_labels.length === 0;
     const checkLabel = (lId: string) => {
       if (lId === 'no_labels') return hasNoLabels;
       return (card.card_labels || []).some(
         (cl: any) => (cl.label_id || cl.label?.id || cl.id) === lId
       );
     };

     if (boardFilters.matchMode === 'all') {
       if (!boardFilters.labels.every(checkLabel)) return false;
     } else {
       if (!boardFilters.labels.some(checkLabel)) return false;
     }
   }
   ```

### 2.3 Updating `frontend/components/board/BoardFilterModal.tsx`
1. **Assignee Counts Computation (Line 148–164):**
   ```typescript
   if (
     currentUser?.id &&
     assignees.some((ca: any) => getAssigneeUserId(ca) === currentUser.id)
   ) {
     c.assigned_to_me++;
   }
   assignees.forEach((ca: any) => {
     const uId = getAssigneeUserId(ca);
     if (uId) {
       c.members[uId] = (c.members[uId] || 0) + 1;
     }
   });
   ```

2. **Specific Board Members Rendering (Line 413–451):**
   Ensure safe access:
   ```typescript
   {boardMembers.length > 0 &&
     boardMembers
       .filter((m) => {
         const uid = m.user?.id || m.user_id;
         return uid && uid !== currentUser?.id;
       })
       .map((m) => {
         const u = m.user || {};
         const uid = m.user?.id || m.user_id;
         const initial = (u.name || u.email || '?').charAt(0).toUpperCase();
         ...
       })}
   ```

---

## 3. Workstream Breakdown

### Workstream 1: Implementation (`engineer`)
- **Files:**
  - `frontend/app/boards/[boardId]/page.tsx`
  - `frontend/components/board/BoardFilterModal.tsx`
- **Actions:**
  - Refactor `filteredLists` in `page.tsx`.
  - Refactor `counts` calculation and member list rendering in `BoardFilterModal.tsx`.
  - Run `npm run build` / `npx tsc --noEmit` in frontend to guarantee zero type errors.

### Workstream 2: Verification (`qa-auditor`)
- **Scenarios to verify:**
  1. Member filter matching: Select specific member $\to$ cards match count badge and board displays matching cards.
  2. "Các thẻ đã chỉ định cho tôi" $\to$ displays current user's cards.
  3. "Không có thành viên" $\to$ displays unassigned cards.
  4. Label filtering (`no_labels` + specific labels).
  5. Status filtering (`completed` + `not_completed`).
  6. Due date filtering (`no_date`, `overdue`, `due_tomorrow`, `due_next_week`, `due_next_month`).
  7. Activity filtering (`past_week`, `past_2_weeks`, etc.).
  8. Match Mode switching between `any` (OR) and `all` (AND).
  9. Search keyword filter (by title, description, label name, and member name/email).
  10. Reset filters button.

---

