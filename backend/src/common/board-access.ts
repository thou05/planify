import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../integrations/supabase/supabase.service';

export async function assertBoardRead(db: SupabaseService, boardId: string, userId: string) {
  const { data: board, error } = await db.from('boards').select('id, visibility, workspace_id, workspace:workspaces(owner_id)').eq('id', boardId).maybeSingle();
  if (error || !board) throw new NotFoundException('Không tìm thấy bảng');
  if ((board.workspace as any)?.owner_id === userId || board.visibility === 'PUBLIC') return;
  const { data: member } = await db.from('board_members').select('id').eq('board_id', boardId).eq('user_id', userId).maybeSingle();
  if (member) return;
  const { data: ws } = await db.from('workspace_members').select('role').eq('workspace_id', board.workspace_id).eq('user_id', userId).maybeSingle();
  if (ws && ws.role !== 'GUEST' && board.visibility !== 'PRIVATE') return;
  throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
}

export async function assertBoardWritable(db: SupabaseService, boardId: string) {
  const { data: board, error } = await db.from('boards').select('id, is_archived').eq('id', boardId).maybeSingle();
  if (error || !board) throw new NotFoundException('Không tìm thấy bảng');
  if (board.is_archived) throw new ForbiddenException('Bảng đã lưu trữ. Hãy khôi phục bảng trước khi chỉnh sửa.');
}
