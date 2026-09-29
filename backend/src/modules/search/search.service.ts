import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';

export interface SearchResult {
  workspaces: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  boards: Array<{
    id: string;
    name: string;
    description: string | null;
    workspace_id: string;
    workspace_name?: string;
  }>;
  cards: Array<{
    id: string;
    title: string;
    description: string | null;
    board_id: string;
    board_name?: string;
    list_name?: string;
  }>;
}

@Injectable()
export class SearchService {
  constructor(private readonly supabase: SupabaseService) {}

  async globalSearch(userId: string, query: string): Promise<SearchResult> {
    const q = (query || '').trim();
    if (!q || q.length < 1) {
      return { workspaces: [], boards: [], cards: [] };
    }

    // 1. Get workspaces accessible to user
    const { data: memberWorkspaces } = await this.supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    const { data: ownedWorkspaces } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    const accessibleWorkspaceIds = Array.from(
      new Set([
        ...(memberWorkspaces || []).map((m: any) => m.workspace_id),
        ...(ownedWorkspaces || []).map((w: any) => w.id),
      ]),
    );

    if (accessibleWorkspaceIds.length === 0) {
      return { workspaces: [], boards: [], cards: [] };
    }

    // 2. Search Workspaces
    const { data: workspaces } = await this.supabase
      .from('workspaces')
      .select('id, name, description')
      .in('id', accessibleWorkspaceIds)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(6);

    // 3. Search Boards
    const { data: boards } = await this.supabase
      .from('boards')
      .select('id, name, description, workspace_id, workspaces(name)')
      .in('workspace_id', accessibleWorkspaceIds)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(8);

    const formattedBoards = (boards || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      workspace_id: b.workspace_id,
      workspace_name: b.workspaces?.name || '',
    }));

    // 4. Get board IDs accessible to user for card search
    const { data: allBoards } = await this.supabase
      .from('boards')
      .select('id, name')
      .in('workspace_id', accessibleWorkspaceIds);

    const accessibleBoardMap = new Map<string, string>();
    (allBoards || []).forEach((b: any) => {
      accessibleBoardMap.set(b.id, b.name);
    });

    const accessibleBoardIds = Array.from(accessibleBoardMap.keys());

    let formattedCards: any[] = [];
    if (accessibleBoardIds.length > 0) {
      // Find lists in these boards
      const { data: lists } = await this.supabase
        .from('lists')
        .select('id, title, board_id')
        .in('board_id', accessibleBoardIds);

      const listMap = new Map<string, { title: string; board_id: string }>();
      (lists || []).forEach((l: any) => {
        listMap.set(l.id, { title: l.title, board_id: l.board_id });
      });

      const listIds = Array.from(listMap.keys());

      if (listIds.length > 0) {
        // Search cards
        const { data: cards } = await this.supabase
          .from('cards')
          .select('id, title, description, list_id')
          .in('list_id', listIds)
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(10);

        formattedCards = (cards || []).map((c: any) => {
          const listInfo = listMap.get(c.list_id);
          const boardName = listInfo ? accessibleBoardMap.get(listInfo.board_id) : '';
          return {
            id: c.id,
            title: c.title,
            description: c.description,
            board_id: listInfo?.board_id || '',
            board_name: boardName || '',
            list_name: listInfo?.title || '',
          };
        });
      }
    }

    return {
      workspaces: workspaces || [],
      boards: formattedBoards,
      cards: formattedCards,
    };
  }
}
