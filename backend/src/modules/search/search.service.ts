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
    const rawQ = (query || '').trim();
    // Sanitize query to prevent PostgREST filter injection
    const safeQ = rawQ.replace(/[,()*%]/g, ' ').trim();
    if (!safeQ || safeQ.length < 1) {
      return { workspaces: [], boards: [], cards: [] };
    }

    // 1. Get workspaces accessible to user (distinguishing regular members vs guest)
    const { data: memberWorkspaces } = await this.supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId);

    const { data: ownedWorkspaces } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    const ownedWsIds = new Set((ownedWorkspaces || []).map((w: any) => w.id));
    const regularMemberWsIds = new Set(
      (memberWorkspaces || [])
        .filter((m: any) => m.role !== 'GUEST')
        .map((m: any) => m.workspace_id)
    );

    const allAccessibleWsIds = Array.from(
      new Set([
        ...Array.from(ownedWsIds),
        ...Array.from(regularMemberWsIds),
        ...(memberWorkspaces || []).map((m: any) => m.workspace_id),
      ]),
    );

    if (allAccessibleWsIds.length === 0) {
      return { workspaces: [], boards: [], cards: [] };
    }

    // 2. Search Workspaces (Exclude workspaces where user is purely a GUEST)
    const searchableWsIds = Array.from(new Set([...Array.from(ownedWsIds), ...Array.from(regularMemberWsIds)]));
    let workspaces: any[] = [];
    if (searchableWsIds.length > 0) {
      const { data: wsData } = await this.supabase
        .from('workspaces')
        .select('id, name, description')
        .in('id', searchableWsIds)
        .or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
        .limit(6);
      workspaces = wsData || [];
    }

    // 3. User's explicit board memberships
    const { data: myBoardMemberships } = await this.supabase
      .from('board_members')
      .select('board_id')
      .eq('user_id', userId);
    const myBoardIdSet = new Set((myBoardMemberships || []).map((bm: any) => bm.board_id));

    // 4. Search Boards (Strictly filtering out unauthorized PRIVATE boards)
    const { data: candidateBoards } = await this.supabase
      .from('boards')
      .select('id, name, description, workspace_id, visibility, workspaces(name)')
      .in('workspace_id', allAccessibleWsIds)
      .or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
      .limit(20);

    const filteredBoards = (candidateBoards || []).filter((b: any) => {
      // Workspace Owner has full access
      if (ownedWsIds.has(b.workspace_id)) return true;
      // Direct board members have access
      if (myBoardIdSet.has(b.id)) return true;
      // Regular workspace members can see non-private boards
      if (regularMemberWsIds.has(b.workspace_id) && b.visibility !== 'PRIVATE') return true;
      // Public boards
      if (b.visibility === 'PUBLIC') return true;
      return false;
    }).slice(0, 8);

    const formattedBoards = filteredBoards.map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      workspace_id: b.workspace_id,
      workspace_name: b.workspaces?.name || '',
    }));

    // 5. Get all authorized board IDs for card search
    const { data: allWorkspaceBoards } = await this.supabase
      .from('boards')
      .select('id, name, workspace_id, visibility')
      .in('workspace_id', allAccessibleWsIds);

    const authorizedBoardMap = new Map<string, string>();
    (allWorkspaceBoards || []).forEach((b: any) => {
      const isAllowed =
        ownedWsIds.has(b.workspace_id) ||
        myBoardIdSet.has(b.id) ||
        (regularMemberWsIds.has(b.workspace_id) && b.visibility !== 'PRIVATE') ||
        b.visibility === 'PUBLIC';

      if (isAllowed) {
        authorizedBoardMap.set(b.id, b.name);
      }
    });

    const authorizedBoardIds = Array.from(authorizedBoardMap.keys());

    let formattedCards: any[] = [];
    if (authorizedBoardIds.length > 0) {
      // Find lists in authorized boards
      const { data: lists } = await this.supabase
        .from('lists')
        .select('id, title, board_id')
        .in('board_id', authorizedBoardIds);

      const listMap = new Map<string, { title: string; board_id: string }>();
      (lists || []).forEach((l: any) => {
        listMap.set(l.id, { title: l.title, board_id: l.board_id });
      });

      const listIds = Array.from(listMap.keys());

      if (listIds.length > 0) {
        // Search cards in authorized lists only
        const { data: cards } = await this.supabase
          .from('cards')
          .select('id, title, description, list_id')
          .in('list_id', listIds)
          .or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
          .limit(10);

        formattedCards = (cards || []).map((c: any) => {
          const listInfo = listMap.get(c.list_id);
          const boardName = listInfo ? authorizedBoardMap.get(listInfo.board_id) : '';
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
