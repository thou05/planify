-- ==============================================================================
-- PLANIFY - MIGRATION BOARD EDITOR JOIN MODE & REQUESTS
-- ==============================================================================
-- 1. Bổ sung cột editor_join_mode vào bảng public.boards
--    Giá trị hợp lệ: 'REQUEST' (mặc định), 'AUTO_WORKSPACE'
-- 2. Tạo bảng public.board_editor_requests để quản lý các yêu cầu cấp quyền Biên tập viên
-- ==============================================================================

-- 1. Thêm cột editor_join_mode vào bảng boards
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS editor_join_mode VARCHAR(30) NOT NULL DEFAULT 'REQUEST';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'boards_editor_join_mode_check'
  ) THEN
    ALTER TABLE public.boards ADD CONSTRAINT boards_editor_join_mode_check 
      CHECK (editor_join_mode IN ('REQUEST', 'AUTO_WORKSPACE'));
  END IF;
END $$;

COMMENT ON COLUMN public.boards.editor_join_mode IS 'Chế độ gia nhập Editor của Board: REQUEST (yêu cầu phê duyệt) hoặc AUTO_WORKSPACE (thành viên Workspace tự động nhận quyền Editor).';

-- 2. Tạo bảng board_editor_requests
CREATE TABLE IF NOT EXISTS public.board_editor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index và constraints
CREATE INDEX IF NOT EXISTS idx_board_editor_requests_board_status ON public.board_editor_requests(board_id, status);
CREATE INDEX IF NOT EXISTS idx_board_editor_requests_user ON public.board_editor_requests(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_board_editor_requests_pending ON public.board_editor_requests(board_id, user_id) WHERE status = 'PENDING';

COMMENT ON TABLE public.board_editor_requests IS 'Danh sách các yêu cầu cấp quyền Biên tập viên (Editor) từ Viewer gửi tới Admin Board/Workspace.';
COMMENT ON COLUMN public.board_editor_requests.status IS 'Trạng thái yêu cầu: PENDING, APPROVED, REJECTED.';
COMMENT ON COLUMN public.board_editor_requests.note IS 'Ghi chú hoặc lý do yêu cầu cấp quyền.';

-- Đảm bảo quyền truy cập cho Supabase API
GRANT ALL ON TABLE public.board_editor_requests TO anon, authenticated, service_role;

