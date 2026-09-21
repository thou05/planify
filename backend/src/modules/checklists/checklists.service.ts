import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Injectable()
export class ChecklistsService {
  constructor(private readonly supabase: SupabaseService) {}

  private async verifyCardAccess(cardId: string, userId: string) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, list:lists (board:boards (id, workspace_id))')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const board = (card.list as any)?.board;
    const workspaceId = board?.workspace_id;
    if (workspaceId) {
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
          throw new ForbiddenException('Bạn không có quyền thao tác trên thẻ này');
        }
      }
    }
  }

  // --- CHECKLIST OPERATIONS ---

  async createChecklist(cardId: string, userId: string, dto: CreateChecklistDto) {
    await this.verifyCardAccess(cardId, userId);

    let position = dto.position;
    if (position === undefined) {
      const { data: lastChecklist } = await this.supabase
        .from('checklists')
        .select('position')
        .eq('card_id', cardId)
        .order('position', { ascending: false })
        .limit(1);

      position = (lastChecklist?.[0]?.position ?? -1) + 1;
    }

    const { data: checklist, error } = await this.supabase
      .from('checklists')
      .insert({
        card_id: cardId,
        title: dto.title.trim(),
        position,
      })
      .select()
      .single();

    if (error || !checklist) {
      throw new BadRequestException(error?.message || 'Không thể tạo danh sách việc cần làm');
    }

    return { ...checklist, items: [] };
  }

  async updateChecklist(id: string, userId: string, dto: UpdateChecklistDto) {
    const { data: checklist } = await this.supabase
      .from('checklists')
      .select('id, card_id')
      .eq('id', id)
      .maybeSingle();

    if (!checklist) {
      throw new NotFoundException('Không tìm thấy danh sách việc cần làm');
    }

    await this.verifyCardAccess(checklist.card_id, userId);

    const updatePayload: Record<string, any> = {};
    if (dto.title !== undefined) updatePayload.title = dto.title.trim();
    if (dto.position !== undefined) updatePayload.position = dto.position;

    const { data: updated, error } = await this.supabase
      .from('checklists')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật danh sách việc cần làm');
    }

    return updated;
  }

  async deleteChecklist(id: string, userId: string) {
    const { data: checklist } = await this.supabase
      .from('checklists')
      .select('id, card_id')
      .eq('id', id)
      .maybeSingle();

    if (!checklist) {
      throw new NotFoundException('Không tìm thấy danh sách việc cần làm');
    }

    await this.verifyCardAccess(checklist.card_id, userId);

    const { error } = await this.supabase.from('checklists').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Không thể xóa danh sách việc cần làm');
    }

    return { message: 'Đã xóa danh sách việc cần làm thành công' };
  }

  // --- CHECKLIST ITEM OPERATIONS ---

  async createItem(checklistId: string, userId: string, dto: CreateChecklistItemDto) {
    const { data: checklist } = await this.supabase
      .from('checklists')
      .select('id, card_id')
      .eq('id', checklistId)
      .maybeSingle();

    if (!checklist) {
      throw new NotFoundException('Không tìm thấy danh sách việc cần làm');
    }

    await this.verifyCardAccess(checklist.card_id, userId);

    let position = dto.position;
    if (position === undefined) {
      const { data: lastItem } = await this.supabase
        .from('checklist_items')
        .select('position')
        .eq('checklist_id', checklistId)
        .order('position', { ascending: false })
        .limit(1);

      position = (lastItem?.[0]?.position ?? -1) + 1;
    }

    const { data: item, error } = await this.supabase
      .from('checklist_items')
      .insert({
        checklist_id: checklistId,
        content: dto.content.trim(),
        position,
        is_completed: false,
      })
      .select()
      .single();

    if (error || !item) {
      throw new BadRequestException(error?.message || 'Không thể tạo mục công việc');
    }

    return item;
  }

  async updateItem(id: string, userId: string, dto: UpdateChecklistItemDto) {
    const { data: item } = await this.supabase
      .from('checklist_items')
      .select('id, checklist_id, checklist:checklists (card_id)')
      .eq('id', id)
      .maybeSingle();

    if (!item) {
      throw new NotFoundException('Không tìm thấy mục công việc');
    }

    const cardId = (item.checklist as any)?.card_id;
    if (cardId) {
      await this.verifyCardAccess(cardId, userId);
    }

    const updatePayload: Record<string, any> = {};
    if (dto.content !== undefined) updatePayload.content = dto.content.trim();
    if (dto.is_completed !== undefined) updatePayload.is_completed = dto.is_completed;
    if (dto.position !== undefined) updatePayload.position = dto.position;

    const { data: updated, error } = await this.supabase
      .from('checklist_items')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật mục công việc');
    }

    return updated;
  }

  async deleteItem(id: string, userId: string) {
    const { data: item } = await this.supabase
      .from('checklist_items')
      .select('id, checklist_id, checklist:checklists (card_id)')
      .eq('id', id)
      .maybeSingle();

    if (!item) {
      throw new NotFoundException('Không tìm thấy mục công việc');
    }

    const cardId = (item.checklist as any)?.card_id;
    if (cardId) {
      await this.verifyCardAccess(cardId, userId);
    }

    const { error } = await this.supabase.from('checklist_items').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Không thể xóa mục công việc');
    }

    return { message: 'Đã xóa mục công việc thành công' };
  }
}
