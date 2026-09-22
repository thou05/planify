import {
  BadRequestException,
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
  ) {}

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

  async findByCardId(cardId: string) {
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
    if (!file || !file.originalname || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp tin hợp lệ để tải lên');
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

    if (userId) {
      const { data: c } = await this.supabase.from('cards').select('list:lists(board:boards(workspace_id))').eq('id', cardId).maybeSingle();
      const wsId = (c?.list as any)?.board?.workspace_id;
      if (wsId) {
        await this.activitiesService.logActivity({
          workspaceId: wsId,
          userId,
          action: `đã đính kèm tệp "${file.originalname}"`,
          targetType: `card:${cardId}`,
        });
      }
    }

    return data;
  }

  async createLink(cardId: string, dto: CreateLinkAttachmentDto, userId?: string) {
    let url = dto.file_url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
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

    if (userId) {
      const { data: c } = await this.supabase.from('cards').select('list:lists(board:boards(workspace_id))').eq('id', cardId).maybeSingle();
      const wsId = (c?.list as any)?.board?.workspace_id;
      if (wsId) {
        await this.activitiesService.logActivity({
          workspaceId: wsId,
          userId,
          action: `đã đính kèm liên kết "${dto.file_name.trim()}"`,
          targetType: `card:${cardId}`,
        });
      }
    }

    return data;
  }

  async update(id: string, dto: UpdateAttachmentDto) {
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
      const { data: c } = await this.supabase.from('cards').select('list:lists(board:boards(workspace_id))').eq('id', att.card_id).maybeSingle();
      const wsId = (c?.list as any)?.board?.workspace_id;
      if (wsId) {
        await this.activitiesService.logActivity({
          workspaceId: wsId,
          userId,
          action: `đã xóa tệp đính kèm "${att.file_name || 'tệp'}"`,
          targetType: `card:${att.card_id}`,
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
}
