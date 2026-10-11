-- ==============================================================================
-- PLANIFY - MIGRATION CUSTOM FIELDS OPTIONS
-- ==============================================================================
-- Bổ sung cột options cho bảng public.custom_fields để hỗ trợ danh sách lựa chọn Dropdown
-- ==============================================================================

ALTER TABLE public.custom_fields ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- Cập nhật comment giải thích
COMMENT ON COLUMN public.custom_fields.options IS 'Danh sách các tùy chọn cho kiểu trường DROPDOWN (dạng JSON Array các chuỗi string)';

-- Đảm bảo quyền truy cập cho Supabase API
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
