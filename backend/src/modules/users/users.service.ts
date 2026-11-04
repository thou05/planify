import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const META_TAG_REGEX = /\n?<!--planify_profile_meta:([\s\S]*?)-->$/;

function parseUserWithMetadata(user: any) {
  let bio = user.bio || '';
  let meta: Record<string, any> = {};

  const match = bio.match(META_TAG_REGEX);
  if (match) {
    try {
      meta = JSON.parse(match[1]);
      bio = bio.replace(META_TAG_REGEX, '').trim();
    } catch {
      // fallback if json parse error
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    cover_image: user.cover_image || meta.cover_image || null,
    job_title: user.job_title || meta.job_title || '',
    department: user.department || meta.department || '',
    location: user.location || meta.location || '',
    website: user.website || meta.website || '',
    social_links: user.social_links || meta.social_links || null,
    work_status: user.work_status || meta.work_status || 'WORKING',
    bio: bio,
    timezone: user.timezone || 'Asia/Ho_Chi_Minh',
    language: user.language || 'vi',
    phone: user.phone || '',
    theme: user.theme || 'system',
    status: user.status,
    created_at: user.created_at,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Không trả về mật khẩu
    delete user.password_hash;

    return parseUserWithMetadata(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.cover_image !== undefined) updateData.cover_image = dto.cover_image;
    if (dto.job_title !== undefined) updateData.job_title = dto.job_title;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.social_links !== undefined) updateData.social_links = dto.social_links;
    if (dto.work_status !== undefined) updateData.work_status = dto.work_status;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.theme !== undefined) updateData.theme = dto.theme;

    let { data: updatedUser, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    // Fallback nếu các cột mới chưa có trong schema database (trước khi chạy migration SQL)
    const isSchemaError =
      error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache') ||
        error.message?.includes('column'));

    if (isSchemaError) {
      const existing = await this.findById(id);
      const meta = {
        cover_image: dto.cover_image !== undefined ? dto.cover_image : existing.cover_image,
        job_title: dto.job_title !== undefined ? dto.job_title : existing.job_title,
        department: dto.department !== undefined ? dto.department : existing.department,
        location: dto.location !== undefined ? dto.location : existing.location,
        website: dto.website !== undefined ? dto.website : existing.website,
        social_links: dto.social_links !== undefined ? dto.social_links : existing.social_links,
        work_status: dto.work_status !== undefined ? dto.work_status : existing.work_status,
      };

      const cleanBio = dto.bio !== undefined ? dto.bio.trim() : existing.bio;
      const combinedBio = cleanBio
        ? `${cleanBio}\n<!--planify_profile_meta:${JSON.stringify(meta)}-->`
        : `<!--planify_profile_meta:${JSON.stringify(meta)}-->`;

      const safeData: Record<string, any> = {
        bio: combinedBio,
      };
      if (dto.name !== undefined) safeData.name = dto.name.trim();
      if (dto.avatar !== undefined) safeData.avatar = dto.avatar;
      if (dto.timezone !== undefined) safeData.timezone = dto.timezone;
      if (dto.language !== undefined) safeData.language = dto.language;
      if (dto.phone !== undefined) safeData.phone = dto.phone;
      if (dto.theme !== undefined) safeData.theme = dto.theme;

      const { data: fallbackUser, error: fallbackError } = await this.supabase
        .from('users')
        .update(safeData)
        .eq('id', id)
        .select('*')
        .single();

      if (fallbackError || !fallbackUser) {
        throw new BadRequestException(fallbackError?.message || 'Không thể cập nhật hồ sơ');
      }
      delete fallbackUser.password_hash;
      return parseUserWithMetadata(fallbackUser);
    }

    if (error || !updatedUser) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật hồ sơ');
    }

    delete updatedUser.password_hash;
    return parseUserWithMetadata(updatedUser);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp ảnh đại diện hợp lệ');
    }

    const ALLOWED_MIMES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    if (!file.mimetype || !ALLOWED_MIMES[file.mimetype]) {
      throw new BadRequestException('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP, GIF');
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Dung lượng ảnh đại diện không được vượt quá 5MB');
    }

    let publicUrl = '';
    const ext = ALLOWED_MIMES[file.mimetype];
    const filePath = `users/${userId}/avatar-${Date.now()}.${ext}`;

    try {
      const { data: buckets } = await this.supabase.client.storage.listBuckets();
      if (!buckets?.some((b) => b.name === 'attachments')) {
        await this.supabase.client.storage.createBucket('attachments', { public: true });
      }

      const { error: uploadError } = await this.supabase.client.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype || 'image/png',
          upsert: true,
        });

      if (uploadError) {
        publicUrl = `data:${file.mimetype || 'image/png'};base64,${file.buffer.toString('base64')}`;
      } else {
        const { data: urlData } = this.supabase.client.storage
          .from('attachments')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }
    } catch {
      publicUrl = `data:${file.mimetype || 'image/png'};base64,${file.buffer.toString('base64')}`;
    }

    await this.updateProfile(userId, { avatar: publicUrl });

    return {
      success: true,
      url: publicUrl,
    };
  }

  async uploadCover(userId: string, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp ảnh bìa hợp lệ');
    }

    const ALLOWED_MIMES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    if (!file.mimetype || !ALLOWED_MIMES[file.mimetype]) {
      throw new BadRequestException('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP, GIF');
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Dung lượng ảnh bìa không được vượt quá 15MB');
    }

    let publicUrl = '';
    const ext = ALLOWED_MIMES[file.mimetype];
    const filePath = `users/${userId}/cover-${Date.now()}.${ext}`;

    try {
      const { data: buckets } = await this.supabase.client.storage.listBuckets();
      if (!buckets?.some((b) => b.name === 'attachments')) {
        await this.supabase.client.storage.createBucket('attachments', { public: true });
      }

      const { error: uploadError } = await this.supabase.client.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        publicUrl = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
      } else {
        const { data: urlData } = this.supabase.client.storage
          .from('attachments')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }
    } catch {
      publicUrl = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
    }

    await this.updateProfile(userId, { cover_image: publicUrl });

    return {
      success: true,
      url: publicUrl,
    };
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', id)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    if (!user.password_hash) {
      throw new BadRequestException('Tài khoản này chưa thiết lập mật khẩu truyền thống');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    const { error: updateError } = await this.supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', id);

    if (updateError) {
      throw new BadRequestException(updateError.message || 'Không thể đổi mật khẩu');
    }

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getUserInvitations(userId: string) {
    const user = await this.findById(userId);
    const email = user.email.toLowerCase().trim();
    const now = new Date().toISOString();

    // 1. Lời mời Workspace (lấy status = 'PENDING' hoặc null, kèm workspace & inviter)
    let workspaceInvites: any[] = [];
    try {
      const { data: wsInvites, error: wsError } = await this.supabase
        .from('workspace_invites')
        .select(`
          id,
          workspace_id,
          inviter_id,
          email,
          role,
          token,
          status,
          created_at,
          expired_at,
          workspace:workspaces (
            id,
            name,
            description
          ),
          inviter:users (
            id,
            name,
            email,
            avatar
          )
        `)
        .eq('email', email)
        .or('status.eq.PENDING,status.is.null')
        .gte('expired_at', now);

      if (wsError) {
        // Fallback query nếu quan hệ join inviter gặp lỗi
        const { data: rawWsInvites } = await this.supabase
          .from('workspace_invites')
          .select(`
            id,
            workspace_id,
            inviter_id,
            email,
            role,
            token,
            status,
            created_at,
            expired_at,
            workspace:workspaces (
              id,
              name,
              description
            )
          `)
          .eq('email', email)
          .gte('expired_at', now);

        const filtered = (rawWsInvites || []).filter(
          (inv: any) => !inv.status || inv.status === 'PENDING'
        );

        const inviterIds = [...new Set(filtered.map((i: any) => i.inviter_id).filter(Boolean))];
        const userMap = new Map();
        if (inviterIds.length > 0) {
          const { data: users } = await this.supabase
            .from('users')
            .select('id, name, email, avatar')
            .in('id', inviterIds);
          (users || []).forEach((u: any) => userMap.set(u.id, u));
        }

        workspaceInvites = filtered.map((inv: any) => ({
          ...inv,
          status: inv.status || 'PENDING',
          workspace: Array.isArray(inv.workspace) ? inv.workspace[0] : inv.workspace,
          inviter: inv.inviter_id ? (userMap.get(inv.inviter_id) || null) : null,
        }));
      } else if (wsInvites) {
        workspaceInvites = wsInvites.map((inv: any) => ({
          ...inv,
          status: inv.status || 'PENDING',
          workspace: Array.isArray(inv.workspace) ? inv.workspace[0] : inv.workspace,
          inviter: Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter,
        }));
      }
    } catch {
      workspaceInvites = [];
    }

    // 2. Lời mời Board (giữ nguyên logic hiện tại)
    let boardInvites: any[] = [];
    try {
      const { data: bInvites } = await this.supabase
        .from('board_invites')
        .select(`
          id,
          board_id,
          inviter_id,
          email,
          role,
          token,
          status,
          created_at,
          expired_at,
          board:boards (
            id,
            name,
            description,
            background,
            visibility,
            workspace_id,
            workspace:workspaces (
              id,
              name
            )
          ),
          inviter:users!fk_board_invite_inviter (
            id,
            name,
            email,
            avatar
          )
        `)
        .eq('email', email)
        .eq('status', 'PENDING')
        .gte('expired_at', now);

      if (bInvites) {
        boardInvites = bInvites;
      }
    } catch {
      // Bảng board_invites có thể chưa được migration trên Supabase
      boardInvites = [];
    }

    return {
      workspaceInvites,
      boardInvites,
    };
  }

  private inMemoryPreferences: Map<string, Record<string, boolean>> = new Map();

  async getNotificationPreferences(userId: string) {
    const defaultPrefs = {
      invitations: true,
      removals: true,
      assignments: true,
      mentions: true,
      due_reminders: true,
      comments: true,
    };

    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', userId)
        .maybeSingle();

      if (user?.notification_preferences && typeof user.notification_preferences === 'object') {
        return {
          ...defaultPrefs,
          ...user.notification_preferences,
        };
      }
    } catch {
      // Column might not exist yet
    }

    const cached = this.inMemoryPreferences.get(userId);
    return {
      ...defaultPrefs,
      ...(cached || {}),
    };
  }

  async updateNotificationPreferences(userId: string, dto: Record<string, any>) {
    const current = await this.getNotificationPreferences(userId);
    const updated = {
      ...current,
      ...dto,
    };

    this.inMemoryPreferences.set(userId, updated);

    try {
      await this.supabase
        .from('users')
        .update({ notification_preferences: updated })
        .eq('id', userId);
    } catch {
      // Column might not exist in database schema yet, in-memory cache handles it smoothly
    }

    return updated;
  }
}
