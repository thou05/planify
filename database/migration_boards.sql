-- ==============================================================================
-- PLANIFY - MIGRATION BOARDS EXPANSION
-- ==============================================================================
-- Bổ sung các cột mở rộng cho bảng public.boards:
-- 1. is_archived: Cho phép lưu trữ và khôi phục Board mà không mất dữ liệu
-- 2. visibility: Quyền hiển thị của Board (WORKSPACE, PRIVATE, PUBLIC)
-- 3. background: Màu sắc hoặc hình nền của Board
-- ==============================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) NOT NULL DEFAULT 'WORKSPACE';
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS background VARCHAR(100) NULL;

-- Cập nhật comment giải thích
COMMENT ON COLUMN public.boards.is_archived IS 'Trạng thái lưu trữ của Board. TRUE nghĩa là đã lưu trữ (Read-only).';
COMMENT ON COLUMN public.boards.visibility IS 'Quyền hiển thị của Board: WORKSPACE, PRIVATE hoặc PUBLIC.';
COMMENT ON COLUMN public.boards.background IS 'Màu sắc chủ đạo hoặc ảnh nền của Board.';

-- Đảm bảo quyền truy cập cho Supabase API
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
