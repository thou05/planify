import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { CopyCardDto } from './dto/copy-card.dto';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CardsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async create(listId: string, userId: string, dto: CreateCardDto) {
    const { data: list, error: lError } = await this.supabase
      .from('lists')
      .select('board_id, limit, board:boards (workspace_id)')
      .eq('id', listId)
      .maybeSingle();

    if (lError || !list) {
      throw new NotFoundException('Không tìm thấy danh sách (List)');
    }

    const workspaceId = (list.board as any)?.workspace_id;
    if (workspaceId) {
      await this.verifyWorkspaceAccess(workspaceId, userId);
    }

    if (list.limit && list.limit > 0) {
      const { count } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId);

      if (count !== null && count >= list.limit) {
        throw new BadRequestException(`Danh sách đã đạt giới hạn tối đa (${list.limit} thẻ)`);
      }
    }

    let position = dto.position;
    if (position === undefined) {
      const { data: lastCard } = await this.supabase
        .from('cards')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);

      position = (lastCard?.[0]?.position ?? -1) + 1;
    }

    const { data: card, error } = await this.supabase
      .from('cards')
      .insert({
        list_id: listId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        position,
        status: dto.status || 'TODO',
        start_date: dto.start_date || null,
        due_date: dto.due_date || null,
        reminder_at: dto.reminder_at || null,
        is_due_date_completed: dto.is_due_date_completed ?? false,
        created_by: userId,
      })
      .select()
      .single();

    if (error || !card) {
      throw new BadRequestException(error?.message || 'Không thể tạo thẻ mới');
    }

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: 'đã tạo thẻ này',
        targetType: `card:${card.id}`,
      });
    }

    const createdCard = {
      ...card,
      checklists: [],
      card_labels: [],
      comments: [],
      card_assignees: [],
    };

    if (list?.board_id) {
      this.supabase.emitBoardEvent(list.board_id, 'CARD_CREATED', {
        card: createdCard,
        listId,
        senderId: userId,
      });
    }

    return createdCard;
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
        throw new ForbiddenException('Bạn không có quyền thao tác trên Board này');
      }
    }
  }

  async findById(cardId: string, userId: string) {
    let { data: card, error } = await this.supabase
      .from('cards')
      .select(`
        *,
        list:lists (id, title, board_id),
        creator:users (id, name, email, avatar),
        checklists (
          id,
          title,
          position,
          items:checklist_items (
            id,
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
          )
        ),
        card_labels (
          label:labels (id, name, color)
        ),
        card_assignees (
          board_member:board_members (
            id,
            role,
            user:users (id, name, email, avatar)
          )
        ),
        comments (
          id,
          content,
          created_at,
          user:users (id, name, avatar)
        ),
        attachments (
          id,
          file_name,
          file_url,
          file_size
        )
      `)
      .eq('id', cardId)
      .maybeSingle();

    if (error) {
      const fallback = await this.supabase
        .from('cards')
        .select(`
          *,
          list:lists (id, title, board_id),
          creator:users (id, name, email, avatar),
          checklists (
            id,
            title,
            position,
            items:checklist_items (
              id,
              content,
              is_completed,
              position
            )
          ),
          card_labels (
            label:labels (id, name, color)
          ),
          card_assignees (
            board_member:board_members (
              id,
              role,
              user:users (id, name, email, avatar)
            )
          ),
          comments (
            id,
            content,
            created_at,
            user:users (id, name, avatar)
          ),
          attachments (
            id,
            file_name,
            file_url,
            file_size
          )
        `)
        .eq('id', cardId)
        .maybeSingle();
      card = fallback.data;
      error = fallback.error;
    }

    if (error || !card) {
      throw new NotFoundException('Không tìm thấy thông tin thẻ');
    }

    const boardId = (card.list as any)?.board_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId);
    }

    return card;
  }

  async update(cardId: string, userId: string, dto: UpdateCardDto) {
    const { data: card } = await this.supabase
      .from('cards')
      .select('id, title, list_id, position, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    const boardId = (card.list as any)?.board_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId);
    }

    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title ? dto.title.trim() : dto.title;
    if (dto.description !== undefined) updateData.description = dto.description ? dto.description.trim() : null;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.start_date !== undefined) updateData.start_date = dto.start_date;
    if (dto.due_date !== undefined) updateData.due_date = dto.due_date;
    if (dto.reminder_at !== undefined) updateData.reminder_at = dto.reminder_at;
    if (dto.is_due_date_completed !== undefined) {
      updateData.is_due_date_completed = dto.is_due_date_completed;
    }

    // Nếu đánh dấu hoàn thành (is_due_date_completed = true hoặc status = DONE), kiểm tra xem có bị chặn bởi thẻ chưa hoàn thành không
    if (dto.is_due_date_completed === true || dto.status === 'DONE') {
      const { data: blockers } = await this.supabase
        .from('card_relations')
        .select('id, type, related_card:cards!related_card_id(id, title, is_due_date_completed, status)')
        .eq('card_id', cardId)
        .eq('type', 'BLOCKED_BY');

      const unresolvedBlockers = (blockers || []).filter((b: any) => {
        const rc = b.related_card;
        return rc && !rc.is_due_date_completed && rc.status !== 'DONE';
      });

      if (unresolvedBlockers.length > 0) {
        const titles = unresolvedBlockers
          .map((b: any) => `"${b.related_card?.title || 'Thẻ'}"`)
          .join(', ');
        throw new BadRequestException(
          `Không thể hoàn thành thẻ này vì đang bị chặn bởi các thẻ chưa hoàn thành: ${titles}`,
        );
      }
    }

    let { data: updated, error } = await this.supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .select(`
        *,
        checklists (
          id,
          title,
          position,
          items:checklist_items (
            id,
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
          )
        ),
        card_labels (
          label:labels (id, name, color)
        ),
        comments (id)
      `)
      .maybeSingle();

    if (error) {
      const fallback = await this.supabase
        .from('cards')
        .update(updateData)
        .eq('id', cardId)
        .select(`
          *,
          checklists (
            id,
            title,
            position,
            items:checklist_items (
              id,
              content,
              is_completed,
              position
            )
          ),
          card_labels (
            label:labels (id, name, color)
          ),
          comments (id)
        `)
        .maybeSingle();
      updated = fallback.data;
      error = fallback.error;
    }

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật thẻ');
    }

    const { data: bInfo } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (bInfo?.workspace_id) {
      if (dto.title !== undefined && dto.title.trim() !== card.title) {
        await this.activitiesService.logActivity({
          workspaceId: bInfo.workspace_id,
          userId,
          action: `đã đổi tên thẻ thành "${dto.title.trim()}"`,
          targetType: `card:${cardId}`,
        });
      }
      if (dto.is_due_date_completed !== undefined) {
        await this.activitiesService.logActivity({
          workspaceId: bInfo.workspace_id,
          userId,
          action: dto.is_due_date_completed ? 'đã đánh dấu hoàn thành hạn chót' : 'đã bỏ đánh dấu hoàn thành hạn chót',
          targetType: `card:${cardId}`,
        });
      } else if (dto.due_date !== undefined) {
        await this.activitiesService.logActivity({
          workspaceId: bInfo.workspace_id,
          userId,
          action: dto.due_date ? 'đã cập nhật ngày hết hạn' : 'đã xóa ngày hết hạn',
          targetType: `card:${cardId}`,
        });
      }
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        updated,
        senderId: userId,
      });
    }

    return updated;
  }

  async delete(cardId: string, userId: string) {
    const { data: card } = await this.supabase
      .from('cards')
      .select('id, list_id, position, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    const boardId = (card.list as any)?.board_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId);
    }

    const { error } = await this.supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Re-index remaining cards in the list
    const { data: remainingCards } = await this.supabase
      .from('cards')
      .select('id, position')
      .eq('list_id', card.list_id)
      .gt('position', card.position)
      .order('position', { ascending: true });

    if (remainingCards && remainingCards.length > 0) {
      for (const item of remainingCards) {
        await this.supabase
          .from('cards')
          .update({ position: item.position - 1 })
          .eq('id', item.id);
      }
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_DELETED', {
        cardId,
        listId: card.list_id,
        senderId: userId,
      });
    }

    return { message: 'Xóa thẻ thành công' };
  }

  async move(cardId: string, userId: string, dto: MoveCardDto) {
    const { data: sourceCard } = await this.supabase
      .from('cards')
      .select('id, list_id, position, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (!sourceCard) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    const { data: targetList } = await this.supabase
      .from('lists')
      .select('id, board_id, limit')
      .eq('id', dto.targetListId)
      .maybeSingle();

    if (!targetList) {
      throw new NotFoundException('Không tìm thấy danh sách đích');
    }

    const sourceBoardId = (sourceCard.list as any)?.board_id;
    await this.verifyBoardAccess(sourceBoardId, userId);
    await this.verifyBoardAccess(targetList.board_id, userId);

    const isSameList = sourceCard.list_id === dto.targetListId;
    const targetPosition = Math.max(0, dto.position);

    if (!isSameList && targetList.limit && targetList.limit > 0) {
      const { count } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', dto.targetListId);

      if (count !== null && count >= targetList.limit) {
        throw new BadRequestException(`Danh sách đích đã đạt giới hạn tối đa (${targetList.limit} thẻ)`);
      }
    }

    if (isSameList) {
      // 1. Fetch all cards in this list ordered by position
      const { data: listCards } = await this.supabase
        .from('cards')
        .select('id, position')
        .eq('list_id', sourceCard.list_id)
        .order('position', { ascending: true });

      const cards = listCards || [];
      const filtered = cards.filter((c) => c.id !== cardId);
      const insertIdx = Math.min(targetPosition, filtered.length);
      filtered.splice(insertIdx, 0, { id: cardId, position: insertIdx });

      // Update positions for all cards in parallel
      const updatePromises = filtered.map((c, index) =>
        this.supabase
          .from('cards')
          .update({ position: index })
          .eq('id', c.id)
      );
      await Promise.all(updatePromises);
    } else {
      // Moving across lists
      // 1. Re-normalize source list cards (excluding moved card)
      const { data: sourceCards } = await this.supabase
        .from('cards')
        .select('id, position')
        .eq('list_id', sourceCard.list_id)
        .order('position', { ascending: true });

      const filteredSource = (sourceCards || []).filter((c) => c.id !== cardId);
      const sourceUpdatePromises = filteredSource.map((c, index) =>
        this.supabase
          .from('cards')
          .update({ position: index })
          .eq('id', c.id)
      );

      // 2. Insert into target list and re-normalize target list cards
      const { data: targetCards } = await this.supabase
        .from('cards')
        .select('id, position')
        .eq('list_id', dto.targetListId)
        .order('position', { ascending: true });

      const filteredTarget = (targetCards || []).filter((c) => c.id !== cardId);
      const insertIdx = Math.min(targetPosition, filteredTarget.length);
      filteredTarget.splice(insertIdx, 0, { id: cardId, position: insertIdx });

      const targetUpdatePromises = filteredTarget.map((c, index) =>
        this.supabase
          .from('cards')
          .update({
            position: index,
            ...(c.id === cardId ? { list_id: dto.targetListId } : {}),
          })
          .eq('id', c.id)
      );

      await Promise.all([...sourceUpdatePromises, ...targetUpdatePromises]);

      const { data: sList } = await this.supabase.from('lists').select('title, board:boards(workspace_id)').eq('id', sourceCard.list_id).maybeSingle();
      const { data: tList } = await this.supabase.from('lists').select('title').eq('id', dto.targetListId).maybeSingle();
      const wsId = (sList?.board as any)?.workspace_id;
      if (wsId) {
        await this.activitiesService.logActivity({
          workspaceId: wsId,
          userId,
          action: `đã chuyển thẻ từ "${sList?.title || 'danh sách cũ'}" sang "${tList?.title || 'danh sách mới'}"`,
          targetType: `card:${cardId}`,
        });
      }
    }

    if (sourceBoardId) {
      this.supabase.emitBoardEvent(sourceBoardId, 'CARD_MOVED', {
        cardId,
        sourceListId: sourceCard.list_id,
        targetListId: dto.targetListId,
        position: targetPosition,
        senderId: userId,
      });
    }
    if (targetList.board_id && targetList.board_id !== sourceBoardId) {
      this.supabase.emitBoardEvent(targetList.board_id, 'CARD_MOVED', {
        cardId,
        sourceListId: sourceCard.list_id,
        targetListId: dto.targetListId,
        position: targetPosition,
        senderId: userId,
      });
    }

    return this.findById(cardId, userId);
  }

  async copy(cardId: string, userId: string, dto: CopyCardDto) {
    const { data: sourceCard, error } = await this.supabase
      .from('cards')
      .select(`
        *,
        list:lists (board_id),
        checklists (
          id,
          title,
          position,
          items:checklist_items (
            id,
            content,
            is_completed,
            position
          )
        )
      `)
      .eq('id', cardId)
      .maybeSingle();

    if (error || !sourceCard) {
      throw new NotFoundException('Không tìm thấy thẻ cần sao chép');
    }

    const sourceBoardId = (sourceCard.list as any)?.board_id;
    await this.verifyBoardAccess(sourceBoardId, userId);

    const targetListId = dto.targetListId || sourceCard.list_id;

    const { data: targetList } = await this.supabase
      .from('lists')
      .select('id, limit')
      .eq('id', targetListId)
      .maybeSingle();

    if (targetList?.limit && targetList.limit > 0) {
      const { count } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', targetListId);

      if (count !== null && count >= targetList.limit) {
        throw new BadRequestException(`Danh sách đích đã đạt giới hạn tối đa (${targetList.limit} thẻ)`);
      }
    }

    let targetPosition = dto.position;
    if (targetPosition === undefined) {
      targetPosition = sourceCard.position + 1;
    }

    // Shift items in target list
    const { data: itemsToShift } = await this.supabase
      .from('cards')
      .select('id, position')
      .eq('list_id', targetListId)
      .gte('position', targetPosition);

    if (itemsToShift) {
      for (const item of itemsToShift) {
        await this.supabase
          .from('cards')
          .update({ position: item.position + 1 })
          .eq('id', item.id);
      }
    }

    const newTitle = dto.title?.trim() || `${sourceCard.title} (Bản sao)`;

    const { data: newCard, error: cError } = await this.supabase
      .from('cards')
      .insert({
        list_id: targetListId,
        title: newTitle,
        description: sourceCard.description,
        position: targetPosition,
        status: sourceCard.status || 'TODO',
        start_date: sourceCard.start_date,
        due_date: sourceCard.due_date,
        is_due_date_completed: sourceCard.is_due_date_completed || false,
        created_by: userId,
      })
      .select()
      .single();

    if (cError || !newCard) {
      throw new BadRequestException('Không thể sao chép thẻ');
    }

    // Clone checklists
    if (sourceCard.checklists && sourceCard.checklists.length > 0) {
      for (const cl of sourceCard.checklists) {
        const { data: newCl } = await this.supabase
          .from('checklists')
          .insert({
            card_id: newCard.id,
            title: cl.title,
            position: cl.position || 0,
          })
          .select()
          .single();

        if (newCl && cl.items && cl.items.length > 0) {
          const newItems = cl.items.map((item: any) => ({
            checklist_id: newCl.id,
            content: item.content,
            is_completed: item.is_completed || false,
            position: item.position || 0,
          }));
          await this.supabase.from('checklist_items').insert(newItems);
        }
      }
    }

    if (sourceBoardId) {
      this.supabase.emitBoardEvent(sourceBoardId, 'CARD_CREATED', {
        cardId: newCard.id,
        listId: targetListId,
        senderId: userId,
      });
    }

    return this.findById(newCard.id, userId);
  }

  async toggleAssignMember(cardId: string, userId: string, memberIdOrUserId: string) {
    const { data: card } = await this.supabase
      .from('cards')
      .select('id, title, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    const boardId = (card.list as any)?.board_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId);
    }

    const { data: bForWs } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();
    const wsIdForToggle = bForWs?.workspace_id;

    // 1. Tìm bản ghi board_members tương ứng (theo id hoặc user_id)
    let bMember: any = null;
    const { data: foundById } = await this.supabase
      .from('board_members')
      .select('id, board_id, role, user:users (id, name, email, avatar)')
      .eq('id', memberIdOrUserId)
      .eq('board_id', boardId)
      .maybeSingle();

    if (foundById) {
      bMember = foundById;
    } else {
      const { data: foundByUserId } = await this.supabase
        .from('board_members')
        .select('id, board_id, role, user:users (id, name, email, avatar)')
        .eq('user_id', memberIdOrUserId)
        .eq('board_id', boardId)
        .maybeSingle();

      if (foundByUserId) {
        bMember = foundByUserId;
      }
    }

    // 2. Nếu chưa có trong board_members nhưng thuộc workspace, tự động thêm vào board_members
    if (!bMember && wsIdForToggle) {
      let targetUserId = memberIdOrUserId;

      const { data: wsMember } = await this.supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', wsIdForToggle)
        .or(`id.eq.${memberIdOrUserId},user_id.eq.${memberIdOrUserId}`)
        .maybeSingle();

      if (wsMember) {
        targetUserId = wsMember.user_id;
      } else {
        const { data: ws } = await this.supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', wsIdForToggle)
          .maybeSingle();

        if (ws?.owner_id === memberIdOrUserId) {
          targetUserId = ws.owner_id;
        } else {
          throw new BadRequestException('Thành viên không thuộc về bảng hoặc không gian làm việc này');
        }
      }

      // Thêm vào board_members
      const { data: addedBM, error: addErr } = await this.supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: targetUserId,
          role: 'EDITOR',
        })
        .select('id, board_id, role, user:users (id, name, email, avatar)')
        .single();

      if (addErr || !addedBM) {
        throw new BadRequestException('Không thể liên kết thành viên vào bảng');
      }

      bMember = addedBM;
    }

    if (!bMember) {
      throw new BadRequestException('Thành viên không thuộc về bảng này');
    }

    const effectiveBoardMemberId = bMember.id;

    // Check if already assigned
    const { data: existing } = await this.supabase
      .from('card_assignees')
      .select('id')
      .eq('card_id', cardId)
      .eq('board_member_id', effectiveBoardMemberId)
      .maybeSingle();

    if (existing) {
      await this.supabase
        .from('card_assignees')
        .delete()
        .eq('id', existing.id);

      if (wsIdForToggle) {
        await this.activitiesService.logActivity({
          workspaceId: wsIdForToggle,
          userId,
          action: `đã hủy gán thẻ cho "${(bMember as any)?.user?.name || 'thành viên'}"`,
          targetType: `card:${cardId}`,
        });
      }

      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId,
          senderId: userId,
        });
      }

      return { assigned: false, board_member_id: effectiveBoardMemberId };
    } else {
      const { data: newAssignee, error } = await this.supabase
        .from('card_assignees')
        .insert({
          card_id: cardId,
          board_member_id: effectiveBoardMemberId,
        })
        .select(`
          id,
          board_member_id,
          assigned_at,
          board_member:board_members (
            id,
            role,
            user:users (id, name, email, avatar)
          )
        `)
        .single();

      if (error || !newAssignee) {
        throw new BadRequestException('Không thể gán thành viên vào thẻ');
      }

      if (wsIdForToggle) {
        await this.activitiesService.logActivity({
          workspaceId: wsIdForToggle,
          userId,
          action: `đã gán thẻ cho "${(bMember as any)?.user?.name || 'thành viên'}"`,
          targetType: `card:${cardId}`,
        });
      }

      // Gửi thông báo phân công thẻ nếu người được gán khác người thực hiện
      const targetUserId = (bMember as any)?.user?.id;
      if (targetUserId && targetUserId !== userId) {
        const cardTitle = card.title || 'Thẻ';
        await this.notificationsService.createNotification({
          userId: targetUserId,
          title: `Phân công thẻ mới`,
          message: `Bạn đã được phân công vào thẻ "${cardTitle}"||/boards/${boardId}?cardId=${cardId}`,
          type: 'ASSIGN',
        }).catch(() => {});
      }

      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId,
          senderId: userId,
        });
      }

      return { assigned: true, assignee: newAssignee };
    }
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
