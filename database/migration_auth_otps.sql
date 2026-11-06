-- ==============================================================================
-- PLANIFY - MIGRATION AUTH OTPS & GOOGLE OAUTH
-- ==============================================================================
-- 1. Bổ sung cột google_id vào bảng public.users
-- 2. Tạo bảng public.auth_otps để quản lý mã xác thực OTP đăng ký & quên mật khẩu
-- ==============================================================================

-- 1. Bổ sung google_id vào bảng users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- 2. Tạo bảng auth_otps
CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'REGISTER' | 'FORGOT_PASSWORD'
    attempts INTEGER NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup ON public.auth_otps (email, type, is_used);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires ON public.auth_otps (expires_at);

COMMENT ON TABLE public.auth_otps IS 'Bảng lưu trữ mã OTP xác thực email khi đăng ký và quên mật khẩu';
COMMENT ON COLUMN public.auth_otps.type IS 'Loại OTP: REGISTER (đăng ký) hoặc FORGOT_PASSWORD (quên mật khẩu)';
COMMENT ON COLUMN public.auth_otps.is_used IS 'Đánh dấu mã OTP đã được sử dụng hay chưa';

-- Đảm bảo quyền truy cập Supabase & Bảo mật Row Level Security
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_otps FROM anon, authenticated;
GRANT ALL ON TABLE public.auth_otps TO service_role;

