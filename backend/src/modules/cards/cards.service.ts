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
import { AutomationsService } from '../automations/automations.service';

@Injectable()
export class CardsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
    private readonly automationsService: AutomationsService,
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

    const boardId = list.board_id;
    const workspaceId = (list.board as any)?.workspace_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId, true);
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

      // Kích hoạt Automation (CARD_CREATED)
      this.automationsService
        .triggerByEvent(
          list.board_id,
          'CARD_CREATED',
          {
            cardId: createdCard.id,
            listId,
            cardData: createdCard,
          },
          userId,
        )
        .catch(() => {});
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
        list:lists (id, title, board_id, board:boards (id, name, visibility, workspace_id)),
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
            user_id,
            user:users (id, name, email, avatar)
          )
        ),
        card_labels (
          label:labels (id, name, color)
        ),
        card_assignees (
          id,
          card_id,
          user_id,
          assigned_at,
          user:users (id, name, email, avatar)
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
        ),
        custom_field_values (
          id,
          card_id,
          field_id,
          value,
          field:custom_fields (
            id,
            board_id,
            name,
            field_type
          )
        )
      `)
      .eq('id', cardId)
      .maybeSingle();

    if (error) {
      const fallback = await this.supabase
        .from('cards')
        .select(`
          *,
          list:lists (id, title, board_id, board:boards (id, name, visibility, workspace_id)),
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
            id,
            card_id,
            user_id,
            assigned_at,
            user:users (id, name, email, avatar)
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
          ),
          custom_field_values (
            id,
            card_id,
            field_id,
            value,
            field:custom_fields (
              id,
              board_id,
              name,
              field_type
            )
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
      await this.verifyBoardAccess(boardId, userId, false);
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
      await this.verifyBoardAccess(boardId, userId, true);
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
            user_id,
            user:users (id, name, email, avatar)
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

      // Kích hoạt Automation khi hoàn thành thẻ
      if (dto.is_due_date_completed === true || dto.status === 'DONE') {
        this.automationsService
          .triggerByEvent(
            boardId,
            'CARD_COMPLETED',
            {
              cardId,
              listId: card.list_id,
              cardData: updated,
            },
            userId,
          )
          .catch(() => {});
      }

      // Kích hoạt Automation khi đổi ngày hết hạn
      if (dto.due_date !== undefined) {
        this.automationsService
          .triggerByEvent(
            boardId,
            'CARD_DUE_DATE_CHANGED',
            {
              cardId,
              listId: card.list_id,
              cardData: updated,
            },
            userId,
          )
          .catch(() => {});
      }
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
      await this.verifyBoardAccess(boardId, userId, true);
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
    await this.verifyBoardAccess(sourceBoardId, userId, true);
    await this.verifyBoardAccess(targetList.board_id, userId, true);

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

    // Kích hoạt Automation khi di chuyển thẻ (CARD_MOVED)
    if (sourceBoardId) {
      this.automationsService
        .triggerByEvent(
          sourceBoardId,
          'CARD_MOVED',
          {
            cardId,
            sourceListId: sourceCard.list_id,
            targetListId: dto.targetListId,
          },
          userId,
        )
        .catch(() => {});
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
    await this.verifyBoardAccess(sourceBoardId, userId, true);

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

    // Clone custom field values
    const { data: cfValues } = await this.supabase
      .from('custom_field_values')
      .select('field_id, value')
      .eq('card_id', sourceCard.id);

    if (cfValues && cfValues.length > 0) {
      const newCfValues = cfValues.map((cf: any) => ({
        card_id: newCard.id,
        field_id: cf.field_id,
        value: cf.value,
      }));
      await this.supabase.from('custom_field_values').insert(newCfValues);
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
      await this.verifyBoardAccess(boardId, userId, true);
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
      .select('id, board_id, user_id, role, user:users (id, name, email, avatar)')
      .eq('id', memberIdOrUserId)
      .eq('board_id', boardId)
      .maybeSingle();

    if (foundById) {
      bMember = foundById;
    } else {
      const { data: foundByUserId } = await this.supabase
        .from('board_members')
        .select('id, board_id, user_id, role, user:users (id, name, email, avatar)')
        .eq('user_id', memberIdOrUserId)
        .eq('board_id', boardId)
        .maybeSingle();

      if (foundByUserId) {
        bMember = foundByUserId;
      }
    }

    let targetUserId: string | null = null;
    let targetUserName = 'thành viên';
    let effectiveBoardMemberId: string | null = null;

    if (bMember) {
      if (bMember.role === 'VIEWER') {
        throw new BadRequestException('Thành viên có vai trò Người xem (Viewer) không thể nhận nhiệm vụ.');
      }
      targetUserId = bMember.user?.id || bMember.user_id;
      targetUserName = bMember.user?.name || 'thành viên';
      effectiveBoardMemberId = bMember.id;
    } else {
      // 2. Không thuộc board_members: Cho phép gán thành viên Workspace trực tiếp (bảng WORKSPACE hoặc PUBLIC, hoặc Workspace Owner)
      const { data: bInfo } = await this.supabase
        .from('boards')
        .select('id, workspace_id, visibility, workspace:workspaces (owner_id)')
        .eq('id', boardId)
        .maybeSingle();

      if (!bInfo?.workspace_id) {
        throw new BadRequestException('Bảng này không thuộc Không gian làm việc nào.');
      }

      // Kiểm tra xem user có thuộc Workspace không
      const { data: wsMember } = await this.supabase
        .from('workspace_members')
        .select('id, user_id, role, user:users (id, name, email, avatar)')
        .eq('workspace_id', bInfo.workspace_id)
        .eq('user_id', memberIdOrUserId)
        .maybeSingle();

      let wsUser: any = Array.isArray(wsMember?.user) ? wsMember.user[0] : wsMember?.user;
      let isWsOwner = false;

      // Kiểm tra xem có phải là workspace owner không
      const wsOwnerId = (bInfo.workspace as any)?.owner_id;
      if (wsOwnerId && wsOwnerId === memberIdOrUserId) {
        isWsOwner = true;
      }

      if (!wsUser) {
        const { data: wsOwner } = await this.supabase
          .from('workspaces')
          .select('owner:users (id, name, email, avatar)')
          .eq('id', bInfo.workspace_id)
          .eq('owner_id', memberIdOrUserId)
          .maybeSingle();
        wsUser = Array.isArray((wsOwner as any)?.owner) ? (wsOwner as any).owner[0] : (wsOwner as any)?.owner;
        if (wsUser) isWsOwner = true;
      }

      if (!wsUser) {
        throw new BadRequestException('Người dùng này không thuộc Không gian làm việc.');
      }

      if (bInfo && bInfo.visibility === 'PRIVATE' && !isWsOwner) {
        throw new BadRequestException('Bảng này là bảng Riêng tư. Chỉ có thể phân công thành viên đã tham gia bảng.');
      }

      targetUserId = wsUser.id;
      targetUserName = wsUser.name;
      effectiveBoardMemberId = null;
    }

    // 3. Kiểm tra xem đã gán chưa theo user_id
    let existing: any = null;
    if (targetUserId) {
      const { data: exUser } = await this.supabase
        .from('card_assignees')
        .select('id')
        .eq('card_id', cardId)
        .eq('user_id', targetUserId)
        .maybeSingle();
      existing = exUser;
    }

    // Fallback kiểm tra theo board_member_id nếu schema cũ chưa migrate
    if (!existing && effectiveBoardMemberId) {
      const { data: exBm } = await this.supabase
        .from('card_assignees')
        .select('id')
        .eq('card_id', cardId)
        .eq('board_member_id', effectiveBoardMemberId)
        .maybeSingle();
      existing = exBm;
    }

    if (existing) {
      await this.supabase
        .from('card_assignees')
        .delete()
        .eq('id', existing.id);

      if (wsIdForToggle) {
        await this.activitiesService.logActivity({
          workspaceId: wsIdForToggle,
          userId,
          action: `đã hủy gán thẻ cho "${targetUserName}"`,
          targetType: `card:${cardId}`,
        });
      }

      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId,
          senderId: userId,
        });
      }

      return { assigned: false, user_id: targetUserId };
    } else {
      const insertPayload: any = {
        card_id: cardId,
        user_id: targetUserId,
      };

      let { data: newAssignee, error } = await this.supabase
        .from('card_assignees')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (error) {
        // Fallback nếu database chưa xóa cột board_member_id và chưa có user_id
        if (effectiveBoardMemberId) {
          const fallbackRes = await this.supabase
            .from('card_assignees')
            .insert({ card_id: cardId, board_member_id: effectiveBoardMemberId })
            .select('*')
            .maybeSingle();
          newAssignee = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error) {
          if (error.message?.includes('user_id') || error.message?.includes('board_member_id')) {
            throw new BadRequestException(
              'Để gán trực tiếp thành viên Workspace mà không cần thêm vào Bảng, vui lòng chạy file migration SQL: "database/migration_card_assignees_user_id.sql"'
            );
          }
          throw new BadRequestException(error.message || 'Không thể gán thành viên vào thẻ');
        }
      }

      // Thông báo cho người được phân công
      if (targetUserId && targetUserId !== userId) {
        await this.notificationsService.createNotification({
          userId: targetUserId,
          title: 'Bạn được phân công một thẻ mới',
          message: `Bạn đã được phân công vào thẻ trong bảng`,
          type: 'CARD_ASSIGNED',
        });
      }

      if (wsIdForToggle) {
        await this.activitiesService.logActivity({
          workspaceId: wsIdForToggle,
          userId,
          action: `đã phân công thẻ cho "${targetUserName}"`,
          targetType: `card:${cardId}`,
        });
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

  private async verifyBoardAccess(boardId: string, userId: string, requireEdit = false) {
    const { data: board } = await this.supabase
      .from('boards')
      .select('id, workspace_id, visibility, workspace:workspaces (owner_id)')
      .eq('id', boardId)
      .maybeSingle();

    if (!board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    const isWorkspaceOwner = (board.workspace as any)?.owner_id === userId;
    if (isWorkspaceOwner) {
      return { role: 'ADMIN', canEdit: true };
    }

    // 1. Kiểm tra trực tiếp trong board_members
    const { data: boardMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (boardMember) {
      const role = boardMember.role;
      const canEdit = role === 'ADMIN' || role === 'EDITOR' || role === 'MEMBER';
      if (requireEdit && !canEdit) {
        throw new ForbiddenException('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa Board này');
      }
      return { role, canEdit };
    }

    // 2. Kiểm tra trong workspace_members
    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (wsMember) {
      if (board.visibility === 'PRIVATE') {
        throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
      }

      if (wsMember.role === 'ADMIN') {
        return { role: 'ADMIN', canEdit: true };
      }

      if (requireEdit) {
        throw new ForbiddenException('Bạn chưa tham gia vào Bảng này, chỉ có quyền xem');
      }
      return { role: 'VIEWER', canEdit: false };
    }

    if (board.visibility === 'PUBLIC' && !requireEdit) {
      return { role: 'VIEWER', canEdit: false };
    }

    throw new ForbiddenException('Bạn không có quyền thao tác trên Board này');
  }
}
