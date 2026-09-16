import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly supabase: SupabaseService) {}

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

    return this.findById(workspace.id, userId);
  }

  async findAllForUser(userId: string) {
    // Tìm các workspace_id mà user là member
    const { data: memberships } = await this.supabase
      .from('workspace_members')
      .select('workspace_id')
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

    return workspaces || [];
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

    const isMember = (workspace.members || []).some((m: any) => m.user_id === userId);
    if (!isMember && workspace.owner_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập Workspace này');
    }

    return workspace;
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    await this.checkAdminOrOwner(workspaceId, userId);

    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();

    const { data: updated, error } = await this.supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật Workspace');
    }

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
      throw new ForbiddenException('Chỉ chủ sở hữu (Owner) mới có quyền xóa Workspace');
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
        user:users (id, name, email, avatar)
      `)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return newMember;
  }

  async removeMember(workspaceId: string, currentUserId: string, targetUserId: string) {
    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong Workspace');
    }

    if (member.role === 'OWNER') {
      const { count } = await this.supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('role', 'OWNER');

      if ((count ?? 0) <= 1) {
        throw new BadRequestException('Không thể xóa chủ sở hữu cuối cùng của Workspace');
      }
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
}
