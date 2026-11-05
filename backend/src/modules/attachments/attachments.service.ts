import { assertBoardWritable } from '../../common/board-access';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateLinkAttachmentDto } from './dto/create-link-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

export interface UploadedFileType {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private bucketChecked = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) { }

  private async ensureBucket() {
    if (this.bucketChecked) return;
    try {
      const { data: buckets } = await this.supabase.client.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === 'attachments');
      if (!exists) {
        await this.supabase.client.storage.createBucket('attachments', {
          public: true,
          fileSizeLimit: 25 * 1024 * 1024, // 25MB
        });
      }
      this.bucketChecked = true;
    } catch (err: any) {
      this.logger.warn(`Storage bucket check note: ${err.message}`);
    }
  }

  async verifyCardAccess(cardId: string, userId: string, requireEdit = true) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, list_id, list:lists (board_id, board:boards (id, name, visibility, workspace_id, workspace:workspaces (owner_id)))')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const board = (card.list as any)?.board;
    if (!board) {
      throw new NotFoundException('Không tìm thấy Bảng chứa thẻ này');
    }

    if (requireEdit) await assertBoardWritable(this.supabase, board.id);
    const isWorkspaceOwner = board.workspace?.owner_id === userId;
    if (isWorkspaceOwner) {
      return { card, board, canEdit: true };
    }

    const { data: boardMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', board.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (boardMember) {
      const canEdit = boardMember.role === 'ADMIN' || boardMember.role === 'EDITOR' || boardMember.role === 'MEMBER';
      if (requireEdit && !canEdit) {
        throw new ForbiddenException('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa tệp đính kèm');
      }
      return { card, board, canEdit };
    }

    if (requireEdit) {
      throw new ForbiddenException('Bạn chưa tham gia vào Bảng này hoặc không có quyền chỉnh sửa');
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
        throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
      }
      return { card, board, canEdit: false };
    }

    if (board.visibility === 'PUBLIC') {
      return { card, board, canEdit: false };
    }

    throw new ForbiddenException('Bạn không có quyền thao tác trên thẻ này');
  }

  async findByCardId(cardId: string, userId?: string) {
    if (userId) {
      await this.verifyCardAccess(cardId, userId, false);
    }
    const { data, error } = await this.supabase
      .from('attachments')
      .select('*')
      .eq('card_id', cardId);

    if (error) {
      this.logger.error(`Error fetching attachments: ${error.message}`);
      throw new InternalServerErrorException('Không thể lấy danh sách đính kèm');
    }

    return data || [];
  }

  async uploadFile(cardId: string, file: UploadedFileType, userId?: string) {
    if (userId) {
      await this.verifyCardAccess(cardId, userId, true);
    }
    if (!file || !file.originalname || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp tin hợp lệ để tải lên');
    }

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `Dung lượng tệp "${file.originalname}" vượt quá giới hạn 25MB (${sizeMb}MB). Vui lòng chọn tệp nhỏ hơn.`,
      );
    }

    await this.ensureBucket();

    // Sanitize file name for path
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `cards/${cardId}/${Date.now()}-${sanitizedName}`;

    let publicUrl = '';

    try {
      const { data: uploadData, error: uploadError } = await this.supabase.client.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        this.logger.warn(`Upload to bucket error, fallback to data URI: ${uploadError.message}`);
        publicUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      } else {
        const { data: urlData } = this.supabase.client.storage
          .from('attachments')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }
    } catch (err: any) {
      this.logger.warn(`Storage exception, using fallback: ${err.message}`);
      publicUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const { data, error } = await this.supabase
      .from('attachments')
      .insert({
        card_id: cardId,
        file_name: file.originalname,
        file_url: publicUrl,
        file_size: file.size,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error inserting attachment row: ${error.message}`);
      throw new InternalServerErrorException('Không thể lưu thông tin đính kèm');
    }

    const { data: c } = await this.supabase.from('cards').select('list:lists(board_id, board:boards(workspace_id))').eq('id', cardId).maybeSingle();
    const wsId = (c?.list as any)?.board?.workspace_id;
    const boardId = (c?.list as any)?.board_id;

    if (userId && wsId) {
      await this.activitiesService.logActivity({
        workspaceId: wsId,
        userId,
        action: `đã đính kèm tệp "${file.originalname}"`,
        targetType: `card:${cardId}`,
      });
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
    }

    return data;
  }

  async createLink(cardId: string, dto: CreateLinkAttachmentDto, userId?: string) {
    if (userId) {
      await this.verifyCardAccess(cardId, userId, true);
    }
    let url = (dto.file_url || '').trim();
    if (!url) {
      throw new BadRequestException('Vui lòng cung cấp liên kết URL');
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('Chỉ hỗ trợ liên kết HTTP hoặc HTTPS');
      }
    } catch {
      throw new BadRequestException('Định dạng URL không hợp lệ');
    }

    const { data, error } = await this.supabase
      .from('attachments')
      .insert({
        card_id: cardId,
        file_name: dto.file_name.trim(),
        file_url: url,
        file_size: null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error inserting link attachment: ${error.message}`);
      throw new InternalServerErrorException('Không thể tạo đính kèm liên kết');
    }

    const { data: c } = await this.supabase.from('cards').select('list:lists(board_id, board:boards(workspace_id))').eq('id', cardId).maybeSingle();
    const wsId = (c?.list as any)?.board?.workspace_id;
    const boardId = (c?.list as any)?.board_id;

    if (userId && wsId) {
      await this.activitiesService.logActivity({
        workspaceId: wsId,
        userId,
        action: `đã đính kèm liên kết "${dto.file_name.trim()}"`,
        targetType: `card:${cardId}`,
      });
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
    }

    return data;
  }

  async update(id: string, dto: UpdateAttachmentDto, userId?: string) {
    const { data: existing } = await this.supabase
      .from('attachments')
      .select('id, card_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    if (userId) {
      await this.verifyCardAccess(existing.card_id, userId, true);
    }

    const { data, error } = await this.supabase
      .from('attachments')
      .update({
        file_name: dto.file_name?.trim(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Error updating attachment: ${error?.message}`);
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    if (data?.card_id) {
      const { data: c } = await this.supabase.from('cards').select('list:lists(board_id)').eq('id', data.card_id).maybeSingle();
      const boardId = (c?.list as any)?.board_id;
      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId: data.card_id,
        });
      }
    }

    return data;
  }

  async delete(id: string, userId?: string) {
    const { data: att } = await this.supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!att) {
      return { success: true };
    }

    if (userId && att.card_id) {
      await this.verifyCardAccess(att.card_id, userId, true);
    }

    if (att.card_id) {
      const { data: c } = await this.supabase.from('cards').select('list:lists(board_id, board:boards(workspace_id))').eq('id', att.card_id).maybeSingle();
      const wsId = (c?.list as any)?.board?.workspace_id;
      const boardId = (c?.list as any)?.board_id;

      if (userId && wsId) {
        await this.activitiesService.logActivity({
          workspaceId: wsId,
          userId,
          action: `đã xóa tệp đính kèm "${att.file_name || 'tệp'}"`,
          targetType: `card:${att.card_id}`,
        });
      }

      if (boardId) {
        this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
          cardId: att.card_id,
          senderId: userId,
        });
      }
    }

    if (att.file_url && att.file_url.includes('/attachments/')) {
      try {
        const parts = att.file_url.split('/attachments/');
        if (parts[1]) {
          const storagePath = decodeURIComponent(parts[1].split('?')[0]);
          await this.supabase.client.storage.from('attachments').remove([storagePath]);
        }
      } catch (err: any) {
        this.logger.warn(`Storage delete note: ${err.message}`);
      }
    }

    const { error } = await this.supabase
      .from('attachments')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting attachment: ${error.message}`);
      throw new InternalServerErrorException('Không thể xóa tệp đính kèm');
    }

    return { success: true };
  }

  async download(id: string, res: any) {
    const { data: att, error } = await this.supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !att || !att.file_url) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    const fileName = att.file_name || 'attachment';

    // 1. Data URI fallback
    if (att.file_url.startsWith('data:')) {
      const matches = att.file_url.match(/^data:([A-Za-z0-9\-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        return res.send(buffer);
      }
    }

    // 2. Supabase Storage download
    if (att.file_url.includes('/attachments/')) {
      try {
        const parts = att.file_url.split('/attachments/');
        if (parts[1]) {
          const storagePath = decodeURIComponent(parts[1].split('?')[0]);
          const { data: fileData, error: downloadError } = await this.supabase.client.storage
            .from('attachments')
            .download(storagePath);

          if (!downloadError && fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            res.setHeader('Content-Type', fileData.type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            return res.send(buffer);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Storage download stream failed, falling back to redirect: ${err.message}`);
      }
    }

    // 3. Fallback redirect with download query parameter
    let downloadUrl = att.file_url;
    if (att.file_url.includes('/storage/v1/object/public/')) {
      const sep = att.file_url.includes('?') ? '&' : '?';
      downloadUrl = `${att.file_url}${sep}download=${encodeURIComponent(fileName)}`;
    }
    return res.redirect(downloadUrl);
  }
}
