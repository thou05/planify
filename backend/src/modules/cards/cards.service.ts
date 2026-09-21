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

@Injectable()
export class CardsService {
  constructor(private readonly supabase: SupabaseService) {}

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

    return {
      ...card,
      checklists: [],
      card_labels: [],
      comments: [],
      card_assignees: [],
    };
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
    const { data: card, error } = await this.supabase
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

    const { data: updated, error } = await this.supabase
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
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật thẻ');
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

    return this.findById(newCard.id, userId);
  }

  async toggleAssignMember(cardId: string, userId: string, boardMemberId: string) {
    const { data: card } = await this.supabase
      .from('cards')
      .select('id, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    const boardId = (card.list as any)?.board_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId);
    }

    // Verify boardMemberId belongs to this board
    const { data: bMember } = await this.supabase
      .from('board_members')
      .select('id, board_id, role, user:users (id, name, email, avatar)')
      .eq('id', boardMemberId)
      .eq('board_id', boardId)
      .maybeSingle();

    if (!bMember) {
      throw new BadRequestException('Thành viên không thuộc về bảng này');
    }

    // Check if already assigned
    const { data: existing } = await this.supabase
      .from('card_assignees')
      .select('id')
      .eq('card_id', cardId)
      .eq('board_member_id', boardMemberId)
      .maybeSingle();

    if (existing) {
      await this.supabase
        .from('card_assignees')
        .delete()
        .eq('id', existing.id);

      return { assigned: false, board_member_id: boardMemberId };
    } else {
      const { data: newAssignee, error } = await this.supabase
        .from('card_assignees')
        .insert({
          card_id: cardId,
          board_member_id: boardMemberId,
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
