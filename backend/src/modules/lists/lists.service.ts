import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(boardId: string, userId: string, dto: CreateListDto) {
    await this.verifyBoardAccess(boardId, userId);

    let position = dto.position;
    if (position === undefined) {
      const { data: existingLists } = await this.supabase
        .from('lists')
        .select('position')
        .eq('board_id', boardId)
        .order('position', { ascending: false })
        .limit(1);

      position = (existingLists?.[0]?.position ?? -1) + 1;
    }

    const { data: list, error } = await this.supabase
      .from('lists')
      .insert({
        board_id: boardId,
        title: dto.title.trim(),
        position,
        limit: dto.limit ?? null,
      })
      .select()
      .single();

    if (error || !list) {
      throw new BadRequestException(error?.message || 'Không thể tạo danh sách');
    }

    return { ...list, cards: [] };
  }

  async update(listId: string, userId: string, dto: UpdateListDto) {
    const { data: list } = await this.supabase
      .from('lists')
      .select('board_id')
      .eq('id', listId)
      .maybeSingle();

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách (List)');
    }

    await this.verifyBoardAccess(list.board_id, userId);

    const updateData: Record<string, any> = {};
    if (dto.title) updateData.title = dto.title.trim();
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.limit !== undefined) updateData.limit = dto.limit;

    const { data: updated, error } = await this.supabase
      .from('lists')
      .update(updateData)
      .eq('id', listId)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật danh sách');
    }

    return updated;
  }

  async delete(listId: string, userId: string) {
    const { data: list } = await this.supabase
      .from('lists')
      .select('board_id')
      .eq('id', listId)
      .maybeSingle();

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách (List)');
    }

    await this.verifyBoardAccess(list.board_id, userId);

    const { error } = await this.supabase
      .from('lists')
      .delete()
      .eq('id', listId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Xóa danh sách thành công' };
  }

  private async verifyBoardAccess(boardId: string, userId: string) {
    const { data: board } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (!board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', board.workspace_id)
        .maybeSingle();

      if (workspace?.owner_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên Board này');
      }
    }
  }
}
