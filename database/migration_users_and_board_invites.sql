-- ==============================================================================
-- PLANIFY - MIGRATION USERS PROFILE & BOARD INVITATIONS EXPANSION
-- ==============================================================================
-- 1. Bổ sung các cột mở rộng cho bảng public.users (FR02: Quản lý hồ sơ cá nhân):
--    - bio: Giới thiệu bản thân
--    - timezone: Múi giờ người dùng
--    - language: Ngôn ngữ giao diện (vi, en)
--    - phone: Số điện thoại liên hệ
--    - theme: Tùy chọn giao diện (system, light, dark)
-- 2. Tạo bảng public.board_invites (FR04, FR07: Lời mời tham gia Board):
--    - Hỗ trợ lưu trữ lời mời, token bảo mật, vai trò, thời hạn và trạng thái
-- ==============================================================================

-- 1. Mở rộng bảng public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'vi';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) NOT NULL DEFAULT 'system';

COMMENT ON COLUMN public.users.bio IS 'Giới thiệu ngắn về người dùng.';
COMMENT ON COLUMN public.users.timezone IS 'Múi giờ cài đặt của người dùng.';
COMMENT ON COLUMN public.users.language IS 'Ngôn ngữ giao diện người dùng lựa chọn.';
COMMENT ON COLUMN public.users.phone IS 'Số điện thoại liên hệ của người dùng.';
COMMENT ON COLUMN public.users.theme IS 'Chủ đề giao diện (system, light, dark).';

-- 2. Tạo bảng public.board_invites
CREATE TABLE IF NOT EXISTS public.board_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    board_id UUID NOT NULL,

    inviter_id UUID NOT NULL,

    email VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'EDITOR',

    token VARCHAR(500) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expired_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_board_invite_board
        FOREIGN KEY (board_id)
        REFERENCES public.boards(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_board_invite_inviter
        FOREIGN KEY (inviter_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_board_invite_role
        CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER')),

    CONSTRAINT chk_board_invite_status
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED'))
);

COMMENT ON TABLE public.board_invites IS
'Lưu các lời mời người dùng tham gia Board Kanban với vai trò cụ thể.';

COMMENT ON COLUMN public.board_invites.board_id IS
'Board gửi lời mời.';

COMMENT ON COLUMN public.board_invites.inviter_id IS
'Người gửi lời mời tham gia Board.';

COMMENT ON COLUMN public.board_invites.email IS
'Email của người được mời.';

COMMENT ON COLUMN public.board_invites.role IS
'Vai trò được chỉ định: ADMIN, EDITOR hoặc VIEWER.';

COMMENT ON COLUMN public.board_invites.token IS
'Mã token bảo mật duy nhất dùng để xác nhận lời mời.';

COMMENT ON COLUMN public.board_invites.status IS
'Trạng thái lời mời: PENDING, ACCEPTED, REJECTED, REVOKED.';

COMMENT ON COLUMN public.board_invites.expired_at IS
'Thời điểm lời mời hết hạn.';

-- Tạo indexes tối ưu tốc độ tra cứu
CREATE INDEX IF NOT EXISTS idx_board_invites_board ON public.board_invites(board_id);
CREATE INDEX IF NOT EXISTS idx_board_invites_email ON public.board_invites(email);
CREATE INDEX IF NOT EXISTS idx_board_invites_token ON public.board_invites(token);
CREATE INDEX IF NOT EXISTS idx_board_invites_status ON public.board_invites(status);

-- ==============================================================================
-- BẢO MẬT & PHÂN QUYỀN (RLS) CHO PUBLIC.BOARD_INVITES
-- ==============================================================================
ALTER TABLE public.board_invites ENABLE ROW LEVEL SECURITY;

-- 1. Xem lời mời: Người nhận theo email hoặc người tạo lời mời
DROP POLICY IF EXISTS "Users can view board invites for their email or created by them" ON public.board_invites;
CREATE POLICY "Users can view board invites for their email or created by them"
    ON public.board_invites
    FOR SELECT
    TO authenticated
    USING (
        email = (SELECT email FROM public.users WHERE id = auth.uid())
        OR inviter_id = auth.uid()
    );

-- 2. Thêm lời mời: Chỉ người mời đã xác thực
DROP POLICY IF EXISTS "Inviters can create board invites" ON public.board_invites;
CREATE POLICY "Inviters can create board invites"
    ON public.board_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = inviter_id);

-- 3. Cập nhật trạng thái (chấp nhận/từ chối): Người nhận hoặc người tạo
DROP POLICY IF EXISTS "Recipients or inviters can update board invites" ON public.board_invites;
CREATE POLICY "Recipients or inviters can update board invites"
    ON public.board_invites
    FOR UPDATE
    TO authenticated
    USING (
        email = (SELECT email FROM public.users WHERE id = auth.uid())
        OR inviter_id = auth.uid()
    );

-- 4. Thu hồi lời mời: Chỉ người tạo
DROP POLICY IF EXISTS "Inviters can delete board invites" ON public.board_invites;
CREATE POLICY "Inviters can delete board invites"
    ON public.board_invites
    FOR DELETE
    TO authenticated
    USING (auth.uid() = inviter_id);

-- Phân quyền Supabase an toàn (ngăn chặn anon truy cập dữ liệu nhạy cảm)
REVOKE ALL ON public.board_invites FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invites TO authenticated;
GRANT ALL ON public.board_invites TO service_role;
