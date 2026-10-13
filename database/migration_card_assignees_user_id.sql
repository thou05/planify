-- ==============================================================================
-- PLANIFY - MIGRATION DIRECT USER ASSIGNMENT (CARDS & CHECKLIST ITEMS)
-- ==============================================================================
-- Bỏ hoàn toàn liên kết qua bảng trung gian board_members cho cả:
-- 1. card_assignees (Phân công Thẻ Kanban) -> trực tiếp liên kết users(id)
-- 2. checklist_items (Phân công Mục công việc con) -> trực tiếp liên kết users(id)
-- 
-- Thành viên Workspace có thể được gán thẻ/checklist mà không cần thêm vào board_members.
-- Bảng Riêng tư (PRIVATE) và phân quyền (VIEWER) sẽ được kiểm soát ở tầng Backend Logic.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PHẦN 1: MIGRATION CHO CARD_ASSIGNEES
-- ------------------------------------------------------------------------------

-- 1.1. Bổ sung cột user_id vào card_assignees nếu chưa có
ALTER TABLE public.card_assignees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 1.2. Giữ nguyên toàn bộ dữ liệu: copy user_id từ board_members sang card_assignees
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'card_assignees' 
          AND column_name = 'board_member_id'
    ) THEN
        UPDATE public.card_assignees ca
        SET user_id = bm.user_id
        FROM public.board_members bm
        WHERE ca.board_member_id = bm.id
          AND ca.user_id IS NULL;
    END IF;
END $$;

-- 1.3. Xóa các bản ghi mồ côi (nếu có bản ghi không map được user_id) trước khi NOT NULL
DELETE FROM public.card_assignees WHERE user_id IS NULL;

-- 1.4. Đặt user_id thành NOT NULL
ALTER TABLE public.card_assignees ALTER COLUMN user_id SET NOT NULL;

-- 1.5. Xóa cột board_member_id (CASCADE tự động gỡ các ràng buộc FK cũ liên quan)
ALTER TABLE public.card_assignees DROP COLUMN IF EXISTS board_member_id CASCADE;

-- 1.6. Tạo index tăng tốc truy vấn theo user_id
CREATE INDEX IF NOT EXISTS idx_card_assignees_user_id ON public.card_assignees(user_id);

-- 1.7. Thêm ràng buộc UNIQUE tránh gán trùng lặp 1 user trên 1 card
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_card_assignee_card_user'
    ) THEN
        ALTER TABLE public.card_assignees 
        ADD CONSTRAINT uq_card_assignee_card_user UNIQUE (card_id, user_id);
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- PHẦN 2: MIGRATION CHO CHECKLIST_ITEMS
-- ------------------------------------------------------------------------------

-- 2.1. Bổ sung cột user_id vào checklist_items nếu chưa có
ALTER TABLE public.checklist_items 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2.2. Giữ nguyên toàn bộ dữ liệu: copy user_id từ board_members sang checklist_items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'checklist_items' 
          AND column_name = 'member_id'
    ) THEN
        -- Trường hợp 1: member_id đang trỏ tới board_members(id)
        UPDATE public.checklist_items ci
        SET user_id = bm.user_id
        FROM public.board_members bm
        WHERE ci.member_id = bm.id
          AND ci.user_id IS NULL;

        -- Trường hợp 2: member_id đã lưu trực tiếp user_id
        UPDATE public.checklist_items ci
        SET user_id = u.id
        FROM public.users u
        WHERE ci.member_id = u.id
          AND ci.user_id IS NULL;
    END IF;
END $$;

-- 2.3. Xóa cột member_id khỏi checklist_items (CASCADE tự động gỡ FK tới board_members)
ALTER TABLE public.checklist_items DROP COLUMN IF EXISTS member_id CASCADE;

-- 2.4. Tạo index tăng tốc truy vấn checklist_items theo user_id
CREATE INDEX IF NOT EXISTS idx_checklist_items_user_id ON public.checklist_items(user_id);


-- ------------------------------------------------------------------------------
-- PHẦN 3: PHÂN QUYỀN VÀ BÌNH LUẬN BẢNG DỮ LIỆU
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.card_assignees IS 'Danh sách người dùng (users) được phân công vào Thẻ.';
COMMENT ON COLUMN public.card_assignees.user_id IS 'ID người dùng được phân công trực tiếp.';
COMMENT ON COLUMN public.checklist_items.user_id IS 'ID người dùng được phân công mục công việc con này.';

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
