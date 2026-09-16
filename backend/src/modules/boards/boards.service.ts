import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(workspaceId: string, userId: string, dto: CreateBoardDto) {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // 1. Tạo board
    const { data: board, error: bError } = await this.supabase
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        is_favorite: dto.is_favorite ?? false,
      })
      .select()
      .single();

    if (bError || !board) {
      throw new BadRequestException(bError?.message || 'Không thể tạo Board');
    }

    // 2. Gán user làm ADMIN trong board_members
    await this.supabase.from('board_members').insert({
      board_id: board.id,
      user_id: userId,
      role: 'ADMIN',
    });

    // 3. Tự động tạo 3 danh sách mặc định: "To Do", "In Progress", "Done"
    await this.supabase.from('lists').insert([
      { board_id: board.id, title: 'To Do', position: 0 },
      { board_id: board.id, title: 'In Progress', position: 1 },
      { board_id: board.id, title: 'Done', position: 2 },
    ]);

    return this.findById(board.id, userId);
  }

  async findAllInWorkspace(workspaceId: string, userId: string) {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const { data: boards, error } = await this.supabase
      .from('boards')
      .select(`
        id,
        name,
        description,
        is_favorite,
        lists (id),
        members:board_members (id)
      `)
      .eq('workspace_id', workspaceId)
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (boards || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      is_favorite: b.is_favorite,
      _count: {
        lists: b.lists?.length || 0,
        members: b.members?.length || 0,
      },
    }));
  }

  async findById(boardId: string, userId: string) {
    const { data: board, error } = await this.supabase
      .from('boards')
      .select(`
        id,
        workspace_id,
        name,
        description,
        is_favorite,
        workspace:workspaces (id, name, owner_id),
        lists (
          id,
          title,
          position,
          limit,
          cards (
            id,
            title,
            description,
            position,
            status,
            due_date,
            is_due_date_completed,
            checklists (
              id,
              title,
              items:checklist_items (id, content, is_completed)
            ),
            card_labels (
              label:labels (id, name, color)
            ),
            comments (id)
          )
        ),
        members:board_members (
          id,
          role,
          user:users (id, name, email, avatar)
        ),
        labels (id, name, color)
      `)
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    await this.verifyWorkspaceAccess(board.workspace_id, userId);

    // Sắp xếp lists và cards theo position
    if (board.lists) {
      board.lists.sort((a: any, b: any) => a.position - b.position);
      board.lists.forEach((list: any) => {
        if (list.cards) {
          list.cards.sort((a: any, b: any) => a.position - b.position);
        }
      });
    }

    return board;
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto) {
    const { data: board } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (!board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    await this.verifyWorkspaceAccess(board.workspace_id, userId);

    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.is_favorite !== undefined) updateData.is_favorite = dto.is_favorite;

    const { data: updated, error } = await this.supabase
      .from('boards')
      .update(updateData)
      .eq('id', boardId)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật Board');
    }

    return updated;
  }

  async delete(boardId: string, userId: string) {
    const { data: board } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (!board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    await this.verifyWorkspaceAccess(board.workspace_id, userId);

    const { error } = await this.supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Xóa Board thành công' };
  }

  private async verifyWorkspaceAccess(workspaceId: string, userId: string) {
    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (workspace?.owner_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập Workspace này');
      }
    }
  }
}
