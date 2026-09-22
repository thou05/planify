import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ReorderListsDto } from './dto/reorder-lists.dto';
import { CopyListDto } from './dto/copy-list.dto';
import { MoveAllCardsDto } from './dto/move-all-cards.dto';
import { SortCardsDto } from './dto/sort-cards.dto';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class ListsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

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

    const { data: board } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (board?.workspace_id) {
      await this.activitiesService.logActivity({
        workspaceId: board.workspace_id,
        userId,
        action: `đã tạo danh sách "${list.title}"`,
        targetType: `board:${boardId}`,
      });
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
    if (dto.title !== undefined) updateData.title = dto.title.trim();
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

    const { data: board } = await this.supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', list.board_id)
      .maybeSingle();

    if (board?.workspace_id && dto.title) {
      await this.activitiesService.logActivity({
        workspaceId: board.workspace_id,
        userId,
        action: `đã đổi tên danh sách thành "${dto.title.trim()}"`,
        targetType: `board:${list.board_id}`,
      });
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

  async reorder(boardId: string, userId: string, dto: ReorderListsDto) {
    await this.verifyBoardAccess(boardId, userId);

    // Update each list position
    const updates = dto.listIds.map((id, index) =>
      this.supabase
        .from('lists')
        .update({ position: index })
        .eq('id', id)
        .eq('board_id', boardId)
    );

    await Promise.all(updates);

    return { message: 'Cập nhật thứ tự danh sách thành công' };
  }

  async copy(listId: string, userId: string, dto: CopyListDto) {
    // Fetch source list with cards
    const { data: sourceList, error: lError } = await this.supabase
      .from('lists')
      .select(`
        id,
        board_id,
        title,
        position,
        limit,
        cards (
          id,
          title,
          description,
          position,
          status,
          start_date,
          due_date,
          is_due_date_completed,
          checklists (
            id,
            title,
            position,
            items:checklist_items (
              content,
              is_completed,
              position
            )
          )
        )
      `)
      .eq('id', listId)
      .maybeSingle();

    if (lError || !sourceList) {
      throw new NotFoundException('Không tìm thấy danh sách cần sao chép');
    }

    await this.verifyBoardAccess(sourceList.board_id, userId);

    // Calculate new position (insert right after original list)
    const newPosition = sourceList.position + 1;

    // Shift subsequent lists
    const { data: listsToShift } = await this.supabase
      .from('lists')
      .select('id, position')
      .eq('board_id', sourceList.board_id)
      .gte('position', newPosition);

    if (listsToShift && listsToShift.length > 0) {
      for (const item of listsToShift) {
        await this.supabase
          .from('lists')
          .update({ position: item.position + 1 })
          .eq('id', item.id);
      }
    }

    // 1. Create new list
    const newTitle = dto.title?.trim() || `${sourceList.title} (Bản sao)`;
    const { data: newList, error: nError } = await this.supabase
      .from('lists')
      .insert({
        board_id: sourceList.board_id,
        title: newTitle,
        position: newPosition,
        limit: sourceList.limit,
      })
      .select()
      .single();

    if (nError || !newList) {
      throw new BadRequestException('Không thể tạo bản sao danh sách');
    }

    // 2. Clone cards if any
    const sourceCards = (sourceList.cards || []).sort((a: any, b: any) => a.position - b.position);
    const createdCards: any[] = [];

    for (const card of sourceCards) {
      const { data: newCard } = await this.supabase
        .from('cards')
        .insert({
          list_id: newList.id,
          title: card.title,
          description: card.description,
          position: card.position,
          status: card.status || 'TODO',
          start_date: card.start_date,
          due_date: card.due_date,
          is_due_date_completed: card.is_due_date_completed || false,
          created_by: userId,
        })
        .select()
        .single();

      if (newCard) {
        // Clone checklists if any
        if (card.checklists && card.checklists.length > 0) {
          for (const cl of card.checklists) {
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
        createdCards.push(newCard);
      }
    }

    return {
      ...newList,
      cards: createdCards,
    };
  }

  async moveAllCards(listId: string, userId: string, dto: MoveAllCardsDto) {
    const { data: sourceList } = await this.supabase
      .from('lists')
      .select('board_id')
      .eq('id', listId)
      .maybeSingle();

    if (!sourceList) {
      throw new NotFoundException('Không tìm thấy danh sách nguồn');
    }

    const { data: targetList } = await this.supabase
      .from('lists')
      .select('board_id')
      .eq('id', dto.targetListId)
      .maybeSingle();

    if (!targetList) {
      throw new NotFoundException('Không tìm thấy danh sách đích');
    }

    await this.verifyBoardAccess(sourceList.board_id, userId);
    await this.verifyBoardAccess(targetList.board_id, userId);

    if (listId === dto.targetListId) {
      return { message: 'Danh sách nguồn và đích trùng nhau' };
    }

    // Get max position in target list
    const { data: maxCard } = await this.supabase
      .from('cards')
      .select('position')
      .eq('list_id', dto.targetListId)
      .order('position', { ascending: false })
      .limit(1);

    let startPos = (maxCard?.[0]?.position ?? -1) + 1;

    // Get cards in source list
    const { data: sourceCards } = await this.supabase
      .from('cards')
      .select('id')
      .eq('list_id', listId)
      .order('position', { ascending: true });

    if (sourceCards && sourceCards.length > 0) {
      for (const card of sourceCards) {
        await this.supabase
          .from('cards')
          .update({
            list_id: dto.targetListId,
            position: startPos++,
          })
          .eq('id', card.id);
      }
    }

    return { message: 'Đã di chuyển toàn bộ thẻ thành công' };
  }

  async sortCards(listId: string, userId: string, dto: SortCardsDto) {
    const { data: list } = await this.supabase
      .from('lists')
      .select('board_id')
      .eq('id', listId)
      .maybeSingle();

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    await this.verifyBoardAccess(list.board_id, userId);

    const { data: cards, error } = await this.supabase
      .from('cards')
      .select('id, title, due_date, position')
      .eq('list_id', listId);

    if (error || !cards) {
      throw new BadRequestException('Không thể lấy danh sách thẻ');
    }

    const orderMult = dto.order === 'desc' ? -1 : 1;

    cards.sort((a, b) => {
      if (dto.sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1; // cards without due date at bottom
        if (!b.due_date) return -1;
        return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * orderMult;
      }
      if (dto.sortBy === 'title') {
        return a.title.localeCompare(b.title, 'vi', { sensitivity: 'base' }) * orderMult;
      }
      // default: position or created_at
      return ((a.position ?? 0) - (b.position ?? 0)) * orderMult;
    });

    for (let i = 0; i < cards.length; i++) {
      await this.supabase
        .from('cards')
        .update({ position: i })
        .eq('id', cards[i].id);
    }

    return { message: 'Sắp xếp danh sách thẻ thành công' };
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
