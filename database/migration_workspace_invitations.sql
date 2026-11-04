-- ==============================================================================
-- PLANIFY - MIGRATION WORKSPACE INVITATIONS EXPANSION
-- ==============================================================================
-- Bổ sung các cột mở rộng cho bảng public.workspace_invites:
--    - inviter_id: Người gửi lời mời tham gia Workspace
--    - status: Trạng thái lời mời (PENDING, ACCEPTED, DECLINED, REVOKED)
--    - created_at: Thời điểm tạo lời mời
-- ==============================================================================

ALTER TABLE public.workspace_invites 
  ADD COLUMN IF NOT EXISTS inviter_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email_status ON public.workspace_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_ws_status ON public.workspace_invites(workspace_id, status);

COMMENT ON COLUMN public.workspace_invites.inviter_id IS 'Người gửi lời mời tham gia Workspace.';
COMMENT ON COLUMN public.workspace_invites.status IS 'Trạng thái lời mời: PENDING, ACCEPTED, DECLINED, REVOKED.';
COMMENT ON COLUMN public.workspace_invites.created_at IS 'Thời điểm tạo lời mời.';

