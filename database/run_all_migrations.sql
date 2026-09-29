-- ==============================================================================
-- PLANIFY - TOÀN BỘ MIGRATION CÒN THIẾU CHO SUPABASE
-- Hãy copy toàn bộ nội dung file này và chạy trong Supabase -> SQL Editor
-- ==============================================================================

-- 1. BẢNG BOARDS (Mở rộng background, visibility, is_archived)
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) NOT NULL DEFAULT 'WORKSPACE';
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS background VARCHAR(100) NULL;

-- 2. BẢNG CHECKLIST_ITEMS (Mở rộng due_date, member_id)
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.board_members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_items_member ON public.checklist_items(member_id);

-- 3. BẢNG USERS (Mở rộng bio, timezone, language, phone, theme)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'vi';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) NOT NULL DEFAULT 'system';

-- 4. BẢNG BOARD_INVITES
CREATE TABLE IF NOT EXISTS public.board_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL,
    inviter_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER')),
    token VARCHAR(500) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expired_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_board_invite_board FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_invite_inviter FOREIGN KEY (inviter_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_board_invites_board ON public.board_invites(board_id);
CREATE INDEX IF NOT EXISTS idx_board_invites_email ON public.board_invites(email);
CREATE INDEX IF NOT EXISTS idx_board_invites_token ON public.board_invites(token);
CREATE INDEX IF NOT EXISTS idx_board_invites_status ON public.board_invites(status);

-- 5. BẢNG TEMPLATES
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'productivity',
    background VARCHAR(100) NULL DEFAULT '#2b1572',
    author_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    author_name VARCHAR(100) NOT NULL DEFAULT 'Planify Team',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_author ON public.templates(author_id);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON public.templates(usage_count DESC);

-- CẤP QUYỀN TOÀN BỘ CHO SERVICE_ROLE & AUTHENTICATED
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
