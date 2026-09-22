import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateActivityDto } from './dto/create-activity.dto';

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
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private readonly supabase: SupabaseService) {}

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
  async getCardActivities(cardId: string): Promise<ActivityLogItem[]> {
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
      .limit(60);

    if (error) {
      this.logger.error(`Error fetching card activities: ${error.message}`);
      return [];
    }

    return (data as unknown as ActivityLogItem[]) || [];
  }

  /**
   * Get all activities for a Board, including the board itself AND all cards in that board
   */
  async getBoardActivities(boardId: string): Promise<ActivityLogItem[]> {
    try {
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
        .limit(100);

      if (error) {
        this.logger.error(`Error fetching board activities: ${error.message}`);
        return [];
      }

      return (data as unknown as ActivityLogItem[]) || [];
    } catch (err: any) {
      this.logger.error(`Exception fetching board activities: ${err.message}`);
      return [];
    }
  }

  /**
   * Get all activities in a Workspace (includes workspace actions, board actions, and card actions)
   */
  async getWorkspaceActivities(workspaceId: string): Promise<ActivityLogItem[]> {
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
      .limit(150);

    if (error) {
      this.logger.error(`Error fetching workspace activities: ${error.message}`);
      return [];
    }

    return (data as unknown as ActivityLogItem[]) || [];
  }

  /**
   * Get all personal activities performed by the current user across all workspaces/boards/cards
   */
  async getMyActivities(userId: string): Promise<ActivityLogItem[]> {
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
      .limit(100);

    if (error) {
      this.logger.error(`Error fetching personal activities: ${error.message}`);
      return [];
    }

    return (data as unknown as ActivityLogItem[]) || [];
  }
}
