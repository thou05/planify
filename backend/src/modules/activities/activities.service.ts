import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateActivityDto } from './dto/create-activity.dto';

export interface ActivityTargetMeta {
  card_id?: string;
  card_title?: string;
  board_id?: string;
  board_name?: string;
  list_title?: string;
}

export interface ActivityLogItem {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  target_type: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar?: string | null;
    email?: string;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
  target_meta?: ActivityTargetMeta;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Enrich activity items with board and card metadata for direct navigation
   */
  private async enrichActivitiesWithMetadata(
    activities: ActivityLogItem[],
  ): Promise<ActivityLogItem[]> {
    if (!activities || activities.length === 0) return [];

    try {
      const cardIds: string[] = [];
      const boardIds: string[] = [];

      for (const act of activities) {
        if (act.target_type?.startsWith('card:')) {
          const cId = act.target_type.replace('card:', '').trim();
          if (cId && !cardIds.includes(cId)) cardIds.push(cId);
        } else if (act.target_type?.startsWith('board:')) {
          const bId = act.target_type.replace('board:', '').trim();
          if (bId && !boardIds.includes(bId)) boardIds.push(bId);
        }
      }

      const cardMap = new Map<string, any>();
      if (cardIds.length > 0) {
        const { data: cards } = await this.supabase
          .from('cards')
          .select('id, title, list:lists(id, title, board_id, board:boards(id, name))')
          .in('id', cardIds);

        if (cards) {
          for (const c of cards as any[]) {
            cardMap.set(c.id, c);
          }
        }
      }

      const boardMap = new Map<string, any>();
      if (boardIds.length > 0) {
        const { data: boards } = await this.supabase
          .from('boards')
          .select('id, name')
          .in('id', boardIds);

        if (boards) {
          for (const b of boards as any[]) {
            boardMap.set(b.id, b);
          }
        }
      }

      for (const act of activities) {
        if (act.target_type?.startsWith('card:')) {
          const cId = act.target_type.replace('card:', '').trim();
          const cardData = cardMap.get(cId);
          if (cardData) {
            act.target_meta = {
              card_id: cardData.id,
              card_title: cardData.title,
              list_title: cardData.list?.title,
              board_id: cardData.list?.board_id || cardData.list?.board?.id,
              board_name: cardData.list?.board?.name,
            };
          } else {
            act.target_meta = { card_id: cId };
          }
        } else if (act.target_type?.startsWith('board:')) {
          const bId = act.target_type.replace('board:', '').trim();
          const boardData = boardMap.get(bId);
          if (boardData) {
            act.target_meta = {
              board_id: boardData.id,
              board_name: boardData.name,
            };
          } else {
            act.target_meta = { board_id: bId };
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Error enriching activities metadata: ${err.message}`);
    }

    return activities;
  }

  /**
   * Log an activity safely without throwing errors that could interrupt main flows
   */
  async logActivity(dto: {
    workspaceId: string;
    userId: string;
    action: string;
    targetType: string;
  }): Promise<void> {
    try {
      if (!dto.workspaceId || !dto.userId || !dto.action || !dto.targetType) {
        return;
      }

      await this.supabase.from('activity_logs').insert({
        workspace_id: dto.workspaceId,
        user_id: dto.userId,
        action: dto.action.slice(0, 100),
        target_type: dto.targetType.slice(0, 50),
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log activity: ${err.message}`);
    }
  }

  /**
   * Get all activities related to a single Card
   */
  async getCardActivities(cardId: string, userId?: string, limit = 15, page = 1): Promise<ActivityLogItem[]> {
    if (userId) {
      const { data: card, error: cError } = await this.supabase
        .from('cards')
        .select('id, list_id, lists:lists(id, board_id, boards:boards(id, workspace_id, workspaces:workspaces(id, owner_id)))')
        .eq('id', cardId)
        .maybeSingle();

      if (cError || !card) {
        throw new NotFoundException('Không tìm thấy Thẻ');
      }

      const board = (card.lists as any)?.boards;
      const wsOwnerId = board?.workspaces?.owner_id;
      const boardId = board?.id;
      const workspaceId = board?.workspace_id;

      if (wsOwnerId !== userId) {
        let hasAccess = false;
        if (boardId) {
          const { data: bm } = await this.supabase
            .from('board_members')
            .select('id')
            .eq('board_id', boardId)
            .eq('user_id', userId)
            .maybeSingle();
          if (bm) hasAccess = true;
        }
        if (!hasAccess && workspaceId) {
          const { data: wm } = await this.supabase
            .from('workspace_members')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .maybeSingle();
          if (wm) hasAccess = true;
        }
        if (!hasAccess) {
          throw new ForbiddenException('Bạn không có quyền truy cập hoạt động của Thẻ này');
        }
      }
    }

    const safeLimit = Math.min(Math.max(1, Number(limit) || 15), 50);
    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error } = await this.supabase
      .from('activity_logs')
      .select(`
        id,
        workspace_id,
        user_id,
        action,
        target_type,
        created_at,
        user:users (id, name, avatar, email)
      `)
      .eq('target_type', `card:${cardId}`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Error fetching card activities: ${error.message}`);
      return [];
    }

    const items = (data as unknown as ActivityLogItem[]) || [];
    return this.enrichActivitiesWithMetadata(items);
  }

  /**
   * Get all activities for a Board, including the board itself AND all cards in that board
   */
  async getBoardActivities(boardId: string, userId?: string, limit = 15, page = 1): Promise<ActivityLogItem[]> {
    try {
      if (userId) {
        const { data: board, error: bError } = await this.supabase
          .from('boards')
          .select('id, workspace_id, workspaces:workspaces(id, owner_id)')
          .eq('id', boardId)
          .maybeSingle();

        if (bError || !board) {
          throw new NotFoundException('Không tìm thấy Bảng');
        }

        const wsOwnerId = (board.workspaces as any)?.owner_id;
        if (wsOwnerId !== userId) {
          const { data: bm } = await this.supabase
            .from('board_members')
            .select('id')
            .eq('board_id', boardId)
            .eq('user_id', userId)
            .maybeSingle();

          if (!bm) {
            const { data: wm } = await this.supabase
              .from('workspace_members')
              .select('id')
              .eq('workspace_id', board.workspace_id)
              .eq('user_id', userId)
              .maybeSingle();

            if (!wm) {
              throw new ForbiddenException('Bạn không có quyền truy cập hoạt động của Bảng này');
            }
          }
        }
      }

      const safeLimit = Math.min(Math.max(1, Number(limit) || 15), 50);
      const safePage = Math.max(1, Number(page) || 1);
      const from = (safePage - 1) * safeLimit;
      const to = from + safeLimit - 1;

      // 1. Fetch all card IDs for this board
      const { data: lists } = await this.supabase
        .from('lists')
        .select('id, cards (id)')
        .eq('board_id', boardId);

      const targetTypes: string[] = [`board:${boardId}`];
      if (lists) {
        for (const list of lists) {
          if (Array.isArray((list as any).cards)) {
            for (const card of (list as any).cards) {
              if (card?.id) {
                targetTypes.push(`card:${card.id}`);
              }
            }
          }
        }
      }

      // 2. Query activities with these target types
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select(`
          id,
          workspace_id,
          user_id,
          action,
          target_type,
          created_at,
          user:users (id, name, avatar, email)
        `)
        .in('target_type', targetTypes)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        this.logger.error(`Error fetching board activities: ${error.message}`);
        return [];
      }

      const items = (data as unknown as ActivityLogItem[]) || [];
      return this.enrichActivitiesWithMetadata(items);
    } catch (err: any) {
      if (err instanceof ForbiddenException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Exception fetching board activities: ${err.message}`);
      return [];
    }
  }

  /**
   * Get all activities in a Workspace (includes workspace actions, board actions, and card actions)
   */
  async getWorkspaceActivities(workspaceId: string, userId?: string, limit = 15, page = 1): Promise<ActivityLogItem[]> {
    if (userId) {
      const { data: ws, error: wsError } = await this.supabase
        .from('workspaces')
        .select('id, owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (wsError || !ws) {
        throw new NotFoundException('Không tìm thấy Không gian làm việc');
      }

      if (ws.owner_id !== userId) {
        const { data: member } = await this.supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!member) {
          throw new ForbiddenException('Bạn không có quyền truy cập hoạt động của Không gian làm việc này hoặc đã bị xóa');
        }
      }
    }

    const safeLimit = Math.min(Math.max(1, Number(limit) || 15), 50);
    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error } = await this.supabase
      .from('activity_logs')
      .select(`
        id,
        workspace_id,
        user_id,
        action,
        target_type,
        created_at,
        user:users (id, name, avatar, email)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Error fetching workspace activities: ${error.message}`);
      return [];
    }

    const items = (data as unknown as ActivityLogItem[]) || [];
    return this.enrichActivitiesWithMetadata(items);
  }

  /**
   * Get all personal activities performed by the current user across all workspaces/boards/cards
   */
  async getMyActivities(userId: string, limit = 15, page = 1): Promise<ActivityLogItem[]> {
    const safeLimit = Math.min(Math.max(1, Number(limit) || 15), 50);
    const safePage = Math.max(1, Number(page) || 1);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error } = await this.supabase
      .from('activity_logs')
      .select(`
        id,
        workspace_id,
        user_id,
        action,
        target_type,
        created_at,
        user:users (id, name, avatar, email),
        workspace:workspaces (id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Error fetching personal activities: ${error.message}`);
      return [];
    }

    const items = (data as unknown as ActivityLogItem[]) || [];
    return this.enrichActivitiesWithMetadata(items);
  }
}
