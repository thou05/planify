-- ==============================================================================
-- PLANIFY - MIGRATION BOARD BACKGROUND & ICON EXPANSION
-- ==============================================================================
-- Bổ sung và tối ưu hóa các cột cho bảng public.boards:
-- 1. icon: Biểu tượng Emoji hoặc icon URL đại diện cho Board và làm Favicon tab trình duyệt
-- 2. background: Mở rộng kiểu dữ liệu sang TEXT để lưu trữ an toàn dải màu gradient dài hoặc URL ảnh
-- ==============================================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS icon TEXT NULL;
ALTER TABLE public.boards ALTER COLUMN icon TYPE TEXT;
ALTER TABLE public.boards ALTER COLUMN background TYPE TEXT;

COMMENT ON COLUMN public.boards.icon IS 'Biểu tượng đại diện (Emoji hoặc URL/Base64) của Board, dùng để hiển thị và làm Favicon trình duyệt.';
COMMENT ON COLUMN public.boards.background IS 'Màu sắc, dải màu gradient (CSS) hoặc link ảnh nền chất lượng cao của Board.';

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
