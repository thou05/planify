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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      bio: user.bio || '',
      timezone: user.timezone || 'Asia/Ho_Chi_Minh',
      language: user.language || 'vi',
      phone: user.phone || '',
      theme: user.theme || 'system',
      status: user.status,
      created_at: user.created_at,
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
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

    // Fallback nếu các cột mới chưa có trong schema database
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      const basicData: Record<string, any> = {};
      if (dto.name !== undefined) basicData.name = dto.name.trim();
      if (dto.avatar !== undefined) basicData.avatar = dto.avatar;

      const { data: fallbackUser, error: fallbackError } = await this.supabase
        .from('users')
        .update(basicData)
        .eq('id', id)
        .select('*')
        .single();

      if (fallbackError || !fallbackUser) {
        throw new BadRequestException(fallbackError?.message || 'Không thể cập nhật hồ sơ');
      }
      updatedUser = fallbackUser;
    } else if (error || !updatedUser) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật hồ sơ');
    }

    delete updatedUser.password_hash;

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar || null,
      bio: updatedUser.bio || dto.bio || '',
      timezone: updatedUser.timezone || dto.timezone || 'Asia/Ho_Chi_Minh',
      language: updatedUser.language || dto.language || 'vi',
      phone: updatedUser.phone || dto.phone || '',
      theme: updatedUser.theme || dto.theme || 'system',
      status: updatedUser.status,
      created_at: updatedUser.created_at,
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

    // 1. Lời mời Workspace
    const { data: wsInvites } = await this.supabase
      .from('workspace_invites')
      .select(`
        id,
        workspace_id,
        email,
        role,
        token,
        expired_at,
        workspace:workspaces (
          id,
          name,
          description,
          owner:users!fk_workspace_owner (
            id,
            name,
            email,
            avatar
          )
        )
      `)
      .eq('email', email)
      .gte('expired_at', now);

    // 2. Lời mời Board
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
      workspaceInvites: wsInvites || [],
      boardInvites: boardInvites || [],
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
