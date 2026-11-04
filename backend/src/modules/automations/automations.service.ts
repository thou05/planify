import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

export interface AutomationRuleItem {
  id: string;
  board_id: string;
  name: string;
  description?: string | null;
  type: 'RULE' | 'SCHEDULED' | 'DUE_DATE' | 'CARD_BUTTON' | 'BOARD_BUTTON';
  is_enabled: boolean;
  button_icon?: string;
  button_label?: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  }>;
  actions: Array<{
    id?: string;
    type: string;
    params: Record<string, any>;
  }>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecutionLog {
  id: string;
  automation_id: string;
  automation_name: string;
  board_id: string;
  trigger_event: string;
  actor_id?: string | null;
  actor_name?: string | null;
  card_id?: string | null;
  card_title?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  actions_total: number;
  actions_succeeded: number;
  error_message?: string | null;
  details?: Record<string, any>;
  started_at: string;
  finished_at: string;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================================================
  // LOCAL FILE STORAGE (Guarantees full data persistence & compatibility)
  // ============================================================================

  private getDataDir(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return dir;
  }

  private getAutomationsFilePath(): string {
    return path.join(this.getDataDir(), 'automations.json');
  }

  private getLogsFilePath(): string {
    return path.join(this.getDataDir(), 'automation_executions.json');
  }

  private loadAllAutomations(): AutomationRuleItem[] {
    try {
      const file = this.getAutomationsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw) || [];
      }
    } catch (err: any) {
      this.logger.error(`Error loading automations: ${err.message}`);
    }
    return [];
  }

  private saveAllAutomations(list: AutomationRuleItem[]): void {
    try {
      const file = this.getAutomationsFilePath();
      fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8');
    } catch (err: any) {
      this.logger.error(`Error saving automations: ${err.message}`);
    }
  }

  private loadAllLogs(): AutomationExecutionLog[] {
    try {
      const file = this.getLogsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw) || [];
      }
    } catch (err: any) {
      this.logger.error(`Error loading logs: ${err.message}`);
    }
    return [];
  }

  private saveAllLogs(logs: AutomationExecutionLog[]): void {
    try {
      const file = this.getLogsFilePath();
      // Keep only last 500 logs to prevent file bloat
      const trimmed = logs.slice(0, 500);
      fs.writeFileSync(file, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (err: any) {
      this.logger.error(`Error saving logs: ${err.message}`);
    }
  }

  // ============================================================================
  // ACCESS VERIFICATION
  // ============================================================================

  private async verifyBoardAccess(boardId: string, userId: string, requireEdit = false) {
    const { data: board, error: bError } = await this.supabase
      .from('boards')
      .select('id, workspace_id, visibility, workspace:workspaces (owner_id)')
      .eq('id', boardId)
      .maybeSingle();

    if (bError || !board) {
      throw new NotFoundException('Không tìm thấy bảng làm việc');
    }

    const isWorkspaceOwner = (board.workspace as any)?.owner_id === userId;
    if (isWorkspaceOwner) {
      return { board, workspaceId: board.workspace_id };
    }

    const { data: boardMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (boardMember) {
      const canEdit = ['ADMIN', 'EDITOR', 'MEMBER'].includes(boardMember.role);
      if (requireEdit && !canEdit) {
        throw new ForbiddenException('Bạn chỉ có quyền xem (Viewer), không thể thay đổi quy tắc tự động');
      }
      return { board, workspaceId: board.workspace_id };
    }

    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (wsMember) {
      if (wsMember.role === 'GUEST') {
        throw new ForbiddenException('Khách (Guest) không có quyền truy cập Bảng này');
      }
      if (board.visibility === 'PRIVATE') {
        throw new ForbiddenException('Bảng này ở chế độ Riêng tư, bạn không có quyền truy cập');
      }
      if (requireEdit) {
        throw new ForbiddenException('Bạn cần tham gia Bảng với quyền Biên tập viên (Editor) hoặc Quản trị viên (Admin) để chỉnh sửa quy tắc tự động');
      }
      return { board, workspaceId: board.workspace_id };
    }

    if (board.visibility === 'PUBLIC' && !requireEdit) {
      return { board, workspaceId: board.workspace_id };
    }

    throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
  }

  // ============================================================================
  // CRUD AUTOMATIONS
  // ============================================================================

  async findAllByBoard(boardId: string, userId: string, type?: string): Promise<AutomationRuleItem[]> {
    await this.verifyBoardAccess(boardId, userId, false);
    const all = this.loadAllAutomations();
    let boardAutomations = all.filter((a) => a.board_id === boardId);

    if (type) {
      boardAutomations = boardAutomations.filter((a) => a.type === type);
    }

    return boardAutomations.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async findById(id: string, userId: string): Promise<AutomationRuleItem> {
    const all = this.loadAllAutomations();
    const item = all.find((a) => a.id === id);
    if (!item) {
      throw new NotFoundException('Không tìm thấy quy tắc tự động');
    }
    await this.verifyBoardAccess(item.board_id, userId, false);
    return item;
  }

  async create(boardId: string, userId: string, dto: CreateAutomationDto): Promise<AutomationRuleItem> {
    const { workspaceId } = await this.verifyBoardAccess(boardId, userId, true);

    const now = new Date().toISOString();
    const newAutomation: AutomationRuleItem = {
      id: randomUUID(),
      board_id: boardId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      is_enabled: dto.is_enabled ?? true,
      button_icon: dto.button_icon || 'Sparkles',
      button_label: dto.button_label?.trim() || dto.name.trim(),
      trigger_type: dto.trigger_type,
      trigger_config: dto.trigger_config || {},
      conditions: dto.conditions || [],
      actions: (dto.actions || []).map((act) => ({
        id: act.id || randomUUID(),
        type: act.type,
        params: act.params || {},
      })),
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    const all = this.loadAllAutomations();
    all.push(newAutomation);
    this.saveAllAutomations(all);

    // Sync to Supabase automation_rules & automation_triggers & automation_actions (if available)
    try {
      const { data: dbRule } = await this.supabase
        .from('automation_rules')
        .insert({
          id: newAutomation.id,
          board_id: boardId,
          name: newAutomation.name,
          is_active: newAutomation.is_enabled,
        })
        .select()
        .maybeSingle();

      if (dbRule) {
        await this.supabase.from('automation_triggers').insert({
          rule_id: dbRule.id,
          event: newAutomation.trigger_type,
        });

        for (const act of newAutomation.actions) {
          await this.supabase.from('automation_actions').insert({
            rule_id: dbRule.id,
            type: act.type,
          });
        }
      }
    } catch (dbErr: any) {
      this.logger.debug(`Supabase fallback sync: ${dbErr?.message}`);
    }

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã tạo quy tắc tự động hóa "${newAutomation.name}"`,
        targetType: `board:${boardId}`,
      });
    }

    this.supabase.emitBoardEvent(boardId, 'AUTOMATION_CREATED', {
      automation: newAutomation,
      senderId: userId,
    });

    return newAutomation;
  }

  async update(id: string, userId: string, dto: UpdateAutomationDto): Promise<AutomationRuleItem> {
    const all = this.loadAllAutomations();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('Không tìm thấy quy tắc tự động');
    }

    const current = all[index];
    const { workspaceId } = await this.verifyBoardAccess(current.board_id, userId, true);

    const updated: AutomationRuleItem = {
      ...current,
      name: dto.name !== undefined ? dto.name.trim() : current.name,
      description: dto.description !== undefined ? dto.description?.trim() || null : current.description,
      type: dto.type ?? current.type,
      is_enabled: dto.is_enabled !== undefined ? dto.is_enabled : current.is_enabled,
      button_icon: dto.button_icon ?? current.button_icon,
      button_label: dto.button_label !== undefined ? dto.button_label?.trim() : current.button_label,
      trigger_type: dto.trigger_type ?? current.trigger_type,
      trigger_config: dto.trigger_config ?? current.trigger_config,
      conditions: dto.conditions ?? current.conditions,
      actions: dto.actions
        ? dto.actions.map((act) => ({
            id: act.id || randomUUID(),
            type: act.type,
            params: act.params || {},
          }))
        : current.actions,
      updated_at: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveAllAutomations(all);

    // Sync to Supabase
    try {
      await this.supabase
        .from('automation_rules')
        .update({
          name: updated.name,
          is_active: updated.is_enabled,
        })
        .eq('id', id);
    } catch {}

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã cập nhật quy tắc tự động hóa "${updated.name}"`,
        targetType: `board:${current.board_id}`,
      });
    }

    this.supabase.emitBoardEvent(current.board_id, 'AUTOMATION_UPDATED', {
      automation: updated,
      senderId: userId,
    });

    return updated;
  }

  async delete(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const all = this.loadAllAutomations();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('Không tìm thấy quy tắc tự động');
    }

    const target = all[index];
    const { workspaceId } = await this.verifyBoardAccess(target.board_id, userId, true);

    all.splice(index, 1);
    this.saveAllAutomations(all);

    // Sync to Supabase
    try {
      await this.supabase.from('automation_rules').delete().eq('id', id);
    } catch {}

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã xóa quy tắc tự động hóa "${target.name}"`,
        targetType: `board:${target.board_id}`,
      });
    }

    this.supabase.emitBoardEvent(target.board_id, 'AUTOMATION_DELETED', {
      automationId: id,
      senderId: userId,
    });

    return { success: true, message: 'Đã xóa quy tắc tự động hóa' };
  }

  async toggle(id: string, userId: string): Promise<AutomationRuleItem> {
    const all = this.loadAllAutomations();
    const item = all.find((a) => a.id === id);
    if (!item) {
      throw new NotFoundException('Không tìm thấy quy tắc tự động');
    }
    return this.update(id, userId, { is_enabled: !item.is_enabled });
  }

  async duplicate(id: string, userId: string): Promise<AutomationRuleItem> {
    const item = await this.findById(id, userId);
    return this.create(item.board_id, userId, {
      name: `${item.name} (Bản sao)`,
      description: item.description || undefined,
      type: item.type,
      is_enabled: false, // Default duplicated rule is turned off so user can verify
      button_icon: item.button_icon,
      button_label: item.button_label ? `${item.button_label} (Bản sao)` : undefined,
      trigger_type: item.trigger_type,
      trigger_config: item.trigger_config,
      conditions: item.conditions,
      actions: item.actions,
    });
  }

  // ============================================================================
  // LOGS
  // ============================================================================

  async getExecutionLogs(boardId: string, userId: string, limit = 50): Promise<AutomationExecutionLog[]> {
    await this.verifyBoardAccess(boardId, userId, false);
    const logs = this.loadAllLogs();
    return logs
      .filter((l) => l.board_id === boardId)
      .slice(0, limit);
  }

  private recordExecutionLog(log: AutomationExecutionLog): void {
    const all = this.loadAllLogs();
    all.unshift(log);
    this.saveAllLogs(all);

    // Emit event so UI activity log tab updates in real-time
    this.supabase.emitBoardEvent(log.board_id, 'AUTOMATION_EXECUTED', { log });
  }

  // ============================================================================
  // EXECUTION ENGINE & MULTI-ACTION RUNNER
  // ============================================================================

  async executeAutomation(
    automationId: string,
    userId: string,
    cardId?: string,
  ): Promise<{ success: boolean; log: AutomationExecutionLog }> {
    const automation = await this.findById(automationId, userId);
    await this.verifyBoardAccess(automation.board_id, userId, true);

    return this.runActions(automation, userId, cardId, 'MANUAL_TRIGGER');
  }

  private async runActions(
    automation: AutomationRuleItem,
    actorId: string,
    cardId?: string,
    triggerEvent = 'EVENT',
    depth = 0,
  ): Promise<{ success: boolean; log: AutomationExecutionLog }> {
    const startedAt = new Date().toISOString();
    let actionsSucceeded = 0;
    const actionDetails: Array<{ type: string; status: 'SUCCESS' | 'FAILED'; error?: string }> = [];

    // Fetch actor details
    let actorName = 'Người dùng';
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', actorId)
        .maybeSingle();
      if (user?.name) actorName = user.name;
    } catch {}

    // Fetch card details if present
    let card: any = null;
    if (cardId) {
      try {
        const { data: c } = await this.supabase
          .from('cards')
          .select('*, list:lists(id, title, board_id)')
          .eq('id', cardId)
          .maybeSingle();
        card = c;
      } catch {}
    }

    // Process actions sequentially
    let lastError: string | null = null;
    for (const action of automation.actions) {
      try {
        await this.executeSingleAction(action, automation, card, actorId, actorName, depth);
        actionsSucceeded++;
        actionDetails.push({ type: action.type, status: 'SUCCESS' });
      } catch (err: any) {
        lastError = err?.message || 'Lỗi không xác định khi thực hiện hành động';
        actionDetails.push({ type: action.type, status: 'FAILED', error: lastError || undefined });
        this.logger.warn(`Action [${action.type}] failed in automation [${automation.name}]: ${lastError}`);
      }
    }

    const finishedAt = new Date().toISOString();
    const isFullSuccess = actionsSucceeded === automation.actions.length;
    const isPartial = actionsSucceeded > 0 && !isFullSuccess;
    const status: 'SUCCESS' | 'FAILED' | 'PARTIAL' = isFullSuccess
      ? 'SUCCESS'
      : isPartial
      ? 'PARTIAL'
      : 'FAILED';

    const log: AutomationExecutionLog = {
      id: randomUUID(),
      automation_id: automation.id,
      automation_name: automation.name,
      board_id: automation.board_id,
      trigger_event: triggerEvent,
      actor_id: actorId,
      actor_name: actorName,
      card_id: cardId || null,
      card_title: card?.title || null,
      status,
      actions_total: automation.actions.length,
      actions_succeeded: actionsSucceeded,
      error_message: lastError,
      details: { actionDetails },
      started_at: startedAt,
      finished_at: finishedAt,
    };

    this.recordExecutionLog(log);
    return { success: status !== 'FAILED', log };
  }

  private async executeSingleAction(
    action: { type: string; params: Record<string, any> },
    automation: AutomationRuleItem,
    card: any,
    actorId: string,
    actorName: string,
    depth: number,
  ) {
    const { type, params } = action;

    // Helper to replace dynamic variables
    const replaceVariables = (text: string): string => {
      if (!text) return text;
      const today = new Date();
      const dateStr = today.toLocaleDateString('vi-VN');
      const timeStr = today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      return text
        .replace(/\{\{card\.title\}\}/g, card?.title || 'Thẻ công việc')
        .replace(/\{\{card\.description\}\}/g, card?.description || '')
        .replace(/\{\{actor\.name\}\}/g, actorName || 'Hệ thống')
        .replace(/\{\{date\}\}/g, dateStr)
        .replace(/\{\{time\}\}/g, timeStr)
        .replace(/\{\{list\.name\}\}/g, card?.list?.title || 'Danh sách')
        .replace(/\{\{card\.due_date\}\}/g, card?.due_date ? new Date(card.due_date).toLocaleDateString('vi-VN') : '');
    };

    switch (type) {
      case 'MOVE_CARD': {
        if (!card?.id) break;
        const targetListId = params.targetListId || params.destination_list_id;
        if (!targetListId) break;

        // Fetch cards in target list to determine position
        const { data: targetCards } = await this.supabase
          .from('cards')
          .select('id, position')
          .eq('list_id', targetListId)
          .order('position', { ascending: true });

        const position = params.position === 'top' ? 0 : (targetCards?.length || 0);

        await this.supabase
          .from('cards')
          .update({ list_id: targetListId, position })
          .eq('id', card.id);

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_MOVED', {
          cardId: card.id,
          sourceListId: card.list_id,
          targetListId,
          position,
          senderId: actorId,
        });
        break;
      }

      case 'MARK_COMPLETED': {
        if (!card?.id) break;
        await this.supabase
          .from('cards')
          .update({ is_due_date_completed: true, status: 'DONE' })
          .eq('id', card.id);

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          updated: { is_due_date_completed: true, status: 'DONE' },
          senderId: actorId,
        });
        break;
      }

      case 'MARK_INCOMPLETE': {
        if (!card?.id) break;
        await this.supabase
          .from('cards')
          .update({ is_due_date_completed: false, status: 'TODO' })
          .eq('id', card.id);

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          updated: { is_due_date_completed: false, status: 'TODO' },
          senderId: actorId,
        });
        break;
      }

      case 'SET_DUE_DATE': {
        if (!card?.id) break;
        let dueDate: string | null = null;
        const offset = params.offset || params.days || 0;
        const targetDate = new Date();

        if (params.preset === 'today') {
          targetDate.setHours(23, 59, 59, 0);
          dueDate = targetDate.toISOString();
        } else if (params.preset === '+1_day') {
          targetDate.setDate(targetDate.getDate() + 1);
          targetDate.setHours(23, 59, 59, 0);
          dueDate = targetDate.toISOString();
        } else if (params.preset === '+3_days') {
          targetDate.setDate(targetDate.getDate() + 3);
          targetDate.setHours(23, 59, 59, 0);
          dueDate = targetDate.toISOString();
        } else if (params.preset === '+7_days') {
          targetDate.setDate(targetDate.getDate() + 7);
          targetDate.setHours(23, 59, 59, 0);
          dueDate = targetDate.toISOString();
        } else if (offset) {
          targetDate.setDate(targetDate.getDate() + Number(offset));
          targetDate.setHours(23, 59, 59, 0);
          dueDate = targetDate.toISOString();
        } else if (params.date) {
          dueDate = new Date(params.date).toISOString();
        }

        if (dueDate) {
          await this.supabase
            .from('cards')
            .update({ due_date: dueDate, is_due_date_completed: false })
            .eq('id', card.id);

          this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
            cardId: card.id,
            updated: { due_date: dueDate },
            senderId: actorId,
          });
        }
        break;
      }

      case 'ADD_LABEL': {
        if (!card?.id || !params.labelId) break;
        await this.supabase
          .from('card_labels')
          .insert({ card_id: card.id, label_id: params.labelId })
          .maybeSingle();

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          senderId: actorId,
        });
        break;
      }

      case 'REMOVE_LABEL': {
        if (!card?.id || !params.labelId) break;
        await this.supabase
          .from('card_labels')
          .delete()
          .eq('card_id', card.id)
          .eq('label_id', params.labelId);

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          senderId: actorId,
        });
        break;
      }

      case 'ASSIGN_MEMBER': {
        if (!card?.id) break;
        const memberId = params.memberId === 'current_user' ? actorId : params.memberId;
        if (!memberId) break;

        await this.supabase
          .from('card_assignees')
          .insert({ card_id: card.id, user_id: memberId })
          .maybeSingle();

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          senderId: actorId,
        });
        break;
      }

      case 'REMOVE_MEMBER': {
        if (!card?.id || !params.memberId) break;
        const memberId = params.memberId === 'current_user' ? actorId : params.memberId;

        await this.supabase
          .from('card_assignees')
          .delete()
          .eq('card_id', card.id)
          .eq('user_id', memberId);

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          senderId: actorId,
        });
        break;
      }

      case 'ADD_COMMENT': {
        if (!card?.id || !params.content) break;
        const content = replaceVariables(params.content);

        await this.supabase.from('comments').insert({
          card_id: card.id,
          user_id: actorId,
          content,
        });

        this.supabase.emitBoardEvent(automation.board_id, 'COMMENT_CREATED', {
          cardId: card.id,
          senderId: actorId,
        });
        break;
      }

      case 'ARCHIVE_CARD': {
        if (!card?.id) break;
        await this.supabase
          .from('cards')
          .update({ status: 'ARCHIVED' })
          .eq('id', card.id);

        this.supabase.emitBoardEvent(automation.board_id, 'CARD_UPDATED', {
          cardId: card.id,
          updated: { status: 'ARCHIVED' },
          senderId: actorId,
        });
        break;
      }

      case 'SEND_NOTIFICATION': {
        const message = replaceVariables(params.message || 'Một quy tắc tự động vừa được kích hoạt.');
        const title = replaceVariables(params.title || automation.name);

        // Notify creator or actor
        await this.notificationsService.createNotification({
          userId: actorId,
          title,
          message,
          type: 'AUTOMATION',
        });
        break;
      }

      case 'SORT_LIST': {
        const targetListId = params.listId || card?.list_id;
        if (!targetListId) break;

        const { data: listCards } = await this.supabase
          .from('cards')
          .select('id, due_date, created_at, position')
          .eq('list_id', targetListId);

        if (listCards && listCards.length > 0) {
          const sorted = [...listCards].sort((a, b) => {
            if (params.sortBy === 'due_date') {
              if (!a.due_date) return 1;
              if (!b.due_date) return -1;
              return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });

          for (let i = 0; i < sorted.length; i++) {
            await this.supabase
              .from('cards')
              .update({ position: i })
              .eq('id', sorted[i].id);
          }

          this.supabase.emitBoardEvent(automation.board_id, 'CARDS_REORDERED', {
            listId: targetListId,
            senderId: actorId,
          });
        }
        break;
      }

      case 'ARCHIVE_ALL_COMPLETED': {
        // Find all completed cards in this board
        const { data: boardLists } = await this.supabase
          .from('lists')
          .select('id')
          .eq('board_id', automation.board_id);

        if (boardLists && boardLists.length > 0) {
          const listIds = boardLists.map((l) => l.id);
          const { data: doneCards } = await this.supabase
            .from('cards')
            .select('id')
            .in('list_id', listIds)
            .or('is_due_date_completed.eq.true,status.eq.DONE');

          if (doneCards && doneCards.length > 0) {
            for (const c of doneCards) {
              await this.supabase
                .from('cards')
                .update({ status: 'ARCHIVED' })
                .eq('id', c.id);
            }

            this.supabase.emitBoardEvent(automation.board_id, 'CARDS_ARCHIVED', {
              count: doneCards.length,
              senderId: actorId,
            });
          }
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled action type: ${type}`);
    }
  }

  // ============================================================================
  // EVENT TRIGGER MATCHER (Hooked into Cards & Checklists events)
  // ============================================================================

  async triggerByEvent(
    boardId: string,
    eventType: string,
    context: {
      cardId?: string;
      sourceListId?: string;
      targetListId?: string;
      listId?: string;
      cardData?: any;
    },
    actorId?: string,
    depth = 0,
  ): Promise<void> {
    // ANTI-LOOP PROTECTION: Halt recursion if depth exceeds 3
    if (depth >= 3) {
      this.logger.warn(`🛑 Anti-loop protection triggered: Max depth 3 reached for board [${boardId}]. Halting.`);
      return;
    }

    const all = this.loadAllAutomations();
    const matchingAutomations = all.filter(
      (a) => a.board_id === boardId && a.is_enabled && a.trigger_type === eventType,
    );

    if (matchingAutomations.length === 0) return;

    for (const auto of matchingAutomations) {
      // 1. Verify Trigger Config filters
      if (eventType === 'CARD_MOVED') {
        const conf = auto.trigger_config || {};
        if (conf.source_list_id && conf.source_list_id !== context.sourceListId) {
          continue;
        }
        if (conf.destination_list_id && conf.destination_list_id !== context.targetListId) {
          continue;
        }
      }

      if (eventType === 'CARD_CREATED') {
        const conf = auto.trigger_config || {};
        if (conf.list_id && conf.list_id !== context.listId) {
          continue;
        }
      }

      // 2. Verify Conditions (All conditions must be satisfied)
      let conditionsMet = true;
      if (auto.conditions && auto.conditions.length > 0 && context.cardId) {
        // Fetch card to evaluate conditions
        const { data: card } = await this.supabase
          .from('cards')
          .select('*, card_labels(label_id), card_assignees(user_id)')
          .eq('id', context.cardId)
          .maybeSingle();

        if (card) {
          for (const cond of auto.conditions) {
            if (cond.field === 'is_completed') {
              const val = Boolean(cond.value);
              if (Boolean(card.is_due_date_completed) !== val) {
                conditionsMet = false;
                break;
              }
            } else if (cond.field === 'list_id') {
              if (cond.operator === 'equals' && card.list_id !== cond.value) {
                conditionsMet = false;
                break;
              } else if (cond.operator === 'not_equals' && card.list_id === cond.value) {
                conditionsMet = false;
                break;
              }
            } else if (cond.field === 'has_label') {
              const has = (card.card_labels || []).some((l: any) => l.label_id === cond.value);
              if (!has) {
                conditionsMet = false;
                break;
              }
            }
          }
        }
      }

      if (!conditionsMet) continue;

      // 3. Execute actions for matching automation
      const effectiveActor = actorId || auto.created_by || '00000000-0000-0000-0000-000000000000';
      await this.runActions(auto, effectiveActor, context.cardId, eventType, depth + 1);
    }
  }

  // ============================================================================
  // PREBUILT TEMPLATES LIBRARY
  // ============================================================================

  getTemplates() {
    return [
      {
        id: 'tpl-1',
        name: 'Tự gán người tạo vào thẻ mới',
        description: 'Khi một thẻ mới được tạo, tự động gán người tạo làm thành viên phụ trách thẻ.',
        type: 'RULE',
        trigger_type: 'CARD_CREATED',
        trigger_config: {},
        conditions: [],
        actions: [
          {
            type: 'ASSIGN_MEMBER',
            params: { memberId: 'current_user' },
          },
        ],
      },
      {
        id: 'tpl-2',
        name: 'Đánh dấu hoàn thành khi chuyển sang Đã xong',
        description: 'Tự động đánh dấu hoàn tất hạn chót và thêm bình luận xác nhận khi thẻ vào danh sách Hoàn thành.',
        type: 'RULE',
        trigger_type: 'CARD_MOVED',
        trigger_config: {},
        conditions: [],
        actions: [
          {
            type: 'MARK_COMPLETED',
            params: {},
          },
          {
            type: 'ADD_COMMENT',
            params: { content: 'Thẻ đã được đánh dấu hoàn thành bởi {{actor.name}} vào ngày {{date}} lúc {{time}}.' },
          },
        ],
      },
      {
        id: 'tpl-3',
        name: 'Hoàn tất thẻ khi xong Checklist',
        description: 'Khi toàn bộ các mục trong Checklist được tích chọn, tự động đánh dấu hoàn thành thẻ.',
        type: 'RULE',
        trigger_type: 'CHECKLIST_COMPLETED',
        trigger_config: {},
        conditions: [],
        actions: [
          {
            type: 'MARK_COMPLETED',
            params: {},
          },
        ],
      },
      {
        id: 'tpl-4',
        name: 'Nhắc việc trước hạn 1 ngày',
        description: 'Trước hạn chót 1 ngày, gửi thông báo nhắc nhở tới người phụ trách.',
        type: 'DUE_DATE',
        trigger_type: 'DUE_DATE_APPROACHING',
        trigger_config: { offset_days: 1, direction: 'before' },
        conditions: [{ field: 'is_completed', operator: 'equals', value: false }],
        actions: [
          {
            type: 'SEND_NOTIFICATION',
            params: {
              title: 'Nhắc nhở hạn chót',
              message: 'Thẻ "{{card.title}}" sắp hết hạn vào ngày mai. Vui lòng kiểm tra tiến độ!',
            },
          },
        ],
      },
      {
        id: 'tpl-5',
        name: 'Nút: Hoàn tất công việc',
        description: 'Nút trên thẻ: 1-click đánh dấu xong thẻ, thêm bình luận và gửi thông báo hoàn tất.',
        type: 'CARD_BUTTON',
        button_icon: 'CheckCircle',
        button_label: 'Hoàn tất công việc',
        trigger_type: 'CARD_BUTTON_CLICKED',
        trigger_config: {},
        conditions: [],
        actions: [
          { type: 'MARK_COMPLETED', params: {} },
          {
            type: 'ADD_COMMENT',
            params: { content: '✅ {{actor.name}} đã hoàn tất công việc này vào {{date}}.' },
          },
        ],
      },
      {
        id: 'tpl-6',
        name: 'Nút: Dọn dẹp thẻ hoàn thành',
        description: 'Nút trên thanh công cụ Bảng: Lưu trữ toàn bộ các thẻ đã hoàn tất trên toàn bộ bảng.',
        type: 'BOARD_BUTTON',
        button_icon: 'Archive',
        button_label: 'Dọn dẹp bảng',
        trigger_type: 'BOARD_BUTTON_CLICKED',
        trigger_config: {},
        conditions: [],
        actions: [
          { type: 'ARCHIVE_ALL_COMPLETED', params: {} },
        ],
      },
      {
        id: 'tpl-7',
        name: 'Nút: Sắp xếp theo hạn chót',
        description: 'Nút trên thanh công cụ Bảng: Sắp xếp các thẻ theo ngày hết hạn gần nhất lên trước.',
        type: 'BOARD_BUTTON',
        button_icon: 'ArrowDownUp',
        button_label: 'Sắp xếp theo hạn',
        trigger_type: 'BOARD_BUTTON_CLICKED',
        trigger_config: {},
        conditions: [],
        actions: [
          { type: 'SORT_LIST', params: { sortBy: 'due_date' } },
        ],
      },
    ];
  }
}
