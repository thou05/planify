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
import { ActivitiesService } from '../activities/activities.service';
import { AutomationsService } from '../automations/automations.service';

@Injectable()
export class ChecklistsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly automationsService: AutomationsService,
  ) {}

  private async verifyCardAccess(cardId: string, userId: string, requireEdit = true) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, list:lists (board_id, board:boards (id, workspace_id, visibility, workspace:workspaces (owner_id)))')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const board = (card.list as any)?.board;
    const boardId = (card.list as any)?.board_id || board?.id;
    const workspaceId = board?.workspace_id;

    if (boardId) {
      const isWorkspaceOwner = (board?.workspace as any)?.owner_id === userId;
      if (!isWorkspaceOwner) {
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
            throw new ForbiddenException('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa checklist');
          }
        } else {
          // 2. Kiểm tra trong workspace_members
          const { data: wsMember } = await this.supabase
            .from('workspace_members')
            .select('id, role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .maybeSingle();

          if (wsMember) {
            if (board?.visibility === 'PRIVATE') {
              throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
            }
          } else {
            if (board?.visibility === 'PUBLIC' && !requireEdit) {
              return { card, workspaceId, boardId };
            }
            throw new ForbiddenException('Bạn không có quyền thao tác trên thẻ này');
          }
        }
      }
    }

    return { card, workspaceId, boardId };
  }

  // --- CHECKLIST OPERATIONS ---

  async createChecklist(cardId: string, userId: string, dto: CreateChecklistDto) {
    const { workspaceId, boardId } = await this.verifyCardAccess(cardId, userId);

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

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã thêm danh sách "${checklist.title}"`,
        targetType: `card:${cardId}`,
      });
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
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

    const { boardId } = await this.verifyCardAccess(checklist.card_id, userId);

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

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId: checklist.card_id,
        senderId: userId,
      });
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

    const { boardId } = await this.verifyCardAccess(checklist.card_id, userId);

    const { error } = await this.supabase.from('checklists').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Không thể xóa danh sách việc cần làm');
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId: checklist.card_id,
        senderId: userId,
      });
    }

    return { message: 'Đã xóa danh sách việc cần làm thành công' };
  }

  private async resolveBoardMemberId(boardId: string, memberIdOrUserId: string): Promise<string | null> {
    if (!memberIdOrUserId) return null;

    // 1. Kiểm tra xem đã là ID của board_members chưa
    const { data: foundById } = await this.supabase
      .from('board_members')
      .select('id')
      .eq('id', memberIdOrUserId)
      .eq('board_id', boardId)
      .maybeSingle();

    if (foundById) return foundById.id;

    // 2. Kiểm tra xem có phải user_id trong board_members chưa
    const { data: foundByUserId } = await this.supabase
      .from('board_members')
      .select('id')
      .eq('user_id', memberIdOrUserId)
      .eq('board_id', boardId)
      .maybeSingle();

    if (foundByUserId) return foundByUserId.id;

    // 3. Tìm workspace_id của bảng
    const { data: board } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (!board?.workspace_id) return null;

    // Kiểm tra xem người dùng có thuộc workspace không
    let targetUserId = memberIdOrUserId;
    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', board.workspace_id)
      .or(`id.eq.${memberIdOrUserId},user_id.eq.${memberIdOrUserId}`)
      .maybeSingle();

    if (wsMember) {
      targetUserId = wsMember.user_id;
    } else {
      const { data: ws } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', board.workspace_id)
        .maybeSingle();

      if (ws?.owner_id === memberIdOrUserId) {
        targetUserId = ws.owner_id;
      } else {
        return null;
      }
    }

    // Tự động thêm vào board_members
    const { data: newBoardMember } = await this.supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: targetUserId,
        role: 'EDITOR',
      })
      .select('id')
      .single();

    return newBoardMember?.id || null;
  }

  async createItem(checklistId: string, userId: string, dto: CreateChecklistItemDto) {
    const { data: checklist } = await this.supabase
      .from('checklists')
      .select('id, card_id')
      .eq('id', checklistId)
      .maybeSingle();

    if (!checklist) {
      throw new NotFoundException('Không tìm thấy danh sách việc cần làm');
    }

    const { boardId } = await this.verifyCardAccess(checklist.card_id, userId);

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

    const insertPayload: Record<string, any> = {
      checklist_id: checklistId,
      content: dto.content.trim(),
      position,
      is_completed: false,
    };
    if (dto.due_date !== undefined) insertPayload.due_date = dto.due_date;
    if (dto.member_id !== undefined) {
      if (dto.member_id && boardId) {
        const resolvedId = await this.resolveBoardMemberId(boardId, dto.member_id);
        insertPayload.member_id = resolvedId;
      } else {
        insertPayload.member_id = dto.member_id;
      }
    }

    let { data: item, error } = await this.supabase
      .from('checklist_items')
      .insert(insertPayload)
      .select(`
        id,
        checklist_id,
        content,
        is_completed,
        position,
        due_date,
        member_id,
        member:board_members (
          id,
          role,
          user:users (id, name, email, avatar)
        )
      `)
      .maybeSingle();

    if (error) {
      delete insertPayload.due_date;
      delete insertPayload.member_id;
      const fallbackRes = await this.supabase
        .from('checklist_items')
        .insert(insertPayload)
        .select()
        .maybeSingle();
      item = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !item) {
      throw new BadRequestException(error?.message || 'Không thể tạo mục công việc');
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId: checklist.card_id,
        senderId: userId,
      });
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
    let bId: string | undefined;
    if (cardId) {
      const access = await this.verifyCardAccess(cardId, userId);
      bId = access.boardId;
    }

    const updatePayload: Record<string, any> = {};
    if (dto.content !== undefined) updatePayload.content = dto.content.trim();
    if (dto.is_completed !== undefined) updatePayload.is_completed = dto.is_completed;
    if (dto.position !== undefined) updatePayload.position = dto.position;
    if (dto.due_date !== undefined) updatePayload.due_date = dto.due_date;
    if (dto.member_id !== undefined) {
      if (dto.member_id && bId) {
        const resolvedId = await this.resolveBoardMemberId(bId, dto.member_id);
        updatePayload.member_id = resolvedId;
      } else {
        updatePayload.member_id = dto.member_id;
      }
    }

    let { data: updated, error } = await this.supabase
      .from('checklist_items')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        checklist_id,
        content,
        is_completed,
        position,
        due_date,
        member_id,
        member:board_members (
          id,
          role,
          user:users (id, name, email, avatar)
        )
      `)
      .maybeSingle();

    if (error) {
      delete updatePayload.due_date;
      delete updatePayload.member_id;
      const fallbackRes = await this.supabase
        .from('checklist_items')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();
      updated = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật mục công việc');
    }

    if (cardId && dto.is_completed !== undefined) {
      const { workspaceId } = await this.verifyCardAccess(cardId, userId);
      if (workspaceId) {
        await this.activitiesService.logActivity({
          workspaceId,
          userId,
          action: dto.is_completed ? `đã hoàn thành "${updated.content || 'công việc'}"` : `đã mở lại "${updated.content || 'công việc'}"`,
          targetType: `card:${cardId}`,
        });
      }
    }

    if (bId && cardId) {
      this.supabase.emitBoardEvent(bId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });

      if (dto.is_completed === true) {
        // Kiểm tra xem tất cả các mục checklist của card đã hoàn thành chưa
        void (async () => {
          try {
            const { data: allItems } = await this.supabase
              .from('checklist_items')
              .select('is_completed, checklist:checklists!inner(card_id)')
              .eq('checklist.card_id', cardId);

            const hasUnfinished = (allItems || []).some((it: any) => !it.is_completed);
            if (!hasUnfinished && (allItems || []).length > 0) {
              await this.automationsService.triggerByEvent(
                bId!,
                'CHECKLIST_COMPLETED',
                { cardId },
                userId,
              );
            }
          } catch {}
        })();
      }
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
    let bId: string | undefined;
    if (cardId) {
      const access = await this.verifyCardAccess(cardId, userId);
      bId = access.boardId;
    }

    const { error } = await this.supabase.from('checklist_items').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Không thể xóa mục công việc');
    }

    if (bId && cardId) {
      this.supabase.emitBoardEvent(bId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
    }

    return { message: 'Đã xóa mục công việc thành công' };
  }
}
