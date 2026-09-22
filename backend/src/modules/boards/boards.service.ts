import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CopyBoardDto } from './dto/copy-board.dto';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { UpdateBoardMemberRoleDto } from './dto/update-board-member-role.dto';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class BoardsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateBoardDto) {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // 1. Tạo board (hỗ trợ trường mở rộng an toàn)
    const insertPayload: Record<string, any> = {
      workspace_id: workspaceId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      is_favorite: dto.is_favorite ?? false,
    };

    if (dto.visibility) {
      insertPayload.visibility = dto.visibility;
    }

    let board: any;
    const { data: createdBoard, error: bError } = await this.supabase
      .from('boards')
      .insert(insertPayload)
      .select()
      .single();

    if (bError) {
      // Fallback nếu cột visibility chưa tồn tại trong schema
      if (bError.message?.includes('visibility') || bError.code === '42703') {
        delete insertPayload.visibility;
        const { data: retryBoard, error: retryErr } = await this.supabase
          .from('boards')
          .insert(insertPayload)
          .select()
          .single();
        if (retryErr || !retryBoard) {
          throw new BadRequestException(retryErr?.message || 'Không thể tạo Board');
        }
        board = retryBoard;
      } else {
        throw new BadRequestException(bError.message || 'Không thể tạo Board');
      }
    } else {
      board = createdBoard;
    }

    // 2. Gán user làm ADMIN trong board_members
    await this.supabase.from('board_members').insert({
      board_id: board.id,
      user_id: userId,
      role: 'ADMIN',
    });

    // 3. Tự động tạo 3 danh sách mặc định nếu được chọn
    if (dto.create_default_lists !== false) {
      await this.supabase.from('lists').insert([
        { board_id: board.id, title: 'To Do', position: 0 },
        { board_id: board.id, title: 'In Progress', position: 1 },
        { board_id: board.id, title: 'Done', position: 2 },
      ]);
    }

    // 4. Khởi tạo một số nhãn màu cơ bản cho Board
    await this.supabase.from('labels').insert([
      { board_id: board.id, name: 'Frontend', color: '#3b82f6' },
      { board_id: board.id, name: 'Backend', color: '#10b981' },
      { board_id: board.id, name: 'UI/UX', color: '#a855f7' },
      { board_id: board.id, name: 'Gấp (Urgent)', color: '#ef4444' },
    ]);

    await this.activitiesService.logActivity({
      workspaceId,
      userId,
      action: `đã tạo Bảng "${board.name}"`,
      targetType: `board:${board.id}`,
    });

    return this.findById(board.id, userId);
  }

  async findAllInWorkspace(workspaceId: string, userId: string, includeArchived = false) {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    let query = this.supabase
      .from('boards')
      .select(`
        id,
        workspace_id,
        name,
        description,
        is_favorite,
        lists (id),
        members:board_members (id, user_id, role)
      `)
      .eq('workspace_id', workspaceId)
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    const { data: boards, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }

    // Lọc theo quyền truy cập (Private boards) và trạng thái lưu trữ
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    const isWsOwner = workspace?.owner_id === userId;

    return (boards || [])
      .filter((b: any) => {
        // Lọc archived nếu có trường is_archived
        if (!includeArchived && b.is_archived === true) return false;
        if (includeArchived && b.is_archived !== true) return false;

        // Nếu là private, chỉ hiển thị nếu là member hoặc WS owner
        if (b.visibility === 'PRIVATE') {
          const isMember = (b.members || []).some((m: any) => m.user_id === userId);
          return isMember || isWsOwner;
        }
        return true;
      })
      .map((b: any) => ({
        id: b.id,
        workspace_id: b.workspace_id,
        name: b.name,
        description: b.description,
        is_favorite: b.is_favorite ?? false,
        is_archived: b.is_archived ?? false,
        visibility: b.visibility || 'WORKSPACE',
        _count: {
          lists: b.lists?.length || 0,
          members: b.members?.length || 0,
        },
      }));
  }

  async findArchivedInWorkspace(workspaceId: string, userId: string) {
    return this.findAllInWorkspace(workspaceId, userId, true);
  }

  async findById(boardId: string, userId: string) {
    const { data: board, error } = await this.supabase
      .from('boards')
      .select(`
        id,
        workspace_id,
        name,
        description,
        is_favorite,
        workspace:workspaces (id, name, owner_id),
        lists (
          id,
          title,
          position,
          limit,
          cards (
            id,
            title,
            description,
            position,
            start_date,
            due_date,
            reminder_at,
            is_due_date_completed,
            checklists (
              id,
              title,
              items:checklist_items (id, content, is_completed)
            ),
            card_labels (
              label:labels (id, name, color)
            ),
            card_assignees (
              id,
              board_member_id,
              board_member:board_members (
                id,
                role,
                user:users (id, name, email, avatar)
              )
            ),
            comments (id)
          )
        ),
        members:board_members (
          id,
          role,
          user_id,
          joined_at,
          user:users (id, name, email, avatar)
        ),
        labels (id, name, color)
      `)
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    await this.verifyWorkspaceAccess(board.workspace_id, userId);

    const b: any = board;
    const isWorkspaceOwner = (b.workspace as any)?.owner_id === userId;
    const currentMember = (b.members || []).find((m: any) => m.user_id === userId);

    // Kiểm tra private access
    if (b.visibility === 'PRIVATE' && !currentMember && !isWorkspaceOwner) {
      throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
    }

    const currentUserBoardRole = isWorkspaceOwner
      ? 'ADMIN'
      : currentMember?.role || 'VIEWER';

    const canEdit = currentUserBoardRole === 'ADMIN' || currentUserBoardRole === 'EDITOR' || isWorkspaceOwner;
    const canManageMembers = currentUserBoardRole === 'ADMIN' || isWorkspaceOwner;
    const canDelete = currentUserBoardRole === 'ADMIN' || isWorkspaceOwner;

    // Sắp xếp lists và cards theo position
    if (b.lists) {
      b.lists.sort((x: any, y: any) => x.position - y.position);
      b.lists.forEach((list: any) => {
        if (list.cards) {
          list.cards.sort((x: any, y: any) => x.position - y.position);
        }
      });
    }

    return {
      ...b,
      is_archived: b.is_archived ?? false,
      visibility: b.visibility || 'WORKSPACE',
      currentUserBoardRole,
      isWorkspaceOwner,
      canEdit,
      canManageMembers,
      canDelete,
    };
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto) {
    const board = await this.findById(boardId, userId);
    if (!board.canEdit) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa thông tin Board này');
    }

    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description ? dto.description.trim() : null;
    if (dto.is_favorite !== undefined) updateData.is_favorite = dto.is_favorite;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;
    if (dto.is_archived !== undefined) updateData.is_archived = dto.is_archived;
    if (dto.background !== undefined) updateData.background = dto.background;

    let updated: any;
    const { data, error } = await this.supabase
      .from('boards')
      .update(updateData)
      .eq('id', boardId)
      .select()
      .single();

    if (error) {
      // Fallback nếu cột mở rộng chưa tồn tại trong schema
      if (error.code === '42703') {
        delete updateData.visibility;
        delete updateData.is_archived;
        delete updateData.background;
        const { data: retryData, error: retryErr } = await this.supabase
          .from('boards')
          .update(updateData)
          .eq('id', boardId)
          .select()
          .single();
        if (retryErr) throw new BadRequestException(retryErr.message);
        updated = retryData;
      } else {
        throw new BadRequestException(error.message || 'Không thể cập nhật Board');
      }
    } else {
      updated = data;
    }

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId,
      action: `đã cập nhật thông tin Bảng "${updated?.name || board.name}"`,
      targetType: `board:${boardId}`,
    });

    return this.findById(boardId, userId);
  }

  async toggleFavorite(boardId: string, userId: string) {
    const { data: board } = await this.supabase
      .from('boards')
      .select('id, workspace_id, is_favorite')
      .eq('id', boardId)
      .maybeSingle();

    if (!board) throw new NotFoundException('Không tìm thấy Board');
    await this.verifyWorkspaceAccess(board.workspace_id, userId);

    const newFav = !board.is_favorite;
    const { error } = await this.supabase
      .from('boards')
      .update({ is_favorite: newFav })
      .eq('id', boardId);

    if (error) throw new BadRequestException(error.message);

    return { id: boardId, is_favorite: newFav };
  }

  async archiveBoard(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canDelete && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Board hoặc Chủ sở hữu Workspace mới có quyền lưu trữ');
    }

    const { error } = await this.supabase
      .from('boards')
      .update({ is_archived: true })
      .eq('id', boardId);

    if (error) {
      if (error.code === '42703') {
        throw new BadRequestException('Vui lòng chạy script database/migration_boards.sql trên Supabase để bật tính năng lưu trữ');
      }
      throw new BadRequestException(error.message);
    }

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId,
      action: `đã lưu trữ Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
    });

    return { message: 'Đã lưu trữ Board thành công', is_archived: true };
  }

  async restoreBoard(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canDelete && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Board hoặc Chủ sở hữu Workspace mới có quyền khôi phục');
    }

    const { error } = await this.supabase
      .from('boards')
      .update({ is_archived: false })
      .eq('id', boardId);

    if (error) throw new BadRequestException(error.message);

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId,
      action: `đã khôi phục Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
    });

    return { message: 'Đã khôi phục Board thành công', is_archived: false };
  }

  async copyBoard(boardId: string, userId: string, dto: CopyBoardDto) {
    const sourceBoard = await this.findById(boardId, userId);
    const targetWorkspaceId = dto.targetWorkspaceId || sourceBoard.workspace_id;
    await this.verifyWorkspaceAccess(targetWorkspaceId, userId);

    // 1. Tạo board mới
    const { data: newBoard, error: bErr } = await this.supabase
      .from('boards')
      .insert({
        workspace_id: targetWorkspaceId,
        name: dto.name.trim(),
        description: sourceBoard.description,
        is_favorite: false,
      })
      .select()
      .single();

    if (bErr || !newBoard) {
      throw new BadRequestException(bErr?.message || 'Không thể nhân bản Board');
    }

    // 2. Thêm creator vào board_members của board mới
    await this.supabase.from('board_members').insert({
      board_id: newBoard.id,
      user_id: userId,
      role: 'ADMIN',
    });

    await this.activitiesService.logActivity({
      workspaceId: targetWorkspaceId,
      userId,
      action: `đã nhân bản Bảng thành "${newBoard.name}"`,
      targetType: `board:${newBoard.id}`,
    });

    // 3. Sao chép Labels và tạo map ID cũ -> mới
    const labelMap = new Map<string, string>();
    if (sourceBoard.labels && sourceBoard.labels.length > 0) {
      for (const lbl of sourceBoard.labels) {
        const { data: newLbl } = await this.supabase
          .from('labels')
          .insert({
            board_id: newBoard.id,
            name: lbl.name,
            color: lbl.color,
          })
          .select()
          .single();

        if (newLbl) {
          labelMap.set(lbl.id, newLbl.id);
        }
      }
    }

    // 4. Sao chép các List và Cards
    if (sourceBoard.lists && sourceBoard.lists.length > 0) {
      for (const list of sourceBoard.lists) {
        const { data: newList } = await this.supabase
          .from('lists')
          .insert({
            board_id: newBoard.id,
            title: list.title,
            position: list.position,
            limit: list.limit,
          })
          .select()
          .single();

        if (newList && dto.includeCards !== false && list.cards) {
          for (const card of list.cards) {
            const { data: newCard } = await this.supabase
              .from('cards')
              .insert({
                list_id: newList.id,
                title: card.title,
                description: card.description,
                position: card.position,
                status: card.status,
                due_date: card.due_date,
                is_due_date_completed: card.is_due_date_completed,
                created_by: userId,
              })
              .select()
              .single();

            if (newCard) {
              // Copy checklists
              if (card.checklists) {
                for (const rawCl of card.checklists) {
                  const cl: any = rawCl;
                  const { data: newCl } = await this.supabase
                    .from('checklists')
                    .insert({
                      card_id: newCard.id,
                      title: cl.title,
                      position: cl.position ?? 0,
                    })
                    .select()
                    .single();

                  if (newCl && cl.items) {
                    for (const rawItm of cl.items) {
                      const itm: any = rawItm;
                      await this.supabase.from('checklist_items').insert({
                        checklist_id: newCl.id,
                        content: itm.content,
                        is_completed: itm.is_completed,
                        position: itm.position ?? 0,
                      });
                    }
                  }
                }
              }

              // Copy card labels
              if (card.card_labels) {
                for (const rawLabel of card.card_labels) {
                  const cl: any = rawLabel;
                  const labelObj = Array.isArray(cl.label) ? cl.label[0] : cl.label;
                  const newLabelId = labelObj ? labelMap.get(labelObj.id) : null;
                  if (newLabelId) {
                    await this.supabase.from('card_labels').insert({
                      card_id: newCard.id,
                      label_id: newLabelId,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return this.findById(newBoard.id, userId);
  }

  async delete(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canDelete && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Board hoặc Chủ sở hữu Workspace mới có quyền xóa Board');
    }

    const { error } = await this.supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Xóa Board thành công' };
  }

  // --- BOARD MEMBERS MANAGEMENT ---
  async getBoardMembers(boardId: string, userId: string) {
    await this.findById(boardId, userId);

    const { data: members, error } = await this.supabase
      .from('board_members')
      .select(`
        id,
        board_id,
        user_id,
        role,
        joined_at,
        user:users (id, name, email, avatar)
      `)
      .eq('board_id', boardId);

    if (error) throw new BadRequestException(error.message);

    return members || [];
  }

  async addBoardMember(boardId: string, currentUserId: string, dto: AddBoardMemberDto) {
    const board = await this.findById(boardId, currentUserId);
    if (!board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền thêm thành viên vào Board này');
    }

    // Kiểm tra xem targetUser có thuộc Workspace không
    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', dto.userId)
      .maybeSingle();

    if (!wsMember) {
      throw new BadRequestException('Người dùng này chưa phải là thành viên của Không gian làm việc');
    }

    // Kiểm tra xem đã là member của board chưa
    const { data: existing } = await this.supabase
      .from('board_members')
      .select('id')
      .eq('board_id', boardId)
      .eq('user_id', dto.userId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Người dùng đã là thành viên của Board này');
    }

    const { data: newMember, error } = await this.supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: dto.userId,
        role: dto.role || 'EDITOR',
      })
      .select(`
        id,
        board_id,
        user_id,
        role,
        joined_at,
        user:users (id, name, email, avatar)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: currentUserId,
      action: `đã thêm thành viên "${(newMember as any)?.user?.name || 'thành viên'}" vào Bảng`,
      targetType: `board:${boardId}`,
    });

    return newMember;
  }

  async updateBoardMemberRole(
    boardId: string,
    currentUserId: string,
    targetUserId: string,
    dto: UpdateBoardMemberRoleDto,
  ) {
    const board = await this.findById(boardId, currentUserId);
    if (!board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền thay đổi vai trò thành viên Board');
    }

    // Nếu hạ quyền Admin, kiểm tra xem còn Admin nào khác không
    if (dto.role !== 'ADMIN') {
      const { data: targetMember } = await this.supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (targetMember?.role === 'ADMIN') {
        const { count } = await this.supabase
          .from('board_members')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', boardId)
          .eq('role', 'ADMIN');

        if ((count ?? 0) <= 1) {
          throw new BadRequestException('Không thể hạ quyền Quản trị viên cuối cùng của Board');
        }
      }
    }

    const { data: updated, error } = await this.supabase
      .from('board_members')
      .update({ role: dto.role })
      .eq('board_id', boardId)
      .eq('user_id', targetUserId)
      .select(`
        id,
        board_id,
        user_id,
        role,
        joined_at,
        user:users (id, name, email, avatar)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: currentUserId,
      action: `đã đổi vai trò thành viên thành ${dto.role}`,
      targetType: `board:${boardId}`,
    });

    return updated;
  }

  async removeBoardMember(boardId: string, currentUserId: string, targetUserId: string) {
    const board = await this.findById(boardId, currentUserId);
    if (!board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền xóa thành viên khỏi Board này');
    }

    // Kiểm tra nếu là Admin cuối cùng
    const { data: member } = await this.supabase
      .from('board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (member?.role === 'ADMIN') {
      const { count } = await this.supabase
        .from('board_members')
        .select('*', { count: 'exact', head: true })
        .eq('board_id', boardId)
        .eq('role', 'ADMIN');

      if ((count ?? 0) <= 1) {
        throw new BadRequestException('Không thể xóa Quản trị viên cuối cùng của Board');
      }
    }

    const { error } = await this.supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', targetUserId);

    if (error) throw new BadRequestException(error.message);

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: currentUserId,
      action: `đã xóa thành viên khỏi Bảng`,
      targetType: `board:${boardId}`,
    });

    return { message: 'Đã xóa thành viên khỏi Board' };
  }

  async leaveBoard(boardId: string, currentUserId: string) {
    const { data: member } = await this.supabase
      .from('board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (!member) {
      throw new NotFoundException('Bạn không phải là thành viên của Board này');
    }

    if (member.role === 'ADMIN') {
      const { count } = await this.supabase
        .from('board_members')
        .select('*', { count: 'exact', head: true })
        .eq('board_id', boardId)
        .eq('role', 'ADMIN');

      if ((count ?? 0) <= 1) {
        const { count: totalMembers } = await this.supabase
          .from('board_members')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', boardId);

        if ((totalMembers ?? 0) > 1) {
          throw new BadRequestException('Bạn là Quản trị viên duy nhất. Vui lòng chuyển quyền Admin cho người khác trước khi rời Bảng');
        }
      }
    }

    const { error } = await this.supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', currentUserId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Bạn đã rời khỏi Board thành công' };
  }

  private async verifyWorkspaceAccess(workspaceId: string, userId: string) {
    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (workspace?.owner_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập Không gian làm việc này');
      }
    }
  }
}
