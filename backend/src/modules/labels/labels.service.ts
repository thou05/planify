import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly supabase: SupabaseService) {}

  private async verifyBoardAccess(boardId: string, userId: string, requireEdit = false) {
    const { data: board, error } = await this.supabase
      .from('boards')
      .select('id, workspace_id, visibility, workspace:workspaces (owner_id)')
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Bảng (Board)');
    }

    const isWorkspaceOwner = (board.workspace as any)?.owner_id === userId;
    if (isWorkspaceOwner) {
      return board;
    }

    // 1. Kiểm tra trực tiếp trong board_members
    const { data: boardMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (boardMember) {
      const canEdit = boardMember.role === 'ADMIN' || boardMember.role === 'EDITOR' || boardMember.role === 'MEMBER';
      if (requireEdit && !canEdit) {
        throw new ForbiddenException('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa nhãn');
      }
      return board;
    }

    // 2. Kiểm tra trong workspace_members
    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (wsMember) {
      if (wsMember.role === 'GUEST') {
        throw new ForbiddenException('Khách (Guest) không có quyền truy cập Bảng này');
      }
      if (board.visibility === 'PRIVATE') {
        throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
      }
      if (requireEdit) {
        throw new ForbiddenException('Bạn cần tham gia Bảng với quyền Biên tập viên (Editor) hoặc Quản trị viên (Admin) để chỉnh sửa nhãn');
      }
      return board;
    }

    if (board.visibility === 'PUBLIC' && !requireEdit) {
      return board;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
  }

  private async verifyCardAccess(cardId: string, userId: string, requireEdit = false) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const boardId = (card.list as any)?.board_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId, requireEdit);
    }

    return { card, boardId };
  }

  // --- BOARD LABELS CRUD ---

  async getBoardLabels(boardId: string, userId: string) {
    await this.verifyBoardAccess(boardId, userId, false);

    const { data: labels, error } = await this.supabase
      .from('labels')
      .select('id, board_id, name, color')
      .eq('board_id', boardId)
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách nhãn');
    }

    return labels || [];
  }

  async createLabel(boardId: string, userId: string, dto: CreateLabelDto) {
    await this.verifyBoardAccess(boardId, userId, true);

    const { data: label, error } = await this.supabase
      .from('labels')
      .insert({
        board_id: boardId,
        name: dto.name.trim(),
        color: dto.color.trim(),
      })
      .select('id, board_id, name, color')
      .single();

    if (error || !label) {
      if (error?.code === '23505') {
        throw new BadRequestException('Tên nhãn này đã tồn tại trong bảng');
      }
      throw new BadRequestException(error?.message || 'Không thể tạo nhãn');
    }

    return label;
  }

  async updateLabel(labelId: string, userId: string, dto: UpdateLabelDto) {
    const { data: label, error } = await this.supabase
      .from('labels')
      .select('id, board_id, name, color')
      .eq('id', labelId)
      .maybeSingle();

    if (error || !label) {
      throw new NotFoundException('Không tìm thấy nhãn');
    }

    await this.verifyBoardAccess(label.board_id, userId);

    const updatePayload: Record<string, any> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.color !== undefined) updatePayload.color = dto.color.trim();

    if (Object.keys(updatePayload).length === 0) {
      return label;
    }

    const { data: updatedLabel, error: updateError } = await this.supabase
      .from('labels')
      .update(updatePayload)
      .eq('id', labelId)
      .select('id, board_id, name, color')
      .single();

    if (updateError || !updatedLabel) {
      if (updateError?.code === '23505') {
        throw new BadRequestException('Tên nhãn này đã tồn tại trong bảng');
      }
      throw new BadRequestException(updateError?.message || 'Không thể cập nhật nhãn');
    }

    return updatedLabel;
  }

  async deleteLabel(labelId: string, userId: string) {
    const { data: label, error } = await this.supabase
      .from('labels')
      .select('id, board_id')
      .eq('id', labelId)
      .maybeSingle();

    if (error || !label) {
      throw new NotFoundException('Không tìm thấy nhãn');
    }

    await this.verifyBoardAccess(label.board_id, userId);

    const { error: delError } = await this.supabase
      .from('labels')
      .delete()
      .eq('id', labelId);

    if (delError) {
      throw new BadRequestException(delError.message || 'Không thể xóa nhãn');
    }

    return { message: 'Đã xóa nhãn thành công', id: labelId };
  }

  // --- CARD LABELS TOGGLE ---

  async toggleCardLabel(cardId: string, userId: string, labelId: string) {
    const { card, boardId } = await this.verifyCardAccess(cardId, userId, true);

    // Verify label belongs to the board
    const { data: label, error: lError } = await this.supabase
      .from('labels')
      .select('id, name, color, board_id')
      .eq('id', labelId)
      .maybeSingle();

    if (lError || !label) {
      throw new NotFoundException('Không tìm thấy nhãn');
    }

    if (label.board_id !== boardId) {
      throw new BadRequestException('Nhãn này không thuộc về bảng của thẻ');
    }

    // Check if card already has this label
    const { data: existing } = await this.supabase
      .from('card_labels')
      .select('id')
      .eq('card_id', cardId)
      .eq('label_id', labelId)
      .maybeSingle();

    if (existing) {
      // Remove
      await this.supabase
        .from('card_labels')
        .delete()
        .eq('id', existing.id);

      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId,
          senderId: userId,
        });
      }

      return {
        assigned: false,
        label_id: labelId,
      };
    } else {
      // Assign
      const { data: newCardLabel, error: insertError } = await this.supabase
        .from('card_labels')
        .insert({
          card_id: cardId,
          label_id: labelId,
        })
        .select(`
          id,
          label:labels (id, name, color)
        `)
        .single();

      if (insertError || !newCardLabel) {
        throw new BadRequestException(insertError?.message || 'Không thể gán nhãn vào thẻ');
      }

      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId,
          senderId: userId,
        });
      }

      return {
        assigned: true,
        card_label: newCardLabel,
      };
    }
  }
}
