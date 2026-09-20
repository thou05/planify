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
      .select('board_id, board:boards (workspace_id)')
      .eq('id', listId)
      .maybeSingle();

    if (lError || !list) {
      throw new NotFoundException('Không tìm thấy danh sách (List)');
    }

    const workspaceId = (list.board as any)?.workspace_id;
    if (workspaceId) {
      await this.verifyWorkspaceAccess(workspaceId, userId);
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
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    await this.verifyBoardAccess(card.list.board_id, userId);

    return card;
  }

  async update(cardId: string, userId: string, dto: UpdateCardDto) {
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

    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.start_date !== undefined) updateData.start_date = dto.start_date;
    if (dto.due_date !== undefined) updateData.due_date = dto.due_date;
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
      .select('id, board_id')
      .eq('id', dto.targetListId)
      .maybeSingle();

    if (!targetList) {
      throw new NotFoundException('Không tìm thấy danh sách đích');
    }

    const sourceBoardId = (sourceCard.list as any)?.board_id;
    await this.verifyBoardAccess(sourceBoardId, userId);
    await this.verifyBoardAccess(targetList.board_id, userId);

    const isSameList = sourceCard.list_id === dto.targetListId;
    const oldPosition = sourceCard.position;
    const newPosition = dto.position;

    if (isSameList) {
      if (oldPosition !== newPosition) {
        if (oldPosition < newPosition) {
          // Moving down: shift items between oldPosition+1 and newPosition down (decrease by 1)
          const { data: itemsToShift } = await this.supabase
            .from('cards')
            .select('id, position')
            .eq('list_id', sourceCard.list_id)
            .gt('position', oldPosition)
            .lte('position', newPosition);

          if (itemsToShift) {
            for (const item of itemsToShift) {
              await this.supabase
                .from('cards')
                .update({ position: item.position - 1 })
                .eq('id', item.id);
            }
          }
        } else {
          // Moving up: shift items between newPosition and oldPosition-1 up (increase by 1)
          const { data: itemsToShift } = await this.supabase
            .from('cards')
            .select('id, position')
            .eq('list_id', sourceCard.list_id)
            .gte('position', newPosition)
            .lt('position', oldPosition);

          if (itemsToShift) {
            for (const item of itemsToShift) {
              await this.supabase
                .from('cards')
                .update({ position: item.position + 1 })
                .eq('id', item.id);
            }
          }
        }

        await this.supabase
          .from('cards')
          .update({ position: newPosition })
          .eq('id', cardId);
      }
    } else {
      // Moving to different list
      // 1. Shift remaining items in source list down
      const { data: sourceItemsToShift } = await this.supabase
        .from('cards')
        .select('id, position')
        .eq('list_id', sourceCard.list_id)
        .gt('position', oldPosition);

      if (sourceItemsToShift) {
        for (const item of sourceItemsToShift) {
          await this.supabase
            .from('cards')
            .update({ position: item.position - 1 })
            .eq('id', item.id);
        }
      }

      // 2. Shift items in target list at >= newPosition up
      const { data: targetItemsToShift } = await this.supabase
        .from('cards')
        .select('id, position')
        .eq('list_id', dto.targetListId)
        .gte('position', newPosition);

      if (targetItemsToShift) {
        for (const item of targetItemsToShift) {
          await this.supabase
            .from('cards')
            .update({ position: item.position + 1 })
            .eq('id', item.id);
        }
      }

      // 3. Move card to target list
      await this.supabase
        .from('cards')
        .update({
          list_id: dto.targetListId,
          position: newPosition,
        })
        .eq('id', cardId);
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
