# PLANIFY — Design System & UI Style Guide

## 1. Design Direction

Planify sử dụng phong cách:

> **Glassmorphism — Modern Productivity SaaS**

Mục tiêu là tạo cảm giác:
- Trong suốt.
- Nhẹ.
- Hiện đại.
- Công nghệ.
- Không gian nhiều lớp.
- Có chiều sâu nhưng không gây rối.

Không biến toàn bộ giao diện thành những khối blur nặng. Glassmorphism phải được dùng có chủ đích để giữ khả năng đọc và hiệu suất.

---

# 2. Brand Palette

## Primary

```text
Sky Glass
#a6d1fd
```

Vai trò:
- Primary accent.
- Background glow.
- Active state.
- Selected state.
- Link emphasis.

## Neutral

```text
White
#ffffff
```

Vai trò:
- Text.
- Glass surface.
- Borders ở độ trong suốt.
- Card foreground.

## Deep Purple

```text
#2b1572
```

Vai trò:
- Brand dark.
- Primary dark text trên nền sáng.
- Sidebar/deep surface.
- Strong visual anchor.

## Error / Critical

```text
#c40000
```

Vai trò:
- Error.
- Critical.
- Overdue.
- Destructive action.

## Magenta / AI

```text
#a000c8
```

Vai trò:
- AI features.
- Smart action.
- Experimental/AI status.
- Gradient accent.

## Success

```text
#358200
```

Vai trò:
- Success.
- Completed.
- Valid.
- Confirmation.

---

# 3. Extended Color Scale

Không chỉ dùng màu gốc. Có thể tạo dải trong cùng tone:

### Blue

```text
#eaf5ff
#d9edff
#c4e3ff
#a6d1fd
#7cb8ee
#4f91cf
#2d6fa8
```

### Purple

```text
#f1edff
#ddd5ff
#c4b8ff
#9d8be8
#634eb0
#2b1572
```

### Red

```text
#fff1f1
#ffdcdc
#ffb5b5
#e87878
#c40000
#970000
```

### Magenta

```text
#fff0ff
#fbd8ff
#efb0fa
#d66de4
#a000c8
#780096
```

### Green

```text
#f0faeb
#d8f0cb
#b7dda4
#83b95d
#358200
#276300
```

---

# 4. Glassmorphism Rules

## 4.1 Glass Surface

Glass surface không dùng màu đục hoàn toàn.

Mẫu:

```css
background: rgba(255, 255, 255, 0.55);
backdrop-filter: blur(18px);
-webkit-backdrop-filter: blur(18px);
border: 1px solid rgba(255, 255, 255, 0.35);
box-shadow:
  0 8px 32px rgba(43, 21, 114, 0.10);
```

## 4.2 Strong Glass

Dùng cho:
- Modal.
- Popover.
- Important card.
- Navigation panel.

```css
background: rgba(255, 255, 255, 0.68);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.42);
```

## 4.3 Weak Glass

Dùng cho:
- Secondary panel.
- Background layer.

```css
background: rgba(255, 255, 255, 0.32);
backdrop-filter: blur(14px);
border: 1px solid rgba(255, 255, 255, 0.24);
```

## 4.4 Dark Glass

```css
background: rgba(43, 21, 114, 0.48);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.14);
```

Không sử dụng dark glass làm nền cho quá nhiều thành phần cùng lúc.

---

# 5. Background

Glassmorphism cần nền có chiều sâu.

Nền đề xuất:

```css
background:
  radial-gradient(
    circle at 15% 15%,
    rgba(166, 209, 253, 0.55),
    transparent 34%
  ),
  radial-gradient(
    circle at 80% 10%,
    rgba(160, 0, 200, 0.20),
    transparent 30%
  ),
  radial-gradient(
    circle at 75% 80%,
    rgba(43, 21, 114, 0.18),
    transparent 35%
  ),
  #f5f9ff;
```

Có thể thêm blob/glow mềm:

```text
Sky Blue Glow
      ○

                 Purple Glow
                    ○

       Magenta Glow
           ○
```

Không dùng gradient quá bão hòa.

---

# 6. Transparency Rule

Mọi thành phần glass phải đảm bảo còn thấy được layer phía sau.

Không dùng:

```css
background: #ffffff;
```

cho các component vốn được xác định là Glass Surface.

Thay bằng:

```css
rgba(...)
```

Mức opacity khuyến nghị:

```text
0.25 → 0.70
```

> Không phải component nào cũng bắt buộc trong suốt. Button solid, input text field hoặc destructive control có thể dùng surface đặc để đảm bảo khả năng đọc.

---

# 7. Typography

## Font

Khuyến nghị:

```text
Inter
```

Nếu repository đã có font khác thì ưu tiên font thống nhất của dự án.

## Scale

```text
Display       32–40 px
H1            28–32 px
H2            22–26 px
H3            18–20 px
Body          14–16 px
Small         12–13 px
Caption       11–12 px
```

## Weight

```text
Regular       400
Medium        500
Semibold      600
Bold          700
```

Không dùng quá nhiều Bold trên một màn hình.

---

# 8. Text Colors

### Primary text

```text
rgba(43, 21, 114, 0.95)
```

### Secondary text

```text
rgba(43, 21, 114, 0.65)
```

### Muted text

```text
rgba(43, 21, 114, 0.45)
```

### Text trên dark glass

```text
rgba(255,255,255,0.96)
rgba(255,255,255,0.72)
```

---

# 9. Border

Glass border:

```css
border: 1px solid rgba(255,255,255,0.35);
```

Dark border:

```css
border: 1px solid rgba(43,21,114,0.10);
```

Không dùng border đen đặc.

---

# 10. Shadow

Shadow phải mềm.

### Small

```css
box-shadow:
  0 4px 16px rgba(43,21,114,0.08);
```

### Medium

```css
box-shadow:
  0 8px 32px rgba(43,21,114,0.10);
```

### Floating

```css
box-shadow:
  0 18px 50px rgba(43,21,114,0.15);
```

Không sử dụng shadow quá đậm.

---

# 11. Radius

Khuyến nghị:

```text
Card             16px
Modal            24px
Dropdown         16px
Input            12px
Button           12px
Small badge      999px
```

---

# 12. Spacing

Dùng spacing scale 4px:

```text
4
8
12
16
20
24
32
40
48
64
```

---

# 13. Buttons

## Primary

```text
Background:
#a6d1fd

Text:
#2b1572
```

Glass variant:

```css
background: rgba(166, 209, 253, 0.50);
backdrop-filter: blur(14px);
border: 1px solid rgba(255,255,255,0.40);
```

## Secondary

```text
rgba(255,255,255,0.50)
```

## AI Button

```text
#a000c8
```

nhưng nên dùng gradient nhẹ:

```css
background:
  linear-gradient(
    135deg,
    rgba(160,0,200,0.85),
    rgba(43,21,114,0.85)
  );
```

## Danger

```text
#c40000
```

Không dùng red cho lỗi nhẹ; red dành cho destructive/critical.

---

# 14. Badge / Status

## Success

```text
Background:
rgba(53,130,0,0.12)

Text:
#358200
```

## Error

```text
Background:
rgba(196,0,0,0.10)

Text:
#c40000
```

## AI

```text
Background:
rgba(160,0,200,0.10)

Text:
#a000c8
```

## Info

```text
Background:
rgba(166,209,253,0.20)

Text:
#2d6fa8
```

---

# 15. Kanban Board

## Board background

Không nên dùng background trắng phẳng toàn màn hình.

Đề xuất:

```text
Soft gradient background
+
subtle glow
+
glass list containers
```

## List

```css
background: rgba(255,255,255,0.34);
backdrop-filter: blur(14px);
border: 1px solid rgba(255,255,255,0.28);
border-radius: 18px;
```

## Card

```css
background: rgba(255,255,255,0.62);
backdrop-filter: blur(18px);
border: 1px solid rgba(255,255,255,0.42);
border-radius: 16px;
```

## Hover

Card:
- Tăng opacity nhẹ.
- Tăng shadow nhẹ.
- Không scale quá lớn.

---

# 16. Drag & Drop

### Dragging

Khi Card đang kéo:

```css
opacity: 0.72;
transform: rotate(1deg) scale(1.02);
box-shadow:
  0 16px 40px rgba(43,21,114,0.18);
```

### Drop target

Sử dụng:

```text
#a6d1fd
```

với opacity thấp.

Ví dụ:

```css
background: rgba(166,209,253,0.18);
border: 1px dashed rgba(43,21,114,0.25);
```

---

# 17. Card Detail Modal

Modal nên là Glass Strong:

```css
background: rgba(255,255,255,0.70);
backdrop-filter: blur(24px);
border: 1px solid rgba(255,255,255,0.45);
border-radius: 24px;
```

Các section:
- Overview.
- Description.
- Checklist.
- Members.
- Dates.
- Attachments.
- Comments.
- Activity.

Không biến tất cả section thành card độc lập; ưu tiên visual hierarchy.

---

# 18. AI UI

AI phải có nhận diện riêng nhưng không làm mất hierarchy chung.

### AI accent

```text
#a000c8
```

### AI glow

```css
box-shadow:
  0 8px 28px rgba(160,0,200,0.16);
```

### AI suggestion card

```css
background: rgba(160,0,200,0.07);
border: 1px solid rgba(160,0,200,0.16);
backdrop-filter: blur(16px);
```

AI action cần phân biệt:

```text
Suggestion
vs
Executed Action
```

---

# 19. Notification

Notification item:

```css
background: rgba(255,255,255,0.42);
```

Unread:

```css
background:
  rgba(166,209,253,0.16);
```

Critical:

```text
red accent line / icon
```

Không dùng toàn bộ item màu đỏ.

---

# 20. Inputs

Input không nên quá trong suốt nếu nền phức tạp.

```css
background: rgba(255,255,255,0.58);
border: 1px solid rgba(43,21,114,0.10);
backdrop-filter: blur(12px);
```

Focus:

```text
border-color:
#a6d1fd
```

AI input:

```text
border-color:
#a000c8
```

---

# 21. Tables

Table View cần ưu tiên readability hơn glass effect.

Header:

```text
rgba(255,255,255,0.48)
```

Rows:

```text
rgba(255,255,255,0.24)
```

Hover:

```text
rgba(166,209,253,0.12)
```

Không làm mỗi cell thành một glass card.

---

# 22. Calendar

Event colors:

```text
Blue     → normal work
Purple   → planning
Magenta  → AI-generated / AI-assisted
Green    → completed
Red      → overdue / critical
```

Calendar background nên nhẹ hơn Board.

---

# 23. Dashboard

Dashboard card:

```css
background: rgba(255,255,255,0.52);
backdrop-filter: blur(18px);
border-radius: 20px;
```

Chart:
- Không dùng quá nhiều màu.
- Ưu tiên palette cùng hệ:
  - #a6d1fd
  - #2b1572
  - #a000c8
  - #358200
  - #c40000

---

# 24. Icons

Khuyến nghị:
- Lucide Icons.
- Stroke style.
- 1.5–2px.

Không trộn icon style.

---

# 25. Animation

Animation phải ngắn và có mục đích.

```text
Hover           120–180ms
Dropdown        160–220ms
Modal           200–280ms
Drag            100–160ms
Page transition 180–260ms
```

Không dùng:
- Bounce.
- Excessive scale.
- Constant floating.

Glassmorphism cần cảm giác nhẹ và ổn định.

---

# 26. Accessibility

Glass effect không được hy sinh khả năng đọc.

Phải đảm bảo:
- Contrast tốt.
- Focus visible.
- Keyboard navigation.
- Không chỉ dùng màu để biểu diễn trạng thái.
- Có aria-label cho icon-only action.
- Drag & drop phải có keyboard alternative.

---

# 27. Responsive

## Desktop

Ưu tiên:
- Board.
- Kanban.
- Multi-column.

## Tablet

- Giảm số column hiển thị.
- Horizontal scroll.

## Mobile

Không cố ép Kanban 5–6 column trên màn hình nhỏ.

Có thể:
- Horizontal board scroll.
- Bottom sheet Card Detail.
- Stacked filters.
- Simplified header.

---

# 28. Dark Mode mở rộng

Dark Mode có thể dùng:

```text
Background:
#150d32

Glass:
rgba(43,21,114,0.42)

Border:
rgba(255,255,255,0.12)

Primary text:
rgba(255,255,255,0.95)
```

Không đảo màu một cách máy móc.

---

# 29. Component naming convention

```text
AppShell
TopBar
Sidebar
WorkspaceSwitcher
BoardHeader
BoardView
BoardList
TaskCard
CardDetail
CardMembers
CardLabels
CardChecklist
CardComments
CardAttachments
ActivityFeed
NotificationPanel
SearchCommand
FilterBar
CalendarView
TimelineView
DashboardWidget
AiAssistant
AiSuggestion
ConfirmDialog
```

---

# 30. Token gợi ý

```css
:root {
  --color-primary: #a6d1fd;
  --color-primary-strong: #4f91cf;

  --color-brand: #2b1572;
  --color-danger: #c40000;
  --color-ai: #a000c8;
  --color-success: #358200;
  --color-white: #ffffff;

  --glass-xs: rgba(255,255,255,0.32);
  --glass-sm: rgba(255,255,255,0.42);
  --glass-md: rgba(255,255,255,0.55);
  --glass-lg: rgba(255,255,255,0.68);

  --border-glass: rgba(255,255,255,0.35);
  --border-dark: rgba(43,21,114,0.10);

  --shadow-sm: 0 4px 16px rgba(43,21,114,0.08);
  --shadow-md: 0 8px 32px rgba(43,21,114,0.10);
  --shadow-lg: 0 18px 50px rgba(43,21,114,0.15);

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;

  --blur-sm: 12px;
  --blur-md: 18px;
  --blur-lg: 24px;
}
```

---

# 31. Design principle cuối cùng

Planify phải mang cảm giác:

```text
Clear
+
Light
+
Transparent
+
Modern
+
Productive
```

Không nên biến:

```text
Glassmorphism
=
Blur mọi thứ
```

Mà phải là:

```text
Glass
+
Hierarchy
+
Contrast
+
Whitespace
+
Controlled Color
```

Ưu tiên khả năng sử dụng trước hiệu ứng thị giác.
