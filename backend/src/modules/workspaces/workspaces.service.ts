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
    // 1. Tìm các workspace_id mà user là member
    const { data: memberships } = await this.supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId);

    const memberWsIds = (memberships || []).map((m) => m.workspace_id);

    // 2. Tìm các board_id & workspace_id mà user là board_member (kể cả không phải workspace member)
    const { data: boardMemberships } = await this.supabase
      .from('board_members')
      .select('board_id, role, board:boards(id, workspace_id, name, description, is_favorite, is_archived)')
      .eq('user_id', userId);

    const userBoardMap = new Map<string, any[]>();
    const boardWsIds: string[] = [];

    (boardMemberships || []).forEach((bm: any) => {
      const b = bm.board;
      if (b && b.workspace_id) {
        if (!boardWsIds.includes(b.workspace_id)) {
          boardWsIds.push(b.workspace_id);
        }
        const existing = userBoardMap.get(b.workspace_id) || [];
        existing.push({
          id: b.id,
          name: b.name,
          description: b.description,
          is_favorite: b.is_favorite ?? false,
          is_archived: b.is_archived ?? false,
          currentUserBoardRole: bm.role,
        });
        userBoardMap.set(b.workspace_id, existing);
      }
    });

    const allRelatedWsIds = Array.from(new Set([...memberWsIds, ...boardWsIds]));

    // 3. Tìm các workspace mà user là owner HOẶC là member HOẶC có board tham gia
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
        boards (id, name, description, is_favorite, is_archived)
      `)
      .order('created_at', { ascending: false });

    if (allRelatedWsIds.length > 0) {
      query = query.or(`owner_id.eq.${userId},id.in.(${allRelatedWsIds.join(',')})`);
    } else {
      query = query.eq('owner_id', userId);
    }

    const { data: workspaces, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }

    // Gắn thêm vai trò của người dùng hiện tại (currentUserRole)
    const roleMap = new Map((memberships || []).map((m) => [m.workspace_id, m.role]));

    return (workspaces || []).map((ws: any) => {
      const isOwner = ws.owner_id === userId;
      const isWsMember = roleMap.has(ws.id);
      let currentUserRole = 'MEMBER';
      if (isOwner) {
        currentUserRole = 'OWNER';
      } else if (isWsMember) {
        currentUserRole = roleMap.get(ws.id) || 'MEMBER';
      } else {
        currentUserRole = 'GUEST'; // Người dùng chỉ là thành viên của 1 số Bảng trong WS này
      }

      let boardsList = ws.boards || [];
      // Nếu chỉ là GUEST (không phải thành viên chính thức của Workspace), chỉ hiển thị đúng các Bảng mà user có tham gia
      if (currentUserRole === 'GUEST') {
        const guestBoards = userBoardMap.get(ws.id) || [];
        const guestBoardIds = new Set(guestBoards.map((b: any) => b.id));
        boardsList = boardsList.filter((b: any) => guestBoardIds.has(b.id));
      }

      return {
        ...ws,
        currentUserRole,
        isOwner,
        isAdmin: currentUserRole === 'OWNER' || currentUserRole === 'ADMIN',
        isGuest: currentUserRole === 'GUEST',
        boards: boardsList,
        _count: {
          members: ws.members?.length || 0,
          boards: boardsList.length,
        },
      };
    });
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
    const isOwner = workspace.owner_id === userId;

    let currentUserRole: string;
    if (isOwner) {
      currentUserRole = 'OWNER';
    } else if (currentMember) {
      currentUserRole = currentMember.role || 'MEMBER';
    } else {
      // Kiểm tra nếu người dùng là Khách (Guest) trong ít nhất 1 Bảng thuộc Không gian này
      const boardIds = (workspace.boards || []).map((b: any) => b.id);
      let isBoardGuest = false;
      if (boardIds.length > 0) {
        const { data: userBm } = await this.supabase
          .from('board_members')
          .select('id')
          .eq('user_id', userId)
          .in('board_id', boardIds)
          .limit(1);
        if (userBm && userBm.length > 0) {
          isBoardGuest = true;
        }
      }

      if (!isBoardGuest) {
        throw new ForbiddenException('Bạn không có quyền truy cập Workspace này');
      }
      currentUserRole = 'GUEST';
    }

    // Lọc danh sách boards nếu người dùng là GUEST (chỉ xem được các board mà mình tham gia)
    let userBoards = workspace.boards || [];
    if (currentUserRole === 'GUEST') {
      const { data: userBoardMemberships } = await this.supabase
        .from('board_members')
        .select('board_id')
        .eq('user_id', userId)
        .in('board_id', (workspace.boards || []).map((b: any) => b.id));

      const allowedBoardIds = new Set((userBoardMemberships || []).map((m: any) => m.board_id));
      userBoards = userBoards.filter((b: any) => allowedBoardIds.has(b.id));
    }

    // Query guests from boards belonging to this workspace
    const boardIds = (workspace.boards || []).map((b: any) => b.id);
    let guests: any[] = [];

    if (boardIds.length > 0) {
      const { data: boardMembers } = await this.supabase
        .from('board_members')
        .select(`
          id,
          board_id,
          user_id,
          role,
          joined_at,
          user:users (id, name, email, avatar),
          board:boards (id, name)
        `)
        .in('board_id', boardIds);

      if (boardMembers && boardMembers.length > 0) {
        const wsMemberUserIds = new Set((workspace.members || []).map((m: any) => m.user_id));
        wsMemberUserIds.add(workspace.owner_id);

        const guestMap = new Map<string, {
          user: any;
          boards: Array<{ id: string; name: string; role: string; boardMemberId: string; joined_at?: string }>;
        }>();

        for (const bm of boardMembers as any[]) {
          if (!wsMemberUserIds.has(bm.user_id) && bm.user) {
            if (!guestMap.has(bm.user_id)) {
              guestMap.set(bm.user_id, {
                user: bm.user,
                boards: [],
              });
            }
            guestMap.get(bm.user_id)!.boards.push({
              id: bm.board?.id || bm.board_id,
              name: bm.board?.name || 'Bảng',
              role: bm.role,
              boardMemberId: bm.id,
              joined_at: bm.joined_at,
            });
          }
        }

        // Gộp chung 1 bảng/đa bảng thành Khách (Guest) duy nhất
        guests = Array.from(guestMap.entries()).map(([uId, data]) => {
          return {
            id: uId,
            user_id: uId,
            user: data.user,
            guestType: 'GUEST',
            guestTypeLabel: 'Khách (Guest)',
            boardCount: data.boards.length,
            boards: data.boards,
          };
        });
      }
    }

    return {
      ...workspace,
      boards: userBoards,
      currentUserRole,
      isOwner,
      isAdmin: currentUserRole === 'OWNER' || currentUserRole === 'ADMIN',
      isGuest: currentUserRole === 'GUEST',
      guests,
      singleBoardGuests: guests,
      multiBoardGuests: guests,
      guestCount: guests.length,
      singleBoardGuestsCount: guests.length,
      multiBoardGuestsCount: guests.length,
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

    const targetUserObj = Array.isArray((updated as any)?.user) ? (updated as any)?.user[0] : (updated as any)?.user;
    const targetName = targetUserObj?.name || targetUserObj?.email || 'thành viên';
    const roleLabel = dto.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên';

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã đổi vai trò của "${targetName}" thành ${roleLabel}`,
      targetType: `workspace:${workspaceId}`,
    });

    if (currentUserId !== targetUserId) {
      const { data: changerUser } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', currentUserId)
        .maybeSingle();

      const changerName = changerUser?.name || 'Quản trị viên';
      this.notificationsService
        .createNotification({
          userId: targetUserId,
          title: 'Thay đổi vai trò trong Không gian làm việc',
          message: `${changerName} đã thay đổi vai trò của bạn thành "${roleLabel}" trong Không gian làm việc "${workspace.name}".`,
          type: 'WORKSPACE_ROLE_UPDATED',
        })
        .catch(() => {});
    }

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

    // Dọn dẹp liên hoàn: xóa card assignments và board membership trong tất cả các board của workspace
    await this.cleanupUserFromWorkspaceBoards(workspaceId, currentUserId);

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
    const { workspace, currentMember } = await this.getWorkspaceAndMember(workspaceId, currentUserId);
    if (currentMember.role !== 'OWNER' && currentMember.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền quản lý thành viên trong Workspace này');
    }
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Kiểm tra nếu người dùng đã có tài khoản
    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email, avatar')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const { data: inviterUser } = await this.supabase
      .from('users')
      .select('name')
      .eq('id', currentUserId)
      .maybeSingle();
    const inviterName = inviterUser?.name || 'Quản trị viên';

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

        // Gửi thông báo cho thành viên vừa được thêm trực tiếp
        this.notificationsService
          .createNotification({
            userId: targetUser.id,
            title: 'Thành viên Không gian làm việc mới',
            message: `${inviterName} đã thêm bạn vào không gian làm việc "${workspace.name}".`,
            type: 'WORKSPACE_INVITE',
          })
          .catch(() => {});

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

    // Nếu người được mời qua email đã có tài khoản, gửi thông báo in-app
    if (targetUser) {
      this.notificationsService
        .createNotification({
          userId: targetUser.id,
          title: 'Lời mời tham gia Không gian làm việc',
          message: `${inviterName} đã mời bạn tham gia không gian làm việc "${workspace.name}".`,
          type: 'WORKSPACE_INVITE',
        })
        .catch(() => {});
    }

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

    // Xác thực email người nhận nếu lời mời có chỉ định email
    if (invite.email) {
      const { data: currentUser } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      if (currentUser?.email && currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new ForbiddenException(
          `Lời mời này được gửi riêng cho email "${invite.email}". Bạn đang đăng nhập bằng "${currentUser.email}". Vui lòng đăng nhập đúng tài khoản để chấp nhận.`
        );
      }
    }

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

    // Xác thực người từ chối phải là người nhận lời mời
    if (invite.email) {
      const { data: currentUser } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      if (currentUser?.email && currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new ForbiddenException('Bạn không phải là người nhận của lời mời này');
      }
    }

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

    // Lấy thông tin thành viên bị xóa để ghi rõ tên trong dòng hoạt động
    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email')
      .eq('id', targetUserId)
      .maybeSingle();

    const targetName = targetUser?.name || targetUser?.email || 'thành viên';

    // Dọn dẹp liên hoàn: xóa card assignments và board membership trong tất cả các board của workspace
    await this.cleanupUserFromWorkspaceBoards(workspaceId, targetUserId);

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
      action: `đã xóa thành viên "${targetName}" khỏi Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    if (currentUserId !== targetUserId) {
      const { data: removerUser } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', currentUserId)
        .maybeSingle();

      const removerName = removerUser?.name || 'Quản trị viên';
      this.notificationsService
        .createNotification({
          userId: targetUserId,
          title: 'Thông báo rời khỏi Không gian làm việc',
          message: `Bạn đã bị ${removerName} xóa khỏi không gian làm việc "${workspace.name}".`,
          type: 'WORKSPACE_REMOVED',
        })
        .catch(() => {});
    }

    this.supabase.emitWorkspaceEvent(workspaceId, 'WORKSPACE_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });
    this.supabase.emitUserEvent(targetUserId, 'USER_WORKSPACES_CHANGED', {});

    return { message: 'Đã xóa thành viên khỏi Workspace' };
  }

  /**
   * Xóa một Khách khỏi toàn bộ các Bảng trong Không gian làm việc
   */
  async removeGuestFromWorkspace(workspaceId: string, currentUserId: string, guestUserId: string) {
    await this.checkAdminOrOwner(workspaceId, currentUserId);

    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace) {
      throw new NotFoundException('Không tìm thấy Workspace');
    }

    const { data: boards } = await this.supabase
      .from('boards')
      .select('id')
      .eq('workspace_id', workspaceId);

    const boardIds = (boards || []).map((b) => b.id);
    if (boardIds.length === 0) {
      return { message: 'Không có Bảng nào để xóa khách' };
    }

    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email')
      .eq('id', guestUserId)
      .maybeSingle();

    const targetName = targetUser?.name || targetUser?.email || 'khách';

    const { error } = await this.supabase
      .from('board_members')
      .delete()
      .in('board_id', boardIds)
      .eq('user_id', guestUserId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.activitiesService.logActivity({
      workspaceId,
      userId: currentUserId,
      action: `đã xóa khách "${targetName}" khỏi các Bảng trong Không gian làm việc`,
      targetType: `workspace:${workspaceId}`,
    });

    const { data: removerUser } = await this.supabase
      .from('users')
      .select('name')
      .eq('id', currentUserId)
      .maybeSingle();

    const removerName = removerUser?.name || 'Quản trị viên';
    this.notificationsService
      .createNotification({
        userId: guestUserId,
        title: 'Thông báo rời khỏi Bảng Không gian làm việc',
        message: `Bạn đã bị ${removerName} xóa khỏi các Bảng trong Không gian làm việc "${workspace.name}".`,
        type: 'WORKSPACE_REMOVED',
      })
      .catch(() => {});

    return { message: `Đã xóa khách "${targetName}" khỏi các Bảng trong Không gian làm việc` };
  }

  /**
   * Chuyển đổi Khách thành Thành viên chính thức của Workspace
   */
  async convertGuestToMember(
    workspaceId: string,
    currentUserId: string,
    guestUserId: string,
    role: 'MEMBER' | 'ADMIN' = 'MEMBER',
  ) {
    await this.checkAdminOrOwner(workspaceId, currentUserId);

    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, email, name')
      .eq('id', guestUserId)
      .maybeSingle();

    if (!targetUser || !targetUser.email) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return this.addMember(workspaceId, currentUserId, {
      email: targetUser.email,
      role: role || 'MEMBER',
    });
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

  private async cleanupUserFromWorkspaceBoards(workspaceId: string, userId: string) {
    try {
      // 1. Tìm tất cả boards trong workspace
      const { data: boards } = await this.supabase
        .from('boards')
        .select('id')
        .eq('workspace_id', workspaceId);

      const boardIds = (boards || []).map((b: any) => b.id);
      if (boardIds.length === 0) return;

      // 2. Tìm tất cả cards trong các board này
      const { data: lists } = await this.supabase
        .from('lists')
        .select('id, cards (id)')
        .in('board_id', boardIds);

      const cardIds: string[] = [];
      (lists || []).forEach((l: any) => {
        (l.cards || []).forEach((c: any) => {
          if (c.id) cardIds.push(c.id);
        });
      });

      // 3. Xóa card_assignees của user trong các card này
      if (cardIds.length > 0) {
        await this.supabase
          .from('card_assignees')
          .delete()
          .in('card_id', cardIds)
          .eq('user_id', userId);

        // Fallback xóa theo board_member_id nếu schema cũ
        const { data: bMembers } = await this.supabase
          .from('board_members')
          .select('id')
          .in('board_id', boardIds)
          .eq('user_id', userId);
        const bmIds = (bMembers || []).map((m: any) => m.id);
        if (bmIds.length > 0) {
          await this.supabase
            .from('card_assignees')
            .delete()
            .in('card_id', cardIds)
            .in('board_member_id', bmIds);
        }
      }

      // 4. Xóa board_members của user trong các board của workspace
      await this.supabase
        .from('board_members')
        .delete()
        .in('board_id', boardIds)
        .eq('user_id', userId);

      // Emit board events để các client đang mở board nhận được cập nhật
      boardIds.forEach((bId: string) => {
        this.supabase.emitBoardEvent(bId, 'BOARD_MEMBERS_CHANGED', { senderId: userId });
      });
    } catch (err) {
      console.error('Lỗi dọn dẹp liên hoàn khi rời workspace:', err);
    }
  }
}
