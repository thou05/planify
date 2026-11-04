import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { SetCustomFieldValueDto } from './dto/set-custom-field-value.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  private getOptionsFilePath(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'custom_field_options.json');
  }

  private loadAllOptions(): Record<string, string[]> {
    try {
      const file = this.getOptionsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw) || {};
      }
    } catch {}
    return {};
  }

  private saveAllOptions(data: Record<string, string[]>): void {
    try {
      const file = this.getOptionsFilePath();
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  }

  private getStoredOptions(fieldId: string): string[] | null {
    const map = this.loadAllOptions();
    return map[fieldId] || null;
  }

  private setStoredOptions(fieldId: string, options: string[]): void {
    const map = this.loadAllOptions();
    map[fieldId] = options;
    this.saveAllOptions(map);
  }

  private deleteStoredOptions(fieldId: string): void {
    const map = this.loadAllOptions();
    delete map[fieldId];
    this.saveAllOptions(map);
  }

  private getDefaultDropdownOptions(fieldName: string): string[] {
    const lower = fieldName.toLowerCase();
    if (lower.includes('môi trường') || lower.includes('env')) {
      return ['Development', 'Staging', 'Production'];
    }
    if (lower.includes('trạng thái') || lower.includes('phê duyệt')) {
      return ['Chờ duyệt', 'Đã duyệt', 'Cần sửa đổi', 'Từ chối'];
    }
    if (lower.includes('mức độ') || lower.includes('nghiêm trọng') || lower.includes('severity')) {
      return ['Thấp', 'Trung bình', 'Cao', 'Nghiêm trọng'];
    }
    if (lower.includes('kênh')) {
      return ['Facebook Ads', 'Google Ads', 'SEO/Blog', 'Email Marketing', 'Tiktok'];
    }
    return ['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3'];
  }

  private async verifyBoardAccess(boardId: string, userId: string, requireEdit = false) {
    const { data: board, error } = await this.supabase
      .from('boards')
      .select('id, workspace_id, visibility, workspace:workspaces (owner_id)')
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Bảng (Board)');
    }

    const isWorkspaceOwner = (board.workspace as any)?.owner_id === userId;
    if (isWorkspaceOwner) {
      return board;
    }

    // 1. Kiểm tra trực tiếp trong board_members
    const { data: boardMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (boardMember) {
      const canEdit =
        boardMember.role === 'ADMIN' ||
        boardMember.role === 'EDITOR' ||
        boardMember.role === 'MEMBER';
      if (requireEdit && !canEdit) {
        throw new ForbiddenException('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa trường tùy chỉnh');
      }
      return board;
    }

    // 2. Kiểm tra trong workspace_members
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
        throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
      }
      if (requireEdit) {
        throw new ForbiddenException('Bạn cần tham gia Bảng với quyền Biên tập viên (Editor) hoặc Quản trị viên (Admin) để chỉnh sửa trường tùy chỉnh');
      }
      return board;
    }

    if (board.visibility === 'PUBLIC' && !requireEdit) {
      return board;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
  }

  private async verifyCardAccess(cardId: string, userId: string, requireEdit = false) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, title, list_id, list:lists (board_id, board:boards (workspace_id))')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const boardId = (card.list as any)?.board_id;
    const workspaceId = (card.list as any)?.board?.workspace_id;
    if (boardId) {
      await this.verifyBoardAccess(boardId, userId, requireEdit);
    }

    return { card, boardId, workspaceId };
  }

  // ==========================================
  // BOARD CUSTOM FIELDS CRUD
  // ==========================================

  async getBoardCustomFields(boardId: string, userId: string) {
    await this.verifyBoardAccess(boardId, userId, false);

    const { data: fields, error } = await this.supabase
      .from('custom_fields')
      .select('id, board_id, name, field_type')
      .eq('board_id', boardId)
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách trường tùy chỉnh');
    }

    const optionsMap = this.loadAllOptions();

    const result = (fields || []).map((f) => {
      let options: string[] | undefined = undefined;
      if (f.field_type === 'DROPDOWN') {
        const stored = (f as any).options || optionsMap[f.id];
        options = (stored && stored.length > 0) ? stored : this.getDefaultDropdownOptions(f.name);
      }
      return {
        ...f,
        options,
      };
    });

    return result;
  }

  async createCustomField(boardId: string, userId: string, dto: CreateCustomFieldDto) {
    const board = await this.verifyBoardAccess(boardId, userId, true);
    const cleanName = dto.name.trim();

    // Kiểm tra tên trùng lặp trên cùng Board
    const { data: existing } = await this.supabase
      .from('custom_fields')
      .select('id')
      .eq('board_id', boardId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(`Trường tùy chỉnh "${cleanName}" đã tồn tại trong bảng này`);
    }

    const { data: created, error } = await this.supabase
      .from('custom_fields')
      .insert({
        board_id: boardId,
        name: cleanName,
        field_type: dto.field_type.toUpperCase(),
      })
      .select('id, board_id, name, field_type')
      .single();

    if (error || !created) {
      throw new BadRequestException(error?.message || 'Không thể tạo trường tùy chỉnh');
    }

    let finalOptions: string[] | undefined = undefined;
    if (created.field_type === 'DROPDOWN') {
      if (dto.options && dto.options.length > 0) {
        finalOptions = dto.options.map((o) => o.trim()).filter(Boolean);
      } else {
        finalOptions = this.getDefaultDropdownOptions(cleanName);
      }
      this.setStoredOptions(created.id, finalOptions);

      // Thử cập nhật lên Supabase nếu đã chạy migration
      try {
        await this.supabase
          .from('custom_fields')
          .update({ options: finalOptions })
          .eq('id', created.id);
      } catch {}
    }

    const responseField = {
      ...created,
      options: finalOptions,
    };

    // Ghi log hoạt động
    if (board.workspace_id) {
      await this.activitiesService.logActivity({
        workspaceId: board.workspace_id,
        userId,
        action: `đã tạo trường tùy chỉnh "${cleanName}" (${dto.field_type})`,
        targetType: `custom_field:${created.id}`,
      });
    }

    this.supabase.emitBoardEvent(boardId, 'CUSTOM_FIELD_CREATED', {
      field: responseField,
      senderId: userId,
    });

    return responseField;
  }

  async updateCustomField(id: string, userId: string, dto: UpdateCustomFieldDto) {
    const { data: currentField, error: fError } = await this.supabase
      .from('custom_fields')
      .select('id, board_id, name, field_type, board:boards (workspace_id)')
      .eq('id', id)
      .maybeSingle();

    if (fError || !currentField) {
      throw new NotFoundException('Không tìm thấy trường tùy chỉnh');
    }

    const boardId = currentField.board_id;
    const workspaceId = (currentField.board as any)?.workspace_id;
    await this.verifyBoardAccess(boardId, userId, true);

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      const cleanName = dto.name.trim();
      if (!cleanName) {
        throw new BadRequestException('Tên trường tùy chỉnh không được để trống');
      }

      // Check unique name
      const { data: duplicate } = await this.supabase
        .from('custom_fields')
        .select('id')
        .eq('board_id', boardId)
        .ilike('name', cleanName)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        throw new BadRequestException(`Trường tùy chỉnh "${cleanName}" đã tồn tại trong bảng này`);
      }

      updateData.name = cleanName;
    }

    if (dto.field_type !== undefined) {
      updateData.field_type = dto.field_type.toUpperCase();
    }

    let updated: any = currentField;
    if (Object.keys(updateData).length > 0) {
      const { data: u, error } = await this.supabase
        .from('custom_fields')
        .update(updateData)
        .eq('id', id)
        .select('id, board_id, name, field_type')
        .single();

      if (error || !u) {
        throw new BadRequestException(error?.message || 'Không thể cập nhật trường tùy chỉnh');
      }
      updated = u;
    }

    let finalOptions: string[] | undefined = undefined;
    const targetType = updated.field_type || currentField.field_type;
    if (targetType === 'DROPDOWN') {
      if (dto.options !== undefined) {
        finalOptions = dto.options.map((o) => o.trim()).filter(Boolean);
        this.setStoredOptions(id, finalOptions);

        try {
          await this.supabase
            .from('custom_fields')
            .update({ options: finalOptions })
            .eq('id', id);
        } catch {}
      } else {
        finalOptions = this.getStoredOptions(id) || this.getDefaultDropdownOptions(updated.name);
      }
    }

    const responseField = {
      ...updated,
      options: finalOptions,
    };

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã cập nhật trường tùy chỉnh "${updated.name}"`,
        targetType: `custom_field:${updated.id}`,
      });
    }

    this.supabase.emitBoardEvent(boardId, 'CUSTOM_FIELD_UPDATED', {
      field: responseField,
      senderId: userId,
    });

    return responseField;
  }

  async deleteCustomField(id: string, userId: string) {
    const { data: currentField, error: fError } = await this.supabase
      .from('custom_fields')
      .select('id, board_id, name, board:boards (workspace_id)')
      .eq('id', id)
      .maybeSingle();

    if (fError || !currentField) {
      throw new NotFoundException('Không tìm thấy trường tùy chỉnh');
    }

    const boardId = currentField.board_id;
    const workspaceId = (currentField.board as any)?.workspace_id;
    await this.verifyBoardAccess(boardId, userId, true);

    const { error } = await this.supabase
      .from('custom_fields')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message || 'Không thể xóa trường tùy chỉnh');
    }

    this.deleteStoredOptions(id);

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã xóa trường tùy chỉnh "${currentField.name}" khỏi bảng`,
        targetType: `board:${boardId}`,
      });
    }

    this.supabase.emitBoardEvent(boardId, 'CUSTOM_FIELD_DELETED', {
      fieldId: id,
      senderId: userId,
    });

    return { success: true, message: 'Đã xóa trường tùy chỉnh thành công' };
  }

  // ==========================================
  // CARD CUSTOM FIELD VALUES CRUD
  // ==========================================

  async getCardCustomFieldValues(cardId: string, userId: string) {
    await this.verifyCardAccess(cardId, userId, false);

    const { data: values, error } = await this.supabase
      .from('custom_field_values')
      .select(`
        id,
        card_id,
        field_id,
        value,
        field:custom_fields (
          id,
          board_id,
          name,
          field_type
        )
      `)
      .eq('card_id', cardId);

    if (error) {
      throw new BadRequestException(error.message || 'Không thể lấy giá trị trường tùy chỉnh của thẻ');
    }

    return values || [];
  }

  async setCardCustomFieldValue(
    cardId: string,
    fieldId: string,
    userId: string,
    dto: SetCustomFieldValueDto,
  ) {
    const { card, boardId, workspaceId } = await this.verifyCardAccess(cardId, userId, true);

    // Verify custom field belongs to the same board
    const { data: field, error: fErr } = await this.supabase
      .from('custom_fields')
      .select('id, board_id, name, field_type')
      .eq('id', fieldId)
      .maybeSingle();

    if (fErr || !field || field.board_id !== boardId) {
      throw new NotFoundException('Không tìm thấy trường tùy chỉnh thuộc bảng này');
    }

    // Nếu giá trị là null, undefined hoặc chuỗi rỗng (ngoại trừ checkbox false)
    const rawVal = dto.value;
    const isCleared =
      rawVal === null ||
      rawVal === undefined ||
      (typeof rawVal === 'string' && rawVal.trim() === '' && field.field_type !== 'CHECKBOX');

    if (isCleared) {
      // Xóa giá trị hiện tại
      await this.supabase
        .from('custom_field_values')
        .delete()
        .eq('card_id', cardId)
        .eq('field_id', fieldId);

      this.supabase.emitBoardEvent(boardId, 'CARD_CUSTOM_FIELD_DELETED', {
        cardId,
        fieldId,
        senderId: userId,
      });

      return { success: true, cleared: true, field_id: fieldId };
    }

    // Chuẩn hóa và xác thực dữ liệu theo kiểu trường
    let normalizedValue = '';
    switch (field.field_type) {
      case 'NUMBER': {
        const num = Number(rawVal);
        if (isNaN(num)) {
          throw new BadRequestException(`Giá trị trường "${field.name}" phải là một số`);
        }
        normalizedValue = String(rawVal).trim();
        break;
      }
      case 'RATING': {
        const rating = parseInt(String(rawVal), 10);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          throw new BadRequestException(`Đánh giá sao phải từ 1 đến 5`);
        }
        normalizedValue = String(rating);
        break;
      }
      case 'PERCENT': {
        const pct = Math.min(100, Math.max(0, Math.round(Number(rawVal))));
        if (isNaN(pct)) {
          throw new BadRequestException(`Giá trị tiến độ phải là một số từ 0 đến 100`);
        }
        normalizedValue = String(pct);
        break;
      }
      case 'CURRENCY': {
        const cleaned = String(rawVal).replace(/[^0-9.-]/g, '');
        const amount = Number(cleaned);
        if (isNaN(amount)) {
          throw new BadRequestException(`Số tiền không hợp lệ`);
        }
        normalizedValue = String(amount);
        break;
      }
      case 'CHECKBOX': {
        const boolVal = rawVal === true || rawVal === 'true' || rawVal === 1 || rawVal === '1';
        normalizedValue = boolVal ? 'true' : 'false';
        break;
      }
      case 'DATE': {
        const dateObj = new Date(rawVal);
        if (isNaN(dateObj.getTime())) {
          throw new BadRequestException(`Giá trị trường "${field.name}" phải là định dạng ngày hợp lệ`);
        }
        normalizedValue = typeof rawVal === 'string' ? rawVal.trim() : dateObj.toISOString();
        break;
      }
      case 'URL': {
        let urlStr = String(rawVal).trim();
        if (urlStr && !/^https?:\/\//i.test(urlStr)) {
          urlStr = 'https://' + urlStr;
        }
        normalizedValue = urlStr;
        break;
      }
      case 'EMAIL':
      case 'PHONE':
      case 'DROPDOWN':
      case 'PARAGRAPH':
      case 'TEXT':
      default: {
        normalizedValue = String(rawVal).trim();
        break;
      }
    }

    const { data: savedValue, error: sErr } = await this.supabase
      .from('custom_field_values')
      .upsert(
        {
          card_id: cardId,
          field_id: fieldId,
          value: normalizedValue,
        },
        { onConflict: 'card_id,field_id' },
      )
      .select(`
        id,
        card_id,
        field_id,
        value,
        field:custom_fields (
          id,
          board_id,
          name,
          field_type
        )
      `)
      .single();

    if (sErr || !savedValue) {
      throw new BadRequestException(sErr?.message || 'Không thể lưu giá trị trường tùy chỉnh');
    }

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã đặt giá trị trường "${field.name}" trên thẻ "${card.title}"`,
        targetType: `card:${cardId}`,
      });
    }

    this.supabase.emitBoardEvent(boardId, 'CARD_CUSTOM_FIELD_UPDATED', {
      cardId,
      fieldId,
      value: normalizedValue,
      customFieldValue: savedValue,
      senderId: userId,
    });

    return savedValue;
  }

  async deleteCardCustomFieldValue(cardId: string, fieldId: string, userId: string) {
    const { boardId } = await this.verifyCardAccess(cardId, userId, true);

    const { error } = await this.supabase
      .from('custom_field_values')
      .delete()
      .eq('card_id', cardId)
      .eq('field_id', fieldId);

    if (error) {
      throw new BadRequestException(error.message || 'Không thể xóa giá trị trường tùy chỉnh');
    }

    this.supabase.emitBoardEvent(boardId, 'CARD_CUSTOM_FIELD_DELETED', {
      cardId,
      fieldId,
      senderId: userId,
    });

    return { success: true };
  }
}
