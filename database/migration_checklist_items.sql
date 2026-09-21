-- ==============================================================================
-- PLANIFY - MIGRATION CHECKLIST ITEMS EXPANSION (DUE DATE & MEMBER ASSIGNMENT)
-- ==============================================================================
-- Bổ sung các cột mở rộng cho bảng public.checklist_items:
-- 1. due_date: Thời hạn hoàn thành cho mục công việc con (Checklist Item)
-- 2. member_id: Thành viên (Board Member) được gán phụ trách mục này
-- ==============================================================================

ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.board_members(id) ON DELETE SET NULL;

-- Tạo index tăng tốc truy vấn theo thành viên
CREATE INDEX IF NOT EXISTS idx_checklist_items_member ON public.checklist_items(member_id);

-- Cập nhật comment giải thích
COMMENT ON COLUMN public.checklist_items.due_date IS 'Thời hạn hoàn thành của Checklist Item.';
COMMENT ON COLUMN public.checklist_items.member_id IS 'ID của Board Member được phân công xử lý Item.';

-- Đảm bảo quyền truy cập cho Supabase API
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
