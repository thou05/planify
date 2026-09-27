import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { ActivitiesService } from '../activities/activities.service';
import { CardRelationType, CreateCardRelationDto } from './dto/create-card-relation.dto';

export const INVERSE_RELATION_MAP: Record<CardRelationType, CardRelationType> = {
  [CardRelationType.BLOCKS]: CardRelationType.BLOCKED_BY,
  [CardRelationType.BLOCKED_BY]: CardRelationType.BLOCKS,
  [CardRelationType.PARENT]: CardRelationType.SUBTASK,
  [CardRelationType.SUBTASK]: CardRelationType.PARENT,
  [CardRelationType.RELATES_TO]: CardRelationType.RELATES_TO,
  [CardRelationType.DUPLICATE]: CardRelationType.DUPLICATE,
};

const RELATION_ACTION_NAMES: Record<CardRelationType, string> = {
  [CardRelationType.BLOCKS]: 'chặn thẻ',
  [CardRelationType.BLOCKED_BY]: 'bị chặn bởi thẻ',
  [CardRelationType.PARENT]: 'là thẻ cha của thẻ',
  [CardRelationType.SUBTASK]: 'là thẻ con của thẻ',
  [CardRelationType.RELATES_TO]: 'liên quan đến thẻ',
  [CardRelationType.DUPLICATE]: 'trùng lặp với thẻ',
};

@Injectable()
export class CardRelationsService {
  private readonly logger = new Logger(CardRelationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  private async verifyBoardAccess(boardId: string, userId: string) {
    const { data: board, error } = await this.supabase
      .from('boards')
      .select('id, workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Bảng (Board)');
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
        throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
      }
    }

    return board;
  }

  private async verifyCardAccess(cardId: string, userId: string) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, title, list:lists (id, title, board_id, board:boards (id, name, workspace_id))')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const boardId = (card.list as any)?.board_id;
    let workspaceId = '';
    if (boardId) {
      const b = await this.verifyBoardAccess(boardId, userId);
      workspaceId = b.workspace_id;
    }

    return { card, boardId, workspaceId };
  }

  /**
   * Lấy danh sách tất cả quan hệ của một thẻ
   */
  async getCardRelations(cardId: string, userId: string) {
    await this.verifyCardAccess(cardId, userId);

    const { data: relations, error } = await this.supabase
      .from('card_relations')
      .select(`
        id,
        card_id,
        related_card_id,
        type,
        related_card:cards!fk_card_relation_target (
          id,
          title,
          status,
          start_date,
          due_date,
          is_due_date_completed,
          list_id,
          list:lists (
            id,
            title,
            board_id,
            board:boards (
              id,
              name,
              workspace_id
            )
          ),
          card_assignees (
            board_member:board_members (
              id,
              role,
              user:users (
                id,
                name,
                avatar,
                email
              )
            )
          ),
          card_labels (
            label:labels (
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('card_id', cardId);

    if (error) {
      this.logger.error(`Error getting card relations: ${error.message}`);
      throw new BadRequestException(error.message || 'Không thể lấy danh sách quan hệ thẻ');
    }

    return relations || [];
  }

  /**
   * Kiểm tra chu trình phụ thuộc bằng DFS (Cycle Detection)
   * Trả về true nếu phát hiện vòng lặp (cycle)
   */
  private async detectCycle(
    startNode: string,
    targetNode: string,
    relationType: 'BLOCKS' | 'PARENT',
  ): Promise<boolean> {
    // Lấy tất cả các quan hệ loại `relationType` trong hệ thống
    const { data: edges, error } = await this.supabase
      .from('card_relations')
      .select('card_id, related_card_id')
      .eq('type', relationType);

    if (error || !edges) {
      return false;
    }

    // Xây dựng đồ thị có hướng (Adjacency List)
    const adjMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjMap.has(edge.card_id)) {
        adjMap.set(edge.card_id, []);
      }
      adjMap.get(edge.card_id)!.push(edge.related_card_id);
    }

    // DFS từ startNode để kiểm tra có thể đi tới targetNode hay không
    const visited = new Set<string>();
    const stack: string[] = [startNode];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === targetNode) {
        return true; // Phát hiện chu trình!
      }

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adjMap.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }

    return false;
  }

  /**
   * Tạo quan hệ giữa 2 thẻ (kèm kiểm tra chu trình và tạo quan hệ 2 chiều đối ứng)
   */
  async createCardRelation(cardId: string, userId: string, dto: CreateCardRelationDto) {
    if (cardId === dto.relatedCardId) {
      throw new BadRequestException('Không thể tạo quan hệ giữa thẻ với chính nó');
    }

    // Xác thực quyền truy cập cả 2 thẻ
    const { card: sourceCard, boardId, workspaceId } = await this.verifyCardAccess(cardId, userId);
    const { card: targetCard } = await this.verifyCardAccess(dto.relatedCardId, userId);

    // Kiểm tra xem quan hệ đã tồn tại chưa
    const { data: existing } = await this.supabase
      .from('card_relations')
      .select('id')
      .eq('card_id', cardId)
      .eq('related_card_id', dto.relatedCardId)
      .eq('type', dto.type)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Mối quan hệ này giữa 2 thẻ đã tồn tại');
    }

    // Kiểm tra chu trình phụ thuộc (Cycle Protection)
    if (dto.type === CardRelationType.BLOCKS) {
      // Đang muốn thêm edge: cardId -> relatedCardId
      // Kiểm tra xem relatedCardId có thể đi tới cardId qua các cạnh BLOCKS không
      const hasCycle = await this.detectCycle(dto.relatedCardId, cardId, 'BLOCKS');
      if (hasCycle) {
        throw new BadRequestException(
          'Không thể tạo liên kết do phát hiện vòng lặp chu trình (Thẻ mục tiêu đã phụ thuộc vào thẻ này)',
        );
      }
    } else if (dto.type === CardRelationType.BLOCKED_BY) {
      // Tương đương: relatedCardId -> cardId (BLOCKS)
      // Kiểm tra xem cardId có thể đi tới relatedCardId qua các cạnh BLOCKS không
      const hasCycle = await this.detectCycle(cardId, dto.relatedCardId, 'BLOCKS');
      if (hasCycle) {
        throw new BadRequestException(
          'Không thể tạo liên kết do phát hiện vòng lặp chu trình (Thẻ này đã phụ thuộc vào thẻ mục tiêu)',
        );
      }
    } else if (dto.type === CardRelationType.PARENT) {
      // Đang muốn thêm edge: cardId -> relatedCardId (PARENT)
      // Kiểm tra xem relatedCardId có thể đi tới cardId qua các cạnh PARENT không (tránh cha là con của con)
      const hasCycle = await this.detectCycle(dto.relatedCardId, cardId, 'PARENT');
      if (hasCycle) {
        throw new BadRequestException(
          'Không thể tạo liên kết do phát hiện vòng lặp phân cấp (Thẻ mục tiêu đã là tổ tiên của thẻ này)',
        );
      }
    } else if (dto.type === CardRelationType.SUBTASK) {
      // Tương đương: relatedCardId -> cardId (PARENT)
      const hasCycle = await this.detectCycle(cardId, dto.relatedCardId, 'PARENT');
      if (hasCycle) {
        throw new BadRequestException(
          'Không thể tạo liên kết do phát hiện vòng lặp phân cấp (Thẻ này đã là tổ tiên của thẻ mục tiêu)',
        );
      }
    }

    const inverseType = INVERSE_RELATION_MAP[dto.type];

    // Thêm quan hệ chính
    const { data: relation, error } = await this.supabase
      .from('card_relations')
      .insert({
        card_id: cardId,
        related_card_id: dto.relatedCardId,
        type: dto.type,
      })
      .select(`
        id,
        card_id,
        related_card_id,
        type,
        related_card:cards!fk_card_relation_target (
          id,
          title,
          status,
          start_date,
          due_date,
          is_due_date_completed,
          list_id,
          list:lists (
            id,
            title,
            board_id,
            board:boards (
              id,
              name,
              workspace_id
            )
          ),
          card_assignees (
            board_member:board_members (
              id,
              role,
              user:users (
                id,
                name,
                avatar,
                email
              )
            )
          ),
          card_labels (
            label:labels (
              id,
              name,
              color
            )
          )
        )
      `)
      .single();

    if (error || !relation) {
      this.logger.error(`Error creating card relation: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Không thể tạo mối quan hệ thẻ');
    }

    // Thêm quan hệ đối ứng (nếu chưa có)
    const { data: existingInverse } = await this.supabase
      .from('card_relations')
      .select('id')
      .eq('card_id', dto.relatedCardId)
      .eq('related_card_id', cardId)
      .eq('type', inverseType)
      .maybeSingle();

    if (!existingInverse) {
      await this.supabase.from('card_relations').insert({
        card_id: dto.relatedCardId,
        related_card_id: cardId,
        type: inverseType,
      });
    }

    // Ghi nhận Activity Log
    if (workspaceId) {
      const actionText = RELATION_ACTION_NAMES[dto.type] || 'liên kết với thẻ';
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã đặt quan hệ ${actionText} "${targetCard.title}"`,
        targetType: `card:${cardId}`,
      });
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId: dto.relatedCardId,
        senderId: userId,
      });
    }

    return relation;
  }

  /**
   * Xóa một mối quan hệ thẻ và quan hệ đối ứng
   */
  async deleteCardRelation(cardId: string, relationId: string, userId: string) {
    const { card, boardId, workspaceId } = await this.verifyCardAccess(cardId, userId);

    // Lấy thông tin quan hệ cần xóa
    const { data: relation, error } = await this.supabase
      .from('card_relations')
      .select('id, card_id, related_card_id, type')
      .eq('id', relationId)
      .maybeSingle();

    if (error || !relation) {
      throw new NotFoundException('Không tìm thấy mối quan hệ cần xóa');
    }

    if (relation.card_id !== cardId) {
      throw new BadRequestException('Mối quan hệ không thuộc thẻ này');
    }

    const inverseType = INVERSE_RELATION_MAP[relation.type as CardRelationType];

    // Xóa quan hệ đối ứng nếu có
    if (inverseType) {
      await this.supabase
        .from('card_relations')
        .delete()
        .eq('card_id', relation.related_card_id)
        .eq('related_card_id', relation.card_id)
        .eq('type', inverseType);
    }

    // Xóa bản ghi quan hệ chính
    const { error: delError } = await this.supabase
      .from('card_relations')
      .delete()
      .eq('id', relationId);

    if (delError) {
      throw new BadRequestException(delError.message || 'Không thể xóa quan hệ thẻ');
    }

    // Ghi nhận activity log
    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: 'đã gỡ bỏ một mối quan hệ thẻ',
        targetType: `card:${cardId}`,
      });
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
      if (relation.related_card_id) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId: relation.related_card_id,
          senderId: userId,
        });
      }
    }

    return { success: true, message: 'Đã xóa mối quan hệ thành công' };
  }

  /**
   * Tìm kiếm các thẻ ứng viên để thêm quan hệ (cùng Workspace hoặc Bảng)
   */
  async searchCandidateCards(cardId: string, query: string = '', userId: string) {
    const { workspaceId } = await this.verifyCardAccess(cardId, userId);

    // Lấy danh sách ID các thẻ đã được liên kết với thẻ hiện tại để loại trừ
    const { data: existingRelations } = await this.supabase
      .from('card_relations')
      .select('related_card_id')
      .eq('card_id', cardId);

    const excludedIds = new Set<string>([cardId]);
    if (existingRelations) {
      for (const r of existingRelations) {
        if (r.related_card_id) {
          excludedIds.add(r.related_card_id);
        }
      }
    }

    // Lấy tất cả các board trong workspace
    const { data: boards } = await this.supabase
      .from('boards')
      .select('id')
      .eq('workspace_id', workspaceId);

    const boardIds = boards?.map((b) => b.id) || [];
    if (boardIds.length === 0) {
      return [];
    }

    // Lấy các danh sách (lists) trong các boards này
    const { data: lists } = await this.supabase
      .from('lists')
      .select('id')
      .in('board_id', boardIds);

    const listIds = lists?.map((l) => l.id) || [];
    if (listIds.length === 0) {
      return [];
    }

    // Truy vấn cards
    let cardQuery = this.supabase
      .from('cards')
      .select(`
        id,
        title,
        status,
        due_date,
        is_due_date_completed,
        list_id,
        list:lists (
          id,
          title,
          board_id,
          board:boards (
            id,
            name
          )
        )
      `)
      .in('list_id', listIds)
      .order('position', { ascending: true })
      .limit(50);

    const trimmed = (query || '').trim();
    if (trimmed) {
      cardQuery = cardQuery.ilike('title', `%${trimmed}%`);
    }

    const { data: cards, error } = await cardQuery;

    if (error) {
      this.logger.error(`Error searching candidate cards: ${error.message}`);
      return [];
    }

    // Lọc bỏ các card nằm trong danh sách loại trừ
    return (cards || []).filter((c) => !excludedIds.has(c.id));
  }
}
