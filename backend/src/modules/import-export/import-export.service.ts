import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { ActivitiesService } from '../activities/activities.service';
import {
  CleanBoardDataDto,
  ImportBoardDto,
  ImportIntoBoardDto,
} from './dto/import-board.dto';
import * as XLSX from 'xlsx';

function parseSafeDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString();
  }
  if (typeof val === 'number') {
    // Excel date serial number (days since 1899-12-30)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    // Match DD/MM/YYYY or DD-MM-YYYY with optional time before or after
    const matchDateFirst = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s*,?\s+(\d{1,2}):(\d{1,2}):?(\d{1,2})?)?/);
    const matchTimeFirst = trimmed.match(/(?:(\d{1,2}):(\d{1,2}):?(\d{1,2})?\s*,?\s+)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

    const m = matchDateFirst || matchTimeFirst;
    if (m) {
      let day: number, month: number, year: number, hours = 0, mins = 0, secs = 0;
      if (matchDateFirst) {
        day = parseInt(m[1], 10);
        month = parseInt(m[2], 10) - 1;
        year = parseInt(m[3], 10);
        if (m[4]) hours = parseInt(m[4], 10);
        if (m[5]) mins = parseInt(m[5], 10);
        if (m[6]) secs = parseInt(m[6], 10);
      } else {
        if (m[1]) hours = parseInt(m[1], 10);
        if (m[2]) mins = parseInt(m[2], 10);
        if (m[3]) secs = parseInt(m[3], 10);
        day = parseInt(m[4], 10);
        month = parseInt(m[5], 10) - 1;
        year = parseInt(m[6], 10);
      }
      const d = new Date(year, month, day, hours, mins, secs);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  /**
   * Verify user has access to a board
   */
  private async verifyBoardAccess(boardId: string, userId: string): Promise<any> {
    const { data: board, error } = await this.supabase
      .from('boards')
      .select('id, name, description, workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      this.logger.error(`verifyBoardAccess error for board ${boardId}: ${error?.message || 'Board not found'}`);
      throw new NotFoundException('Không tìm thấy Bảng');
    }

    const { data: ws } = await this.supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', board.workspace_id)
      .maybeSingle();

    const isWsOwner = ws?.owner_id === userId;

    const { data: member } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member && !wsMember && !isWsOwner) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào Bảng này');
    }

    return board;
  }

  /**
   * Verify user has access to a workspace
   */
  private async verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<any> {
    const { data: ws, error } = await this.supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (error || !ws) {
      throw new NotFoundException('Không tìm thấy Không gian làm việc');
    }

    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member && ws.owner_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trong Không gian làm việc này');
    }

    return ws;
  }

  /**
   * Export Board data to Clean JSON or Excel (.xlsx)
   */
  async exportBoard(
    boardId: string,
    userId: string,
    format: 'json' | 'excel' = 'json',
    options?: {
      includeCards?: boolean;
      includeLabels?: boolean;
      includeChecklists?: boolean;
      includeMembers?: boolean;
    },
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    const board = await this.verifyBoardAccess(boardId, userId);

    const includeCards = options?.includeCards !== false;
    const includeLabels = options?.includeLabels !== false;
    const includeChecklists = options?.includeChecklists !== false;
    const includeMembers = options?.includeMembers !== false;

    // 1. Fetch Board Labels
    let boardLabels: any[] = [];
    if (includeLabels) {
      const { data: labels } = await this.supabase
        .from('labels')
        .select('id, name, color')
        .eq('board_id', boardId);
      if (labels) {
        boardLabels = labels;
      }
    }

    // 2. Fetch Lists and Cards
    const { data: listsData } = await this.supabase
      .from('lists')
      .select(`
        id,
        title,
        position,
        cards (
          id,
          title,
          description,
          position,
          start_date,
          due_date,
          is_due_date_completed,
          card_labels (
            label:labels (id, name, color)
          ),
          card_assignees (
            board_member:board_members (
              user:users (email, name)
            )
          ),
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
        )
      `)
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    // 3. Construct Clean Schema (No DB IDs)
    const cleanLists = (listsData || []).map((l: any) => {
      const sortedCards = (l.cards || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      return {
        name: l.title,
        cards: includeCards
          ? sortedCards.map((c: any) => {
              const cardLabelsList = includeLabels
                ? (c.card_labels || [])
                    .map((cl: any) => {
                      const lObj = Array.isArray(cl.label) ? cl.label[0] : cl.label;
                      return lObj?.name || cl.name;
                    })
                    .filter(Boolean)
                : [];
              const cardAssigneesList = includeMembers
                ? (c.card_assignees || [])
                    .map((ca: any) => ca.board_member?.user?.email || ca.board_member?.user?.name)
                    .filter(Boolean)
                : [];
              const cardChecklistsList = includeChecklists
                ? (c.checklists || []).map((ck: any) => ({
                    title: ck.title,
                    items: (ck.items || []).map((it: any) => ({
                      content: it.content,
                      is_completed: !!it.is_completed,
                    })),
                  }))
                : [];

              return {
                title: c.title,
                description: c.description || undefined,
                start_date: c.start_date || undefined,
                due_date: c.due_date || undefined,
                is_completed: !!c.is_due_date_completed,
                labels: cardLabelsList.length > 0 ? cardLabelsList : undefined,
                assignees: cardAssigneesList.length > 0 ? cardAssigneesList : undefined,
                checklists: cardChecklistsList.length > 0 ? cardChecklistsList : undefined,
              };
            })
          : [],
      };
    });

    // Ensure all labels mentioned in cards are in boardLabels
    for (const list of cleanLists) {
      for (const card of list.cards || []) {
        for (const lb of card.labels || []) {
          if (!boardLabels.some((bl) => bl.name.toLowerCase() === lb.toLowerCase())) {
            boardLabels.push({ name: lb, color: '#3b82f6' });
          }
        }
      }
    }

    const cleanData: CleanBoardDataDto = {
      version: '1.0',
      board: {
        name: board.name,
        description: board.description || undefined,
      },
      labels: boardLabels.map((bl) => ({ name: bl.name, color: bl.color })),
      lists: cleanLists,
    };

    const sanitizedBoardName = (board.name || 'Board')
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
      .slice(0, 40);

    // 4. Return as JSON or Excel
    if (format === 'excel') {
      // Create Sheet 1: Cards
      const cardRows: any[] = [];
      const checklistRows: any[] = [];

      for (const list of cleanLists) {
        for (const card of list.cards || []) {
          const totalCkItems = (card.checklists || []).reduce(
            (acc, ck) => acc + (ck.items?.length || 0),
            0,
          );
          const doneCkItems = (card.checklists || []).reduce(
            (acc, ck) => acc + (ck.items?.filter((it) => it.is_completed).length || 0),
            0,
          );
          const ckProgress =
            totalCkItems > 0 ? `${doneCkItems}/${totalCkItems} (${Math.round((doneCkItems / totalCkItems) * 100)}%)` : '';

          cardRows.push({
            'Danh sách (List)': list.name,
            'Tiêu đề thẻ (Title)': card.title,
            'Mô tả (Description)': card.description || '',
            'Hoàn thành (Completed)': card.is_completed ? 'Đã xong' : 'Chưa',
            'Ngày bắt đầu (Start Date)': card.start_date || '',
            'Hạn chót (Due Date)': card.due_date || '',
            'Thành viên (Assignees)': (card.assignees || []).join(', '),
            'Nhãn (Labels)': (card.labels || []).join(', '),
            'Tiến độ Checklist': ckProgress,
          });

          for (const ck of card.checklists || []) {
            for (const item of ck.items || []) {
              checklistRows.push({
                'Tên thẻ (Card Title)': card.title,
                'Tiêu đề Checklist': ck.title,
                'Nội dung mục (Item)': item.content,
                'Đã xong (Is Done)': item.is_completed ? 'Có' : 'Không',
              });
            }
          }
        }
      }

      const wb = XLSX.utils.book_new();

      // Sheet 1: Board Info
      const boardInfoRows = [
        { 'Thuộc tính (Property)': 'Tên Bảng (Board Name)', 'Giá trị (Value)': board.name },
        { 'Thuộc tính (Property)': 'Mô tả (Description)', 'Giá trị (Value)': board.description || '' },
      ];
      const wsInfo = XLSX.utils.json_to_sheet(boardInfoRows);
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Thông tin Bảng');

      // Sheet 2: Cards
      const wsCards = XLSX.utils.json_to_sheet(cardRows.length > 0 ? cardRows : [{ 'Danh sách (List)': '', 'Tiêu đề thẻ (Title)': '' }]);
      XLSX.utils.book_append_sheet(wb, wsCards, 'Danh sách Thẻ');

      // Sheet 3: Checklists
      if (checklistRows.length > 0) {
        const wsChecklists = XLSX.utils.json_to_sheet(checklistRows);
        XLSX.utils.book_append_sheet(wb, wsChecklists, 'Việc cần làm (Checklists)');
      }

      // Sheet 4: Labels
      if (boardLabels.length > 0) {
        const labelRows = boardLabels.map((lb) => ({ 'Tên nhãn (Label Name)': lb.name, 'Màu sắc (Color)': lb.color }));
        const wsLabels = XLSX.utils.json_to_sheet(labelRows);
        XLSX.utils.book_append_sheet(wb, wsLabels, 'Nhãn màu (Labels)');
      }

      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return {
        filename: `${sanitizedBoardName}_Export.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: excelBuffer,
      };
    }

    // Default JSON
    const jsonStr = JSON.stringify(cleanData, null, 2);
    return {
      filename: `${sanitizedBoardName}_Backup.json`,
      contentType: 'application/json',
      buffer: Buffer.from(jsonStr, 'utf-8'),
    };
  }

  /**
   * Validate and preview raw data (JSON or parsed Excel)
   */
  validateImportData(rawPayload: any): {
    valid: boolean;
    isValid: boolean;
    summary: {
      boardName: string;
      listsCount: number;
      totalLists: number;
      cardsCount: number;
      totalCards: number;
      labelsCount: number;
      totalLabels: number;
      checklistsCount: number;
      totalChecklists: number;
    };
    warnings: string[];
    errors: string[];
    cleanData: CleanBoardDataDto;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawPayload || typeof rawPayload !== 'object') {
      return {
        valid: false,
        isValid: false,
        summary: {
          boardName: '',
          listsCount: 0,
          totalLists: 0,
          cardsCount: 0,
          totalCards: 0,
          labelsCount: 0,
          totalLabels: 0,
          checklistsCount: 0,
          totalChecklists: 0,
        },
        warnings: [],
        errors: ['Định dạng tệp không hợp lệ hoặc dữ liệu bị trống.'],
        cleanData: { board: { name: '' }, lists: [] },
      };
    }

    let boardName = rawPayload.board?.name || rawPayload.name || 'Bảng Nhập Mới';
    boardName = String(boardName).trim();

    const rawLists = Array.isArray(rawPayload.lists) ? rawPayload.lists : [];
    if (rawLists.length === 0) {
      warnings.push('Tệp không chứa danh sách/cột nào. Bảng sẽ được tạo với các cột mặc định.');
    }

    let totalCards = 0;
    let totalChecklists = 0;
    const cleanLists: any[] = [];

    rawLists.forEach((l: any, lIdx: number) => {
      const listName = String(l.name || l.title || `Danh sách ${lIdx + 1}`).trim();
      const rawCards = Array.isArray(l.cards) ? l.cards : [];
      const cleanCards: any[] = [];

      rawCards.forEach((c: any, cIdx: number) => {
        const rawCardTitle = String(c.title || c.name || '').trim();
        if (!rawCardTitle) {
          warnings.push(`Thẻ thứ ${cIdx + 1} trong cột "${listName}" bị thiếu tiêu đề và sẽ bị bỏ qua.`);
          return;
        }

        totalCards++;

        // Handle title overflow (Postgres VARCHAR(255) constraint)
        let cardTitle = rawCardTitle;
        let cardDesc = c.description ? String(c.description).trim() : '';
        if (cardTitle.length > 255) {
          const overflow = cardTitle.slice(255);
          cardTitle = cardTitle.slice(0, 255);
          cardDesc = cardDesc ? `${cardDesc}\n\n[Tiêu đề mở rộng]: ${overflow}` : `[Tiêu đề mở rộng]: ${overflow}`;
          warnings.push(`Thẻ "${cardTitle.slice(0, 30)}..." có tiêu đề dài hơn 255 ký tự, phần dư đã được chuyển vào mô tả.`);
        }

        // Safe Dates
        const safeStartDate = parseSafeDate(c.start_date);
        let safeDueDate = parseSafeDate(c.due_date);
        if (safeStartDate && safeDueDate) {
          const sTime = new Date(safeStartDate).getTime();
          const dTime = new Date(safeDueDate).getTime();
          if (dTime < sTime) {
            // Avoid Postgres chk_card_dates constraint failure
            safeDueDate = safeStartDate;
          }
        }

        // Extract labels flexibly
        let cardLabels: string[] = [];
        if (Array.isArray(c.labels)) {
          cardLabels = c.labels
            .map((lb: any) => {
              if (typeof lb === 'string') return lb.trim();
              if (lb && typeof lb === 'object') {
                const lObj = lb.label || lb;
                return String(lObj.name || lObj.title || '').trim();
              }
              return '';
            })
            .filter(Boolean);
        } else if (Array.isArray(c.card_labels)) {
          cardLabels = c.card_labels
            .map((cl: any) => {
              const lObj = Array.isArray(cl.label) ? cl.label[0] : (cl.label || cl);
              return String(lObj?.name || lObj?.title || cl.name || '').trim();
            })
            .filter(Boolean);
        } else if (typeof c.labels === 'string' && c.labels.trim()) {
          cardLabels = c.labels
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }

        // Extract Checklists
        const rawChecklists = Array.isArray(c.checklists) ? c.checklists : [];
        const cleanChecklists = rawChecklists
          .map((ck: any) => {
            const ckTitle = String(ck.title || 'Checklist').trim().slice(0, 255);
            const rawItems = Array.isArray(ck.items) ? ck.items : [];
            const cleanItems = rawItems
              .map((it: any, itIdx: number) => {
                const content = String(it.content || it.name || '').trim().slice(0, 500);
                return {
                  content,
                  is_completed: !!it.is_completed,
                  position: itIdx + 1,
                };
              })
              .filter((it: any) => !!it.content);

            return {
              title: ckTitle || 'Checklist',
              items: cleanItems,
            };
          })
          .filter((ck: any) => ck.items.length > 0 || ck.title);

        totalChecklists += cleanChecklists.length;

        // Assignees
        const assignees = Array.isArray(c.assignees)
          ? c.assignees.map((as: any) => String(as.email || as.name || as).trim()).filter(Boolean)
          : undefined;

        cleanCards.push({
          title: cardTitle,
          description: cardDesc || undefined,
          start_date: safeStartDate || undefined,
          due_date: safeDueDate || undefined,
          is_completed: !!(c.is_completed || c.is_due_date_completed),
          labels: cardLabels.length > 0 ? cardLabels : undefined,
          assignees: assignees && assignees.length > 0 ? assignees : undefined,
          checklists: cleanChecklists.length > 0 ? cleanChecklists : undefined,
        });
      });

      cleanLists.push({
        name: listName,
        cards: cleanCards,
      });
    });

    // Collect all labels from rawPayload AND all cards
    const rawLabels = Array.isArray(rawPayload.labels) ? rawPayload.labels : [];
    const cleanLabels: Array<{ name: string; color: string }> = [];

    rawLabels.forEach((lb: any) => {
      const name = String(lb.name || lb).trim().slice(0, 100);
      if (name && !cleanLabels.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
        cleanLabels.push({
          name,
          color: lb.color || '#3b82f6',
        });
      }
    });

    for (const list of cleanLists) {
      for (const card of list.cards || []) {
        for (const lbName of card.labels || []) {
          const trimmed = String(lbName).trim().slice(0, 100);
          if (trimmed && !cleanLabels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
            cleanLabels.push({
              name: trimmed,
              color: '#3b82f6',
            });
          }
        }
      }
    }

    const cleanData: CleanBoardDataDto = {
      version: '1.0',
      board: {
        name: boardName,
        description: rawPayload.board?.description || rawPayload.description || undefined,
      },
      labels: cleanLabels,
      lists: cleanLists,
    };

    return {
      valid: errors.length === 0,
      isValid: errors.length === 0,
      summary: {
        boardName,
        listsCount: cleanLists.length,
        totalLists: cleanLists.length,
        cardsCount: totalCards,
        totalCards: totalCards,
        labelsCount: cleanLabels.length,
        totalLabels: cleanLabels.length,
        checklistsCount: totalChecklists,
        totalChecklists: totalChecklists,
      },
      warnings,
      errors,
      cleanData,
    };
  }

  /**
   * Import as a brand new Board in the Workspace
   */
  async importNewBoard(
    workspaceId: string,
    userId: string,
    dto: ImportBoardDto,
  ): Promise<{ id: string; boardId: string; name: string }> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const rawPayload = dto.data || (dto as any).boardData;
    const targetBoardName = dto.targetBoardName || (dto as any).customBoardTitle;

    const validation = this.validateImportData(rawPayload);
    if (!validation.isValid) {
      throw new BadRequestException(`Lỗi cấu trúc dữ liệu nhập: ${validation.errors.join(', ')}`);
    }

    const cleanData = validation.cleanData;
    const boardName = (targetBoardName || cleanData.board.name || 'Bảng Mới').trim();

    // 1. Create Board
    const { data: newBoard, error: bError } = await this.supabase
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        name: boardName,
        description: cleanData.board.description || null,
      })
      .select('id, name')
      .single();

    if (bError || !newBoard) {
      this.logger.error(`importNewBoard error: ${bError?.message}`);
      throw new BadRequestException('Không thể khởi tạo Bảng mới từ tệp');
    }

    // 2. Add creator as Admin in board_members
    await this.supabase.from('board_members').insert({
      board_id: newBoard.id,
      user_id: userId,
      role: 'ADMIN',
    });

    // 3. Create / Sync Labels
    const labelMap = new Map<string, string>();
    if (cleanData.labels && cleanData.labels.length > 0) {
      for (const lb of cleanData.labels) {
        const normName = lb.name.toLowerCase().trim();
        const { data: existing } = await this.supabase
          .from('labels')
          .select('id, name')
          .eq('board_id', newBoard.id)
          .ilike('name', lb.name)
          .maybeSingle();

        if (existing) {
          labelMap.set(normName, existing.id);
        } else {
          const { data: createdLabel, error: lErr } = await this.supabase
            .from('labels')
            .insert({
              board_id: newBoard.id,
              name: lb.name.slice(0, 100),
              color: lb.color || '#3b82f6',
            })
            .select('id, name')
            .maybeSingle();

          if (createdLabel) {
            labelMap.set(normName, createdLabel.id);
          } else if (lErr) {
            this.logger.warn(`Could not create label "${lb.name}": ${lErr.message}`);
          }
        }
      }
    }

    // 4. Create Lists and Cards
    const listsToCreate = cleanData.lists.length > 0
      ? cleanData.lists
      : [{ name: 'Cần làm', cards: [] }, { name: 'Đang làm', cards: [] }, { name: 'Đã xong', cards: [] }];

    for (let lIdx = 0; lIdx < listsToCreate.length; lIdx++) {
      const list = listsToCreate[lIdx];
      const { data: newList, error: listError } = await this.supabase
        .from('lists')
        .insert({
          board_id: newBoard.id,
          title: list.name.slice(0, 150),
          position: lIdx + 1,
        })
        .select('id')
        .maybeSingle();

      if (listError || !newList) {
        this.logger.error(`Failed to insert list "${list.name}": ${listError?.message}`);
        continue;
      }

      for (let cIdx = 0; cIdx < (list.cards || []).length; cIdx++) {
        const card = list.cards![cIdx];
        const cardTitle = String(card.title).slice(0, 255);
        let cardDesc = card.description || null;
        if (String(card.title).length > 255) {
          const extra = String(card.title).slice(255);
          cardDesc = cardDesc ? `${cardDesc}\n\n[Tiêu đề mở rộng]: ${extra}` : `[Tiêu đề mở rộng]: ${extra}`;
        }

        const safeStartDate = parseSafeDate(card.start_date);
        let safeDueDate = parseSafeDate(card.due_date);
        if (safeStartDate && safeDueDate && new Date(safeDueDate).getTime() < new Date(safeStartDate).getTime()) {
          safeDueDate = safeStartDate;
        }

        const { data: newCard, error: cError } = await this.supabase
          .from('cards')
          .insert({
            list_id: newList.id,
            title: cardTitle,
            description: cardDesc,
            position: cIdx + 1,
            start_date: safeStartDate,
            due_date: safeDueDate,
            is_due_date_completed: !!card.is_completed,
            created_by: userId,
          })
          .select('id')
          .maybeSingle();

        if (cError || !newCard) {
          this.logger.error(`Failed to insert card "${cardTitle}" in list "${newList.id}": ${cError?.message}`);
          continue;
        }

        // Assign Labels to Card
        if (card.labels && card.labels.length > 0) {
          for (const lbName of card.labels) {
            const trimmedName = String(lbName).trim();
            const normName = trimmedName.toLowerCase();
            let labelId = labelMap.get(normName);

            if (!labelId) {
              const { data: exLb } = await this.supabase
                .from('labels')
                .select('id')
                .eq('board_id', newBoard.id)
                .ilike('name', trimmedName)
                .maybeSingle();

              if (exLb) {
                labelId = exLb.id;
                labelMap.set(normName, exLb.id);
              } else {
                const { data: nLabel } = await this.supabase
                  .from('labels')
                  .insert({ board_id: newBoard.id, name: trimmedName.slice(0, 100), color: '#3b82f6' })
                  .select('id')
                  .maybeSingle();
                if (nLabel) {
                  labelId = nLabel.id;
                  labelMap.set(normName, nLabel.id);
                }
              }
            }

            if (labelId) {
              const { error: clErr } = await this.supabase
                .from('card_labels')
                .insert({ card_id: newCard.id, label_id: labelId });
              if (clErr) {
                this.logger.warn(`Failed to link label ${labelId} to card ${newCard.id}: ${clErr.message}`);
              }
            }
          }
        }

        // Create Checklists
        if (card.checklists && card.checklists.length > 0) {
          for (let ckIdx = 0; ckIdx < card.checklists.length; ckIdx++) {
            const ck = card.checklists[ckIdx];
            const ckTitle = String(ck.title || 'Checklist').trim().slice(0, 255);
            const { data: newCk, error: ckError } = await this.supabase
              .from('checklists')
              .insert({
                card_id: newCard.id,
                title: ckTitle,
                position: ckIdx + 1,
              })
              .select('id')
              .maybeSingle();

            if (ckError || !newCk) {
              this.logger.error(`Failed to insert checklist "${ckTitle}": ${ckError?.message}`);
              continue;
            }

            if (ck.items && ck.items.length > 0) {
              const itemsToInsert = ck.items
                .map((it: any, itIdx: number) => ({
                  checklist_id: newCk.id,
                  content: String(it.content || '').trim().slice(0, 500),
                  is_completed: !!it.is_completed,
                  position: itIdx + 1,
                }))
                .filter((it: any) => !!it.content);

              if (itemsToInsert.length > 0) {
                const { error: itErr } = await this.supabase
                  .from('checklist_items')
                  .insert(itemsToInsert);
                if (itErr) {
                  this.logger.error(`Failed to insert checklist items: ${itErr.message}`);
                }
              }
            }
          }
        }
      }
    }

    // 5. Activity Log
    await this.activitiesService.logActivity({
      workspaceId,
      userId,
      action: `đã nhập Bảng "${newBoard.name}" từ tệp`,
      targetType: `board:${newBoard.id}`,
    });

    return { id: newBoard.id, boardId: newBoard.id, name: newBoard.name };
  }

  /**
   * Import cards/lists into an existing Board
   */
  async importIntoExistingBoard(
    boardId: string,
    userId: string,
    dto: ImportIntoBoardDto,
  ): Promise<{ boardId: string; message: string; importedCardsCount: number }> {
    const board = await this.verifyBoardAccess(boardId, userId);

    const rawPayload = dto.data || (dto as any).boardData;
    const validation = this.validateImportData(rawPayload);
    if (!validation.isValid) {
      throw new BadRequestException(`Lỗi cấu trúc dữ liệu nhập: ${validation.errors.join(', ')}`);
    }

    const cleanData = validation.cleanData;
    const strategy = dto.duplicateStrategy || 'create_new';

    // 1. Fetch Existing Labels and Pre-populate labelMap
    const { data: existingLabels } = await this.supabase
      .from('labels')
      .select('id, name')
      .eq('board_id', boardId);

    const labelMap = new Map<string, string>();
    (existingLabels || []).forEach((el: any) => {
      labelMap.set(el.name.toLowerCase().trim(), el.id);
    });

    if (cleanData.labels && cleanData.labels.length > 0) {
      for (const lb of cleanData.labels) {
        const norm = lb.name.toLowerCase().trim();
        if (!labelMap.has(norm)) {
          const { data: nLabel } = await this.supabase
            .from('labels')
            .insert({ board_id: boardId, name: lb.name.slice(0, 100), color: lb.color || '#3b82f6' })
            .select('id, name')
            .maybeSingle();
          if (nLabel) {
            labelMap.set(norm, nLabel.id);
          }
        }
      }
    }

    // 2. Fetch Existing Lists and Cards
    const { data: existingLists } = await this.supabase
      .from('lists')
      .select('id, title, position, cards(id, title, position)')
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    const listMap = new Map<string, any>();
    let maxListPos = 0;
    (existingLists || []).forEach((el: any) => {
      listMap.set(el.title.toLowerCase().trim(), el);
      if (el.position > maxListPos) maxListPos = el.position;
    });

    let totalImported = 0;

    // 3. Loop and Insert/Update
    for (const list of cleanData.lists) {
      const normListName = list.name.toLowerCase().trim();
      let targetList = listMap.get(normListName);

      if (!targetList) {
        maxListPos++;
        const { data: nList } = await this.supabase
          .from('lists')
          .insert({
            board_id: boardId,
            title: list.name.slice(0, 150),
            position: maxListPos,
          })
          .select('id, title, position, cards(id, title, position)')
          .maybeSingle();

        if (nList) {
          targetList = nList;
          targetList.cards = [];
          listMap.set(normListName, targetList);
        }
      }

      if (!targetList) continue;

      const existingCardsInList = targetList.cards || [];
      let maxCardPos = existingCardsInList.reduce((m: number, c: any) => Math.max(m, c.position || 0), 0);

      for (const card of list.cards || []) {
        const normTitle = card.title.toLowerCase().trim();
        const existingCard = existingCardsInList.find(
          (ec: any) => ec.title.toLowerCase().trim() === normTitle,
        );

        if (existingCard && strategy === 'skip') {
          continue;
        }

        const cardTitle = String(card.title).slice(0, 255);
        let cardDesc = card.description || null;
        if (String(card.title).length > 255) {
          const extra = String(card.title).slice(255);
          cardDesc = cardDesc ? `${cardDesc}\n\n[Tiêu đề mở rộng]: ${extra}` : `[Tiêu đề mở rộng]: ${extra}`;
        }

        const safeStartDate = parseSafeDate(card.start_date);
        let safeDueDate = parseSafeDate(card.due_date);
        if (safeStartDate && safeDueDate && new Date(safeDueDate).getTime() < new Date(safeStartDate).getTime()) {
          safeDueDate = safeStartDate;
        }

        if (existingCard && strategy === 'replace') {
          // Update existing card
          await this.supabase
            .from('cards')
            .update({
              description: cardDesc,
              start_date: safeStartDate,
              due_date: safeDueDate,
              is_due_date_completed: !!card.is_completed,
            })
            .eq('id', existingCard.id);

          // Assign labels
          if (card.labels && card.labels.length > 0) {
            for (const lbName of card.labels) {
              const trimmedName = String(lbName).trim();
              const normName = trimmedName.toLowerCase();
              let labelId = labelMap.get(normName);
              if (!labelId) {
                const { data: nLabel } = await this.supabase
                  .from('labels')
                  .insert({ board_id: boardId, name: trimmedName.slice(0, 100), color: '#3b82f6' })
                  .select('id')
                  .maybeSingle();
                if (nLabel) {
                  labelId = nLabel.id;
                  labelMap.set(normName, nLabel.id);
                }
              }
              if (labelId) {
                await this.supabase
                  .from('card_labels')
                  .insert({ card_id: existingCard.id, label_id: labelId });
              }
            }
          }

          totalImported++;
          continue;
        }

        // Create new card
        maxCardPos++;
        const { data: nCard, error: nCardError } = await this.supabase
          .from('cards')
          .insert({
            list_id: targetList.id,
            title: cardTitle,
            description: cardDesc,
            position: maxCardPos,
            start_date: safeStartDate,
            due_date: safeDueDate,
            is_due_date_completed: !!card.is_completed,
            created_by: userId,
          })
          .select('id')
          .maybeSingle();

        if (nCardError || !nCard) {
          this.logger.error(`Failed to insert card "${cardTitle}" in board "${boardId}": ${nCardError?.message}`);
          continue;
        }

        totalImported++;

        // Assign Labels
        if (card.labels && card.labels.length > 0) {
          for (const lbName of card.labels) {
            const trimmedName = String(lbName).trim();
            const normName = trimmedName.toLowerCase();
            let labelId = labelMap.get(normName);

            if (!labelId) {
              const { data: exLb } = await this.supabase
                .from('labels')
                .select('id')
                .eq('board_id', boardId)
                .ilike('name', trimmedName)
                .maybeSingle();

              if (exLb) {
                labelId = exLb.id;
                labelMap.set(normName, exLb.id);
              } else {
                const { data: nLabel } = await this.supabase
                  .from('labels')
                  .insert({ board_id: boardId, name: trimmedName.slice(0, 100), color: '#3b82f6' })
                  .select('id')
                  .maybeSingle();
                if (nLabel) {
                  labelId = nLabel.id;
                  labelMap.set(normName, nLabel.id);
                }
              }
            }

            if (labelId) {
              await this.supabase.from('card_labels').insert({ card_id: nCard.id, label_id: labelId });
            }
          }
        }

        // Add Checklists
        if (card.checklists && card.checklists.length > 0) {
          for (let ckIdx = 0; ckIdx < card.checklists.length; ckIdx++) {
            const ck = card.checklists[ckIdx];
            const ckTitle = String(ck.title || 'Checklist').trim().slice(0, 255);
            const { data: nCk } = await this.supabase
              .from('checklists')
              .insert({
                card_id: nCard.id,
                title: ckTitle,
                position: ckIdx + 1,
              })
              .select('id')
              .maybeSingle();

            if (nCk && ck.items && ck.items.length > 0) {
              const itemsToInsert = ck.items
                .map((it: any, itIdx: number) => ({
                  checklist_id: nCk.id,
                  content: String(it.content || '').trim().slice(0, 500),
                  is_completed: !!it.is_completed,
                  position: itIdx + 1,
                }))
                .filter((it: any) => !!it.content);

              if (itemsToInsert.length > 0) {
                await this.supabase.from('checklist_items').insert(itemsToInsert);
              }
            }
          }
        }
      }
    }

    // 4. Activity Log
    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId,
      action: `đã nhập ${totalImported} thẻ vào Bảng "${board.name}" từ tệp`,
      targetType: `board:${boardId}`,
    });

    return {
      boardId,
      message: `Đã nhập thành công ${totalImported} thẻ vào Bảng`,
      importedCardsCount: totalImported,
    };
  }
}
