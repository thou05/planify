-- =========================================================
-- PLANIFY DATABASE - SUPABASE / POSTGRESQL
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NULL,

    avatar TEXT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_users_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
);

COMMENT ON TABLE public.users IS
'Thông tin người dùng của hệ thống Planify.';

COMMENT ON COLUMN public.users.id IS
'Khóa chính định danh duy nhất người dùng.';

COMMENT ON COLUMN public.users.name IS
'Họ và tên của người dùng.';

COMMENT ON COLUMN public.users.email IS
'Địa chỉ email dùng để định danh tài khoản. Giá trị phải duy nhất.';

COMMENT ON COLUMN public.users.password_hash IS
'Mật khẩu đã được băm. Khi sử dụng Supabase Auth, trường này không nên được sử dụng để tự quản lý mật khẩu.';

COMMENT ON COLUMN public.users.avatar IS
'URL hoặc đường dẫn tới ảnh đại diện của người dùng. Có thể để NULL nếu người dùng chưa có ảnh.';

COMMENT ON COLUMN public.users.status IS
'Trạng thái tài khoản: ACTIVE, INACTIVE hoặc LOCKED.';

COMMENT ON COLUMN public.users.created_at IS
'Thời điểm tài khoản được tạo.';


-- =========================================================
-- 2. WORKSPACES
-- =========================================================

CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,

    description TEXT NULL,

    owner_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_workspace_owner
        FOREIGN KEY (owner_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.workspaces IS
'Không gian làm việc, nơi chứa các Board và thành viên.';

COMMENT ON COLUMN public.workspaces.id IS
'Khóa chính của Workspace.';

COMMENT ON COLUMN public.workspaces.name IS
'Tên Workspace.';

COMMENT ON COLUMN public.workspaces.description IS
'Mô tả Workspace, có thể để trống.';

COMMENT ON COLUMN public.workspaces.owner_id IS
'Người sở hữu Workspace, tham chiếu đến users.id.';

COMMENT ON COLUMN public.workspaces.created_at IS
'Thời điểm Workspace được tạo.';


-- =========================================================
-- 3. WORKSPACE MEMBERS
-- =========================================================

CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,

    user_id UUID NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_workspace_member_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_workspace_member_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_workspace_member
        UNIQUE (workspace_id, user_id),

    CONSTRAINT chk_workspace_member_role
        CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);

COMMENT ON TABLE public.workspace_members IS
'Bảng trung gian biểu diễn thành viên của Workspace và vai trò của họ.';

COMMENT ON COLUMN public.workspace_members.id IS
'Khóa chính của bản ghi thành viên.';

COMMENT ON COLUMN public.workspace_members.workspace_id IS
'Workspace mà người dùng tham gia.';

COMMENT ON COLUMN public.workspace_members.user_id IS
'Người dùng tham gia Workspace.';

COMMENT ON COLUMN public.workspace_members.role IS
'Vai trò của người dùng trong Workspace.';

COMMENT ON COLUMN public.workspace_members.joined_at IS
'Thời điểm người dùng tham gia Workspace.';


-- =========================================================
-- 4. WORKSPACE INVITES
-- =========================================================

CREATE TABLE public.workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,

    email VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',

    token VARCHAR(500) NOT NULL UNIQUE,

    expired_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_workspace_invite_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_workspace_invite_role
        CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);

COMMENT ON TABLE public.workspace_invites IS
'Lưu các lời mời người dùng tham gia Workspace.';

COMMENT ON COLUMN public.workspace_invites.id IS
'Khóa chính của lời mời.';

COMMENT ON COLUMN public.workspace_invites.workspace_id IS
'Workspace gửi lời mời.';

COMMENT ON COLUMN public.workspace_invites.email IS
'Email của người được mời.';

COMMENT ON COLUMN public.workspace_invites.role IS
'Vai trò dự kiến của người được mời.';

COMMENT ON COLUMN public.workspace_invites.token IS
'Mã token duy nhất dùng để xác nhận lời mời.';

COMMENT ON COLUMN public.workspace_invites.expired_at IS
'Thời điểm lời mời hết hạn.';


-- =========================================================
-- 5. NOTIFICATIONS
-- =========================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    type VARCHAR(50) NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.notifications IS
'Lưu thông báo gửi tới người dùng.';

COMMENT ON COLUMN public.notifications.user_id IS
'Người nhận thông báo.';

COMMENT ON COLUMN public.notifications.title IS
'Tiêu đề thông báo.';

COMMENT ON COLUMN public.notifications.message IS
'Nội dung thông báo.';

COMMENT ON COLUMN public.notifications.type IS
'Loại thông báo.';

COMMENT ON COLUMN public.notifications.is_read IS
'Cho biết người dùng đã đọc thông báo hay chưa.';

COMMENT ON COLUMN public.notifications.created_at IS
'Thời điểm tạo thông báo.';


-- =========================================================
-- 6. ACTIVITY LOGS
-- =========================================================

CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,

    user_id UUID NOT NULL,

    action VARCHAR(100) NOT NULL,

    target_type VARCHAR(50) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_activity_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_activity_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.activity_logs IS
'Lưu lịch sử hoạt động của người dùng trong Workspace.';

COMMENT ON COLUMN public.activity_logs.workspace_id IS
'Workspace nơi hoạt động xảy ra.';

COMMENT ON COLUMN public.activity_logs.user_id IS
'Người thực hiện hoạt động.';

COMMENT ON COLUMN public.activity_logs.action IS
'Hành động được thực hiện.';

COMMENT ON COLUMN public.activity_logs.target_type IS
'Loại đối tượng mà hành động tác động tới.';

COMMENT ON COLUMN public.activity_logs.created_at IS
'Thời điểm hoạt động xảy ra.';


-- =========================================================
-- 7. BOARDS
-- =========================================================

CREATE TABLE public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,

    name VARCHAR(150) NOT NULL,

    description TEXT NULL,

    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_board_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.boards IS
'Board quản lý công việc theo mô hình Kanban trong Workspace.';

COMMENT ON COLUMN public.boards.workspace_id IS
'Workspace chứa Board.';

COMMENT ON COLUMN public.boards.name IS
'Tên Board.';

COMMENT ON COLUMN public.boards.description IS
'Mô tả Board, có thể để trống.';

COMMENT ON COLUMN public.boards.is_favorite IS
'Cho biết Board có được người dùng đánh dấu yêu thích hay không.';


-- =========================================================
-- 8. BOARD MEMBERS
-- =========================================================

CREATE TABLE public.board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    board_id UUID NOT NULL,

    user_id UUID NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_board_member_board
        FOREIGN KEY (board_id)
        REFERENCES public.boards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_board_member_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_board_member
        UNIQUE (board_id, user_id),

    CONSTRAINT chk_board_member_role
        CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER'))
);

COMMENT ON TABLE public.board_members IS
'Bảng trung gian quản lý thành viên và quyền của họ trên Board.';


-- =========================================================
-- 9. LISTS
-- =========================================================

CREATE TABLE public.lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    board_id UUID NOT NULL,

    title VARCHAR(150) NOT NULL,

    position INTEGER NOT NULL,

    "limit" INTEGER NULL,

    CONSTRAINT fk_list_board
        FOREIGN KEY (board_id)
        REFERENCES public.boards(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_list_position
        CHECK (position >= 0),

    CONSTRAINT chk_list_limit
        CHECK ("limit" IS NULL OR "limit" > 0)
);

COMMENT ON TABLE public.lists IS
'Cột trong Board Kanban, chứa các Card công việc.';

COMMENT ON COLUMN public.lists.title IS
'Tên cột Kanban, ví dụ To Do, In Progress, Done.';

COMMENT ON COLUMN public.lists.position IS
'Vị trí hiển thị của List trong Board.';

COMMENT ON COLUMN public.lists."limit" IS
'Giới hạn số lượng Card trong List. NULL nghĩa là không giới hạn.';


-- =========================================================
-- 10. CARDS
-- =========================================================

CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    list_id UUID NOT NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT NULL,

    position INTEGER NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'TODO',

    start_date TIMESTAMPTZ NULL,

    due_date TIMESTAMPTZ NULL,

    reminder_at TIMESTAMPTZ NULL,

    is_due_date_completed BOOLEAN NOT NULL DEFAULT FALSE,

    created_by UUID NOT NULL,

    CONSTRAINT fk_card_list
        FOREIGN KEY (list_id)
        REFERENCES public.lists(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_card_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_card_position
        CHECK (position >= 0),

    CONSTRAINT chk_card_dates
        CHECK (
            due_date IS NULL
            OR start_date IS NULL
            OR due_date >= start_date
        )
);

COMMENT ON TABLE public.cards IS
'Công việc chính được quản lý trên Board Kanban.';

COMMENT ON COLUMN public.cards.list_id IS
'List hiện tại chứa Card.';

COMMENT ON COLUMN public.cards.title IS
'Tên công việc.';

COMMENT ON COLUMN public.cards.description IS
'Mô tả chi tiết công việc. Có thể để NULL nếu không có mô tả.';

COMMENT ON COLUMN public.cards.position IS
'Vị trí của Card trong List.';

COMMENT ON COLUMN public.cards.status IS
'Trạng thái của công việc.';

COMMENT ON COLUMN public.cards.start_date IS
'Thời điểm bắt đầu công việc. Có thể NULL.';

COMMENT ON COLUMN public.cards.due_date IS
'Hạn hoàn thành công việc. Có thể NULL.';

COMMENT ON COLUMN public.cards.reminder_at IS
'Thời điểm hệ thống nhắc nhở công việc. Có thể NULL.';

COMMENT ON COLUMN public.cards.is_due_date_completed IS
'Cho biết công việc đã hoàn thành theo hạn hay chưa.';

COMMENT ON COLUMN public.cards.created_by IS
'Người tạo Card.';


-- =========================================================
-- 11. CARD ASSIGNEES
-- =========================================================

CREATE TABLE public.card_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    board_member_id UUID NOT NULL,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_card_assignee_card
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_card_assignee_member
        FOREIGN KEY (board_member_id)
        REFERENCES public.board_members(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_card_assignee
        UNIQUE (card_id, board_member_id)
);

COMMENT ON TABLE public.card_assignees IS
'Gán một hoặc nhiều thành viên của Board vào một Card.';

COMMENT ON COLUMN public.card_assignees.card_id IS
'Card được giao.';

COMMENT ON COLUMN public.card_assignees.board_member_id IS
'Thành viên Board được giao Card.';

COMMENT ON COLUMN public.card_assignees.assigned_at IS
'Thời điểm giao công việc.';


-- =========================================================
-- 12. LABELS
-- =========================================================

CREATE TABLE public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    board_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,

    color VARCHAR(30) NOT NULL,

    CONSTRAINT fk_label_board
        FOREIGN KEY (board_id)
        REFERENCES public.boards(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_label_board_name
        UNIQUE (board_id, name)
);

COMMENT ON TABLE public.labels IS
'Nhãn dùng để phân loại Card trong Board.';

COMMENT ON COLUMN public.labels.board_id IS
'Board sở hữu Label.';

COMMENT ON COLUMN public.labels.name IS
'Tên Label.';

COMMENT ON COLUMN public.labels.color IS
'Màu hiển thị của Label.';


-- =========================================================
-- 13. CARD LABELS
-- =========================================================

CREATE TABLE public.card_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    label_id UUID NOT NULL,

    CONSTRAINT fk_card_label_card
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_card_label_label
        FOREIGN KEY (label_id)
        REFERENCES public.labels(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_card_label
        UNIQUE (card_id, label_id)
);

COMMENT ON TABLE public.card_labels IS
'Bảng trung gian thể hiện quan hệ nhiều-nhiều giữa Card và Label.';


-- =========================================================
-- 14. CHECKLISTS
-- =========================================================

CREATE TABLE public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    title VARCHAR(255) NOT NULL,

    position INTEGER NOT NULL,

    CONSTRAINT fk_checklist_card
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_checklist_position
        CHECK (position >= 0)
);

COMMENT ON TABLE public.checklists IS
'Danh sách Checklist thuộc một Card.';

COMMENT ON COLUMN public.checklists.card_id IS
'Card sở hữu Checklist.';

COMMENT ON COLUMN public.checklists.title IS
'Tên Checklist.';

COMMENT ON COLUMN public.checklists.position IS
'Vị trí Checklist trong Card.';


-- =========================================================
-- 15. CHECKLIST ITEMS
-- =========================================================

CREATE TABLE public.checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    checklist_id UUID NOT NULL,

    content VARCHAR(500) NOT NULL,

    is_completed BOOLEAN NOT NULL DEFAULT FALSE,

    position INTEGER NOT NULL,

    CONSTRAINT fk_checklist_item_checklist
        FOREIGN KEY (checklist_id)
        REFERENCES public.checklists(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_checklist_item_position
        CHECK (position >= 0)
);

COMMENT ON TABLE public.checklist_items IS
'Các công việc con trong một Checklist.';

COMMENT ON COLUMN public.checklist_items.checklist_id IS
'Checklist chứa Item.';

COMMENT ON COLUMN public.checklist_items.content IS
'Nội dung của Checklist Item.';

COMMENT ON COLUMN public.checklist_items.is_completed IS
'Trạng thái hoàn thành của Item.';

COMMENT ON COLUMN public.checklist_items.position IS
'Vị trí Item trong Checklist.';


-- =========================================================
-- 16. COMMENTS
-- =========================================================

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    user_id UUID NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comment_card
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.comments IS
'Bình luận của người dùng trên Card.';

COMMENT ON COLUMN public.comments.card_id IS
'Card nhận bình luận.';

COMMENT ON COLUMN public.comments.user_id IS
'Người tạo bình luận.';

COMMENT ON COLUMN public.comments.content IS
'Nội dung bình luận.';

COMMENT ON COLUMN public.comments.created_at IS
'Thời điểm tạo bình luận.';


-- =========================================================
-- 17. ATTACHMENTS
-- =========================================================

CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    file_name VARCHAR(255) NOT NULL,

    file_url TEXT NOT NULL,

    file_size BIGINT NULL,

    CONSTRAINT fk_attachment_card
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_attachment_file_size
        CHECK (file_size IS NULL OR file_size >= 0)
);

COMMENT ON TABLE public.attachments IS
'Tệp đính kèm của Card.';

COMMENT ON COLUMN public.attachments.card_id IS
'Card chứa tệp đính kèm.';

COMMENT ON COLUMN public.attachments.file_name IS
'Tên tệp.';

COMMENT ON COLUMN public.attachments.file_url IS
'Đường dẫn hoặc URL tới tệp được lưu trữ.';

COMMENT ON COLUMN public.attachments.file_size IS
'Kích thước tệp tính bằng byte. Có thể NULL nếu hệ thống không lưu thông tin này.';


-- =========================================================
-- 18. CARD RELATIONS
-- =========================================================

CREATE TABLE public.card_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    related_card_id UUID NOT NULL,

    type VARCHAR(30) NOT NULL,

    CONSTRAINT fk_card_relation_source
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_card_relation_target
        FOREIGN KEY (related_card_id)
        REFERENCES public.cards(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_card_relation_self
        CHECK (card_id <> related_card_id),

    CONSTRAINT uq_card_relation
        UNIQUE (card_id, related_card_id, type)
);

COMMENT ON TABLE public.card_relations IS
'Biểu diễn quan hệ giữa hai Card.';

COMMENT ON COLUMN public.card_relations.card_id IS
'Card nguồn của quan hệ.';

COMMENT ON COLUMN public.card_relations.related_card_id IS
'Card được liên kết.';

COMMENT ON COLUMN public.card_relations.type IS
'Loại quan hệ giữa hai Card, ví dụ BLOCKS, DUPLICATE hoặc PARENT.';


-- =========================================================
-- 19. CUSTOM FIELDS
-- =========================================================

CREATE TABLE public.custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    board_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,

    field_type VARCHAR(30) NOT NULL,

    CONSTRAINT fk_custom_field_board
        FOREIGN KEY (board_id)
        REFERENCES public.boards(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_custom_field_board_name
        UNIQUE (board_id, name)
);

COMMENT ON TABLE public.custom_fields IS
'Các trường dữ liệu tùy chỉnh được định nghĩa cho Board.';

COMMENT ON COLUMN public.custom_fields.board_id IS
'Board sở hữu Custom Field.';

COMMENT ON COLUMN public.custom_fields.name IS
'Tên trường tùy chỉnh.';

COMMENT ON COLUMN public.custom_fields.field_type IS
'Kiểu dữ liệu của Custom Field.';


-- =========================================================
-- 20. CUSTOM FIELD VALUES
-- =========================================================

CREATE TABLE public.custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    field_id UUID NOT NULL,

    value TEXT NOT NULL,

    CONSTRAINT fk_custom_field_value_card
        FOREIGN KEY (card_id)
        REFERENCES public.cards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_custom_field_value_field
        FOREIGN KEY (field_id)
        REFERENCES public.custom_fields(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_custom_field_value
        UNIQUE (card_id, field_id)
);

COMMENT ON TABLE public.custom_field_values IS
'Giá trị của Custom Field trên từng Card.';

COMMENT ON COLUMN public.custom_field_values.card_id IS
'Card chứa giá trị tùy chỉnh.';

COMMENT ON COLUMN public.custom_field_values.field_id IS
'Custom Field được áp dụng.';

COMMENT ON COLUMN public.custom_field_values.value IS
'Giá trị của Custom Field.';


-- =========================================================
-- 21. AUTOMATION RULES
-- =========================================================

CREATE TABLE public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    board_id UUID NOT NULL,

    name VARCHAR(150) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_automation_rule_board
        FOREIGN KEY (board_id)
        REFERENCES public.boards(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.automation_rules IS
'Các luật tự động hóa được cấu hình cho Board.';

COMMENT ON COLUMN public.automation_rules.board_id IS
'Board chứa Automation Rule.';

COMMENT ON COLUMN public.automation_rules.name IS
'Tên của luật tự động hóa.';

COMMENT ON COLUMN public.automation_rules.is_active IS
'Cho biết Automation Rule có đang được kích hoạt hay không.';


-- =========================================================
-- 22. AUTOMATION TRIGGERS
-- =========================================================

CREATE TABLE public.automation_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rule_id UUID NOT NULL UNIQUE,

    event VARCHAR(50) NOT NULL,

    CONSTRAINT fk_automation_trigger_rule
        FOREIGN KEY (rule_id)
        REFERENCES public.automation_rules(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.automation_triggers IS
'Sự kiện kích hoạt Automation Rule. Mỗi Rule có đúng một Trigger theo Class Diagram.';

COMMENT ON COLUMN public.automation_triggers.rule_id IS
'Automation Rule sở hữu Trigger. UNIQUE đảm bảo quan hệ 1-1.';

COMMENT ON COLUMN public.automation_triggers.event IS
'Sự kiện kích hoạt, ví dụ CARD_CREATED, CARD_MOVED hoặc CARD_COMPLETED.';


-- =========================================================
-- 23. AUTOMATION ACTIONS
-- =========================================================

CREATE TABLE public.automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rule_id UUID NOT NULL,

    type VARCHAR(50) NOT NULL,

    CONSTRAINT fk_automation_action_rule
        FOREIGN KEY (rule_id)
        REFERENCES public.automation_rules(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.automation_actions IS
'Các hành động được thực hiện khi Automation Rule được kích hoạt.';

COMMENT ON COLUMN public.automation_actions.rule_id IS
'Automation Rule chứa Action.';

COMMENT ON COLUMN public.automation_actions.type IS
'Loại hành động tự động hóa. Một Rule có thể có nhiều Action.';

