import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    // 1. Tạo workspace
    const { data: workspace, error: wsError } = await this.supabase
      .from('workspaces')
      .insert({
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        owner_id: userId,
      })
      .select()
      .single();

    if (wsError || !workspace) {
      throw new BadRequestException(wsError?.message || 'Không thể tạo Workspace');
    }

    // 2. Thêm owner vào workspace_members
    const { error: memberError } = await this.supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'OWNER',
      });

    if (memberError) {
      throw new BadRequestException(memberError.message);
    }

    await this.activitiesService.logActivity({
      workspaceId: workspace.id,
      userId,
      action: `đã tạo Không gian làm việc "${workspace.name}"`,
      targetType: `workspace:${workspace.id}`,
    });

    return this.findById(workspace.id, userId);
  }

  async findAllForUser(userId: string) {
    // Tìm các workspace_id mà user là member
    const { data: memberships } = await this.supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId);

    const memberWsIds = (memberships || []).map((m) => m.workspace_id);

    // Tìm các workspace mà user là owner HOẶC là member
    let query = this.supabase
      .from('workspaces')
      .select(`
        id,
        name,
        description,
        owner_id,
        created_at,
        owner:users!fk_workspace_owner (id, name, email, avatar),
        members:workspace_members (
          id,
          role,
          user_id,
          user:users (id, name, email, avatar)
        ),
        boards (id, name, description, is_favorite)
      `)
      .order('created_at', { ascending: false });

    if (memberWsIds.length > 0) {
      query = query.or(`owner_id.eq.${userId},id.in.(${memberWsIds.join(',')})`);
    } else {
      query = query.eq('owner_id', userId);
    }

    const { data: workspaces, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }

    // Gắn thêm vai trò của người dùng hiện tại (currentUserRole)
    const roleMap = new Map((memberships || []).map((m) => [m.workspace_id, m.role]));

    return (workspaces || []).map((ws: any) => ({
      ...ws,
      currentUserRole: ws.owner_id === userId ? 'OWNER' : roleMap.get(ws.id) || 'MEMBER',
      _count: {
        members: ws.members?.length || 0,
        boards: ws.boards?.length || 0,
      },
    }));
  }

  async findById(workspaceId: string, userId: string) {
    const { data: workspace, error } = await this.supabase
      .from('workspaces')
      .select(`
        id,
        name,
        description,
        owner_id,
        created_at,
        owner:users!fk_workspace_owner (id, name, email, avatar),
        members:workspace_members (
          id,
          role,
          user_id,
          joined_at,
          user:users (id, name, email, avatar)
        ),
        boards (
          id,
          name,
          description,
          is_favorite
        )
      `)
      .eq('id', workspaceId)
      .maybeSingle();

    if (error || !workspace) {
      throw new NotFoundException('Không tìm thấy Workspace');
    }

    const currentMember = (workspace.members || []).find((m: any) => m.user_id === userId);
    if (!currentMember && workspace.owner_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập Workspace này');
    }

    const currentUserRole = workspace.owner_id === userId ? 'OWNER' : currentMember?.role || 'MEMBER';

    return {
      ...workspace,
      currentUserRole,
      isOwner: workspace.owner_id === userId,
      isAdmin: currentUserRole === 'OWNER' || currentUserRole === 'ADMIN',
    };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    await this.checkAdminOrOwner(workspaceId, userId);

    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description ? dto.description.trim() : null;

    const { data: updated, error } = await this.supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật Workspace');
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId,
      action: `đã cập nhật thông tin Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_UPDATED', {
      workspace: updated,
      senderId: userId,
    });

    return updated;
  }

  async delete(workspaceId: string, userId: string) {
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace) {
      throw new NotFoundException('Không tìm thấy Workspace');
    }

    if (workspace.owner_id !== userId) {
      throw new ForbiddenException('Chỉ Chủ sở hữu (Owner) mới có quyền xóa Workspace');
    }

    const { error } = await this.supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Xóa Workspace thành công' };
  }

  async updateMemberRole(
    workspaceId: string,
    currentUserId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const { workspace, currentMember } = await this.getWorkspaceAndMember(workspaceId, currentUserId);

    if (workspace.owner_id !== currentUserId && currentMember.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Chủ sở hữu mới có quyền thay đổi vai trò');
    }

    if (targetUserId === workspace.owner_id) {
      throw new BadRequestException(
        'Không thể thay đổi vai trò của Chủ sở hữu. Hãy sử dụng chức năng Chuyển giao quyền sở hữu',
      );
    }

    const { data: targetMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!targetMember) {
      throw new NotFoundException('Không tìm thấy thành viên trong Workspace');
    }

    if (currentMember.role === 'ADMIN' && targetMember.role === 'ADMIN' && workspace.owner_id !== currentUserId) {
      throw new ForbiddenException('Admin không thể thay đổi vai trò của Admin khác');
    }

    const { data: updated, error } = await this.supabase
      .from('workspace_members')
      .update({ role: dto.role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .select(`
        id,
        role,
        user_id,
        user:users (id, name, email, avatar)
      `)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã đổi vai trò thành viên thành ${dto.role}`,
      targetType: `workspace:${workspaceId}`,
    });

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });

    return updated;
  }

  async transferOwnership(
    workspaceId: string,
    currentUserId: string,
    dto: TransferOwnershipDto,
  ) {
    const { workspace } = await this.getWorkspaceAndMember(workspaceId, currentUserId);

    if (workspace.owner_id !== currentUserId) {
      throw new ForbiddenException('Chỉ Chủ sở hữu (Owner) mới có quyền chuyển giao Workspace');
    }

    if (currentUserId === dto.newOwnerId) {
      throw new BadRequestException('Bạn đang là Chủ sở hữu của Workspace này');
    }

    const { data: newOwnerMember } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', dto.newOwnerId)
      .maybeSingle();

    if (!newOwnerMember) {
      throw new NotFoundException('Người dùng được chỉ định không phải là thành viên của Workspace');
    }

    // 1. Đổi owner_id trong bảng workspaces
    const { error: wsError } = await this.supabase
      .from('workspaces')
      .update({ owner_id: dto.newOwnerId })
      .eq('id', workspaceId);

    if (wsError) {
      throw new BadRequestException(wsError.message);
    }

    // 2. Cập nhật role trong workspace_members: chủ cũ thành ADMIN, chủ mới thành OWNER
    await this.supabase
      .from('workspace_members')
      .update({ role: 'ADMIN' })
      .eq('workspace_id', workspaceId)
      .eq('user_id', currentUserId);

    await this.supabase
      .from('workspace_members')
      .update({ role: 'OWNER' })
      .eq('workspace_id', workspaceId)
      .eq('user_id', dto.newOwnerId);

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã chuyển quyền Chủ sở hữu Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });

    return this.findById(workspaceId, currentUserId);
  }

  async leaveWorkspace(workspaceId: string, currentUserId: string) {
    const { workspace, currentMember } = await this.getWorkspaceAndMember(workspaceId, currentUserId);

    if (workspace.owner_id === currentUserId) {
      const { count } = await this.supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if ((count ?? 0) > 1) {
        throw new BadRequestException(
          'Bạn là Chủ sở hữu của Workspace. Vui lòng chuyển giao quyền Chủ sở hữu cho thành viên khác trước khi rời đi',
        );
      } else {
        throw new BadRequestException(
          'Bạn là thành viên duy nhất. Vui lòng chọn Xóa Workspace thay vì rời đi',
        );
      }
    }

    const { error } = await this.supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', currentUserId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã rời khỏi Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });
    this.supabase.emitUserEvent(currentUserId, 'USER_WORKSPACES_CHANGED', {});

    return { message: 'Bạn đã rời khỏi Workspace thành công' };
  }

  async addMember(workspaceId: string, currentUserId: string, dto: AddMemberDto) {
    await this.checkAdminOrOwner(workspaceId, currentUserId);

    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email, avatar')
      .eq('email', dto.email.toLowerCase().trim())
      .maybeSingle();

    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy người dùng với email này');
    }

    const { data: existingMember } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existingMember) {
      throw new ConflictException('Người dùng đã là thành viên của Workspace này');
    }

    const { data: newMember, error } = await this.supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        role: dto.role || 'MEMBER',
      })
      .select(`
        id,
        role,
        user_id,
        joined_at,
        user:users (id, name, email, avatar)
      `)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã thêm thành viên "${targetUser.name || targetUser.email}" vào Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    if (targetUser.id !== currentUserId) {
      const { data: ws } = await this.supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle();

      const wsName = ws?.name || 'Không gian làm việc';
      await this.notificationsService.createNotification({
        userId: targetUser.id,
        title: 'Lời mời vào Không gian làm việc',
        message: `Bạn đã được thêm vào không gian làm việc "${wsName}"||/workspace/${workspaceId}`,
        type: 'WORKSPACE_INVITE',
      }).catch(() => {});
    }

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });
    if (targetUser?.id) {
      this.supabase.emitUserEvent(targetUser.id, 'USER_WORKSPACES_CHANGED', {});
    }

    return newMember;
  }

  async createInvite(workspaceId: string, currentUserId: string, dto: InviteMemberDto) {
    await this.checkAdminOrOwner(workspaceId, currentUserId);
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Kiểm tra nếu người dùng đã có tài khoản
    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email, avatar')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (targetUser) {
      const { data: existingMember } = await this.supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (existingMember) {
        throw new ConflictException('Người dùng đã là thành viên của Workspace này');
      }

      if (dto.directAdd !== false) {
        // Thêm trực tiếp vào Workspace
        const { data: member, error } = await this.supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: targetUser.id,
            role: dto.role || 'MEMBER',
          })
          .select(`
            id,
            role,
            user_id,
            joined_at,
            user:users (id, name, email, avatar)
          `)
          .single();

        if (error) throw new BadRequestException(error.message);

        return {
          type: 'ADDED_DIRECTLY',
          message: 'Người dùng đã có tài khoản và được thêm trực tiếp vào Workspace!',
          member,
        };
      }
    }

    // 2. Tạo lời mời lưu vào bảng workspace_invites
    // Kiểm tra xem đã có lời mời chưa hết hạn cho email này hay chưa
    const { data: existingInvite } = await this.supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('email', normalizedEmail)
      .gt('expired_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return {
        type: 'INVITE_EXISTS',
        message: 'Đã có lời mời hợp lệ cho email này',
        invite: existingInvite,
      };
    }

    const token = randomUUID();
    const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 ngày

    const { data: invite, error } = await this.supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email: normalizedEmail,
        role: dto.role || 'MEMBER',
        token,
        expired_at: expiredAt,
      })
      .select()
      .single();

    if (error || !invite) {
      throw new BadRequestException(error?.message || 'Không thể tạo lời mời');
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã gửi lời mời tham gia tới ${normalizedEmail}`,
      targetType: `workspace:${workspaceId}`,
    });

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });

    return {
      type: 'INVITE_CREATED',
      message: 'Tạo lời mời thành công',
      invite,
    };
  }

  async getPendingInvites(workspaceId: string, currentUserId: string) {
    await this.checkAdminOrOwner(workspaceId, currentUserId);

    const { data: invites, error } = await this.supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gt('expired_at', new Date().toISOString())
      .order('expired_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return invites || [];
  }

  async revokeInvite(workspaceId: string, currentUserId: string, inviteId: string) {
    await this.checkAdminOrOwner(workspaceId, currentUserId);

    const { error } = await this.supabase
      .from('workspace_invites')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', inviteId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });

    return { message: 'Đã thu hồi lời mời thành công' };
  }

  async getInviteByToken(token: string) {
    const { data: invite, error } = await this.supabase
      .from('workspace_invites')
      .select(`
        id,
        email,
        role,
        token,
        expired_at,
        workspace:workspaces (
          id,
          name,
          description,
          owner:users!fk_workspace_owner (name, avatar)
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) {
      throw new NotFoundException('Lời mời không tồn tại hoặc đã bị thu hồi');
    }

    if (new Date(invite.expired_at) < new Date()) {
      throw new BadRequestException('Lời mời này đã hết hạn');
    }

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);
    const workspaceId = (invite.workspace as any).id;

    // Kiểm tra xem user đã là member chưa
    const { data: existingMember } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingMember) {
      const { error: insertError } = await this.supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: invite.role,
        });

      if (insertError) {
        throw new BadRequestException(insertError.message);
      }
    }

    // Xóa lời mời sau khi chấp nhận
    await this.supabase
      .from('workspace_invites')
      .delete()
      .eq('id', invite.id);

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: userId,
    });
    this.supabase.emitUserEvent(userId, 'USER_WORKSPACES_CHANGED', {});

    return {
      message: 'Gia nhập Workspace thành công!',
      workspaceId,
    };
  }

  async rejectInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);

    const { error } = await this.supabase
      .from('workspace_invites')
      .delete()
      .eq('id', invite.id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Đã từ chối lời mời tham gia Workspace',
    };
  }

  async removeMember(workspaceId: string, currentUserId: string, targetUserId: string) {
    const { workspace } = await this.getWorkspaceAndMember(workspaceId, currentUserId);

    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong Workspace');
    }

    if (member.role === 'OWNER' || targetUserId === workspace.owner_id) {
      throw new BadRequestException(
        'Không thể xóa Chủ sở hữu. Hãy sử dụng chức năng Chuyển giao quyền sở hữu',
      );
    }

    if (currentUserId !== targetUserId) {
      await this.checkAdminOrOwner(workspaceId, currentUserId);
    }

    const { error } = await this.supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã xóa thành viên khỏi Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });
    this.supabase.emitUserEvent(targetUserId, 'USER_WORKSPACES_CHANGED', {});

    return { message: 'Đã xóa thành viên khỏi Workspace' };
  }

  private async checkAdminOrOwner(workspaceId: string, userId: string) {
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace) {
      throw new NotFoundException('Không tìm thấy Workspace');
    }

    if (workspace.owner_id === userId) return;

    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Chủ sở hữu mới có quyền thực hiện');
    }
  }

  private async getWorkspaceAndMember(workspaceId: string, userId: string) {
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace) {
      throw new NotFoundException('Không tìm thấy Workspace');
    }

    const { data: currentMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!currentMember && workspace.owner_id !== userId) {
      throw new ForbiddenException('Bạn không phải là thành viên của Workspace này');
    }

    return {
      workspace,
      currentMember: currentMember || { role: 'OWNER' },
    };
  }
}
