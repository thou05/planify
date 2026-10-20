-- ==============================================================================
-- PLANIFY - MIGRATION USER PROFILE CUSTOMIZATIONS & COVER IMAGE
-- ==============================================================================
-- Bổ sung các trường cá nhân hóa cho bảng public.users:
-- 1. cover_image: Ảnh bìa hồ sơ cá nhân (URL hoặc Base64)
-- 2. job_title: Chức danh / Vị trí công việc (ví dụ: Senior Frontend Engineer)
-- 3. department: Phòng ban / Đội ngũ (ví dụ: Product Engineering)
-- 4. location: Địa điểm làm việc (ví dụ: Hà Nội, Việt Nam / Remote)
-- 5. website: Link website / portfolio cá nhân
-- 6. social_links: Liên kết mạng xã hội (GitHub, LinkedIn, Twitter, v.v. dạng JSONB)
-- 7. work_status: Trạng thái làm việc (WORKING, BUSY, AWAY)
-- ==============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_image TEXT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location VARCHAR(100) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS work_status VARCHAR(50) DEFAULT 'WORKING';

COMMENT ON COLUMN public.users.cover_image IS 'URL hoặc Base64 ảnh bìa cá nhân của người dùng.';
COMMENT ON COLUMN public.users.job_title IS 'Chức danh hoặc vị trí công việc của người dùng.';
COMMENT ON COLUMN public.users.department IS 'Phòng ban hoặc nhóm chuyên môn của người dùng.';
COMMENT ON COLUMN public.users.location IS 'Địa điểm làm việc hoặc sinh sống của người dùng.';
COMMENT ON COLUMN public.users.website IS 'Trang web hoặc portfolio cá nhân của người dùng.';
COMMENT ON COLUMN public.users.social_links IS 'Liên kết mạng xã hội (GitHub, LinkedIn, v.v.) dạng JSONB.';
COMMENT ON COLUMN public.users.work_status IS 'Trạng thái làm việc hiện tại: WORKING, BUSY, AWAY.';

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
