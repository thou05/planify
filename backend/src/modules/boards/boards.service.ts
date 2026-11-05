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
import { InviteBoardMemberDto } from './dto/invite-board-member.dto';
import { RequestEditorDto } from './dto/request-editor.dto';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';

export function extractBoardAppearance(rawBackground: any, rawIcon?: any) {
  let background = rawBackground ?? null;
  let icon = rawIcon ?? null;

  if (typeof background === 'string' && background.startsWith('{') && background.endsWith('}')) {
    try {
      const parsed = JSON.parse(background);
      if (parsed && typeof parsed === 'object') {
        background = parsed.bg ?? null;
        if (!icon && parsed.icon) {
          icon = parsed.icon;
        }
      }
    } catch {
      // ignore
    }
  }

  return { background, icon };
}

@Injectable()
export class BoardsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateBoardDto) {
    const wsAccess = await this.verifyWorkspaceAccess(workspaceId, userId);
    if (wsAccess.role === 'GUEST') {
      throw new ForbiddenException('Thành viên dạng Khách (Guest) không có quyền tạo Bảng mới trong Không gian làm việc.');
    }

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
    if (dto.background) {
      insertPayload.background = dto.background;
    }
    if (dto.icon) {
      insertPayload.icon = dto.icon;
    }

    let board: any;
    const { data: createdBoard, error: bError } = await this.supabase
      .from('boards')
      .insert(insertPayload)
      .select()
      .single();

    if (bError) {
      // Fallback nếu cột icon hoặc visibility chưa tồn tại trong schema
      if (bError.code === '42703' || bError.message?.includes('column')) {
        if (insertPayload.icon !== undefined) {
          const targetIcon = insertPayload.icon;
          delete insertPayload.icon;
          insertPayload.background = JSON.stringify({ bg: insertPayload.background || null, icon: targetIcon || null });
        }
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

    const result = await this.findById(board.id, userId);
    this.supabase.emitWorkspaceEvent(workspaceId, 'BOARD_CREATED', {
      board: result,
      senderId: userId,
    });

    return result;
  }

  async findAllInWorkspace(workspaceId: string, userId: string, includeArchived = false) {
    const wsAccess = await this.verifyWorkspaceAccess(workspaceId, userId);

    let query = this.supabase
      .from('boards')
      .select(`
        id,
        workspace_id,
        name,
        description,
        is_favorite,
        visibility,
        editor_join_mode,
        is_archived,
        background,
        icon,
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
    const isWsAdmin = isWsOwner || wsAccess.role === 'ADMIN';
    const isGuest = wsAccess.role === 'GUEST';

    return (boards || [])
      .filter((b: any) => {
        // Lọc archived nếu có trường is_archived
        if (!includeArchived && b.is_archived === true) return false;
        if (includeArchived && b.is_archived !== true) return false;

        // Nếu là Khách (Guest), chỉ được xem các bảng mà mình là thành viên
        if (isGuest) {
          return (b.members || []).some((m: any) => m.user_id === userId);
        }

        // Nếu là private, chỉ hiển thị nếu là member hoặc WS owner / WS admin
        if (b.visibility === 'PRIVATE') {
          const isMember = (b.members || []).some((m: any) => m.user_id === userId);
          return isMember || isWsAdmin;
        }
        return true;
      })
      .map((b: any) => {
        const { background, icon } = extractBoardAppearance(b.background, b.icon);
        return {
          id: b.id,
          workspace_id: b.workspace_id,
          name: b.name,
          description: b.description,
          is_favorite: b.is_favorite ?? false,
          is_archived: b.is_archived ?? false,
          visibility: b.visibility || 'WORKSPACE',
          background,
          icon,
          _count: {
            lists: b.lists?.length || 0,
            members: b.members?.length || 0,
          },
        };
      });
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
        visibility,
        editor_join_mode,
        is_archived,
        background,
        icon,
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
            status,
            start_date,
            due_date,
            reminder_at,
            is_due_date_completed,
            checklists (
              id,
              title,
              items:checklist_items (
                id,
                checklist_id,
                content,
                is_completed,
                position,
                due_date,
                user_id,
                user:users (id, name, email, avatar)
              )
            ),
            card_labels (
              label:labels (id, name, color)
            ),
            card_assignees (
              id,
              card_id,
              user_id,
              assigned_at,
              user:users (id, name, email, avatar)
            ),
            comments (id),
            attachments (id, file_name, file_url, file_size),
            custom_field_values (
              id,
              field_id,
              value,
              field:custom_fields (
                id,
                name,
                field_type
              )
            )
          )
        ),
        members:board_members (
          id,
          role,
          user_id,
          joined_at,
          user:users (id, name, email, avatar)
        ),
        labels (id, name, color),
        custom_fields (id, name, field_type)
      `)
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Board');
    }

    const b: any = board;
    const isWorkspaceOwner = (b.workspace as any)?.owner_id === userId;
    const currentMember = (b.members || []).find((m: any) => m.user_id === userId);

    // Kiểm tra xem user có phải là workspace member không
    const { data: wsMember } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    const isWorkspaceAdmin = Boolean(isWorkspaceOwner || wsMember?.role === 'ADMIN');

    // Cho phép nếu là Workspace Owner, Workspace Admin, Workspace Member, Board Member HOẶC Board ở chế độ PUBLIC
    if (!isWorkspaceOwner && !isWorkspaceAdmin && (!wsMember || wsMember.role === 'GUEST') && !currentMember) {
      if (b.visibility !== 'PUBLIC') {
        throw new ForbiddenException('Bạn không có quyền truy cập Bảng này hoặc đã bị xóa');
      }
    }

    // Kiểm tra private access: nếu PRIVATE, chỉ Board Member, Workspace Admin hoặc Workspace Owner được truy cập
    if (b.visibility === 'PRIVATE' && !currentMember && !isWorkspaceOwner && !isWorkspaceAdmin) {
      throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), chỉ thành viên được mời mới có quyền truy cập');
    }

    let currentUserBoardRole: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'VIEWER';
    if (currentMember) {
      if (currentMember.role === 'ADMIN') {
        currentUserBoardRole = 'ADMIN';
      } else if (currentMember.role === 'VIEWER') {
        currentUserBoardRole = 'VIEWER';
      } else {
        // 'EDITOR' hoặc 'MEMBER' đều là người biên tập/thực thi
        currentUserBoardRole = 'EDITOR';
      }
    } else if (isWorkspaceOwner || isWorkspaceAdmin) {
      currentUserBoardRole = 'ADMIN';
    } else {
      currentUserBoardRole = 'VIEWER';
    }

    const isGuest = !isWorkspaceOwner && !isWorkspaceAdmin && (!wsMember || wsMember.role === 'GUEST');
    const isWorkspaceMember = Boolean(isWorkspaceOwner || isWorkspaceAdmin || (wsMember && wsMember.role !== 'GUEST'));
    const isBoardMember = Boolean(currentMember);

    const canEdit = isWorkspaceAdmin || currentUserBoardRole === 'ADMIN' || currentUserBoardRole === 'EDITOR';
    const canManageMembers = isWorkspaceAdmin || currentUserBoardRole === 'ADMIN';
    const canInviteMembers = isWorkspaceAdmin || currentUserBoardRole === 'ADMIN' || currentUserBoardRole === 'EDITOR';
    const canDelete = isWorkspaceAdmin || currentUserBoardRole === 'ADMIN';
    const canChangeVisibility = isWorkspaceAdmin || currentUserBoardRole === 'ADMIN';

    // Sắp xếp lists và cards theo position
    if (b.lists) {
      b.lists.sort((x: any, y: any) => x.position - y.position);
      b.lists.forEach((list: any) => {
        if (list.cards) {
          list.cards.sort((x: any, y: any) => x.position - y.position);
        }
      });
    }

    const { background, icon } = extractBoardAppearance(b.background, b.icon);

    let hasPendingEditorRequest = false;
    try {
      const { data: pendingReq } = await this.supabase
        .from('board_editor_requests')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .eq('status', 'PENDING')
        .maybeSingle();

      hasPendingEditorRequest = Boolean(pendingReq);
    } catch {
      hasPendingEditorRequest = false;
    }

    return {
      ...b,
      editor_join_mode: b.editor_join_mode || 'REQUEST',
      hasPendingEditorRequest,
      is_archived: b.is_archived ?? false,
      visibility: b.visibility || 'WORKSPACE',
      background,
      icon,
      currentUserBoardRole,
      isWorkspaceOwner,
      isWorkspaceAdmin,
      isWorkspaceMember,
      isBoardMember,
      isGuest,
      canEdit,
      canManageMembers,
      canInviteMembers,
      canDelete,
      canChangeVisibility,
    };
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto) {
    const board = await this.findById(boardId, userId);
    if (!board.canEdit) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa thông tin Board này');
    }

    if ((dto.name !== undefined || dto.description !== undefined) && !board.canManageMembers && !board.isWorkspaceOwner && !board.isWorkspaceAdmin) {
      throw new ForbiddenException('Chỉ Quản trị viên Bảng (Admin) hoặc Quản trị viên Workspace mới có quyền đổi tên hoặc mô tả Bảng');
    }

    if (dto.visibility !== undefined && !board.canChangeVisibility && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên (Admin) hoặc Chủ sở hữu Workspace mới có quyền thay đổi quyền hiển thị của Board',
      );
    }

    if (dto.editor_join_mode !== undefined && !board.canManageMembers && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Bảng (Admin) hoặc Quản trị viên Workspace mới có quyền đổi chế độ gia nhập của Board');
    }

    if (dto.is_archived !== undefined && !board.canDelete && !board.isWorkspaceOwner && !board.isWorkspaceAdmin) {
      throw new ForbiddenException('Chỉ Quản trị viên Board hoặc Quản trị viên Workspace mới có quyền lưu trữ');
    }

    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description ? dto.description.trim() : null;
    if (dto.is_favorite !== undefined) updateData.is_favorite = dto.is_favorite;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;
    if (dto.editor_join_mode !== undefined) updateData.editor_join_mode = dto.editor_join_mode;
    if (dto.is_archived !== undefined) updateData.is_archived = dto.is_archived;
    if (dto.background !== undefined) updateData.background = dto.background;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    let updated: any;
    const { data, error } = await this.supabase
      .from('boards')
      .update(updateData)
      .eq('id', boardId)
      .select()
      .single();

    if (error) {
      // Fallback nếu cột mở rộng (icon, visibility, is_archived, background) chưa tồn tại trong schema
      if (error.code === '42703' || error.message?.includes('column')) {
        if (updateData.icon !== undefined) {
          const targetIcon = updateData.icon;
          delete updateData.icon;
          const currentBg = updateData.background !== undefined ? updateData.background : board.background;
          updateData.background = JSON.stringify({ bg: currentBg || null, icon: targetIcon || null });
        }
        if (error.message?.includes('visibility')) delete updateData.visibility;
        if (error.message?.includes('editor_join_mode')) delete updateData.editor_join_mode;
        if (error.message?.includes('is_archived')) delete updateData.is_archived;

        const { data: retryData, error: retryErr } = await this.supabase
          .from('boards')
          .update(updateData)
          .eq('id', boardId)
          .select()
          .single();

        if (retryErr) {
          if (retryErr.code === '42703' && retryErr.message?.includes('background')) {
            delete updateData.background;
            const { data: finalData, error: finalErr } = await this.supabase
              .from('boards')
              .update(updateData)
              .eq('id', boardId)
              .select()
              .single();
            if (finalErr) throw new BadRequestException(finalErr.message);
            updated = finalData;
          } else {
            throw new BadRequestException(retryErr.message);
          }
        } else {
          updated = retryData;
        }
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

    this.supabase.emitBoardEvent(boardId, 'BOARD_UPDATED', {
      boardId,
      senderId: userId,
    });

    if (board.workspace_id) {
      this.supabase.emitWorkspaceEvent(board.workspace_id, 'BOARD_UPDATED', {
        board: updated,
        senderId: userId,
      });
    }

    return this.findById(boardId, userId);
  }

  async toggleFavorite(boardId: string, userId: string) {
    const { data: board } = await this.supabase
      .from('boards')
      .select('id, workspace_id, is_favorite, workspaces:workspaces(owner_id)')
      .eq('id', boardId)
      .maybeSingle();

    if (!board) throw new NotFoundException('Không tìm thấy Board');

    const isWsOwner = (board.workspaces as any)?.owner_id === userId;
    if (!isWsOwner) {
      const { data: bm } = await this.supabase
        .from('board_members')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!bm) {
        const { data: wm } = await this.supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', board.workspace_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!wm) {
          throw new ForbiddenException('Bạn không có quyền truy cập Bảng này');
        }
      }
    }

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

    if (board.workspace_id) {
      this.supabase.emitWorkspaceEvent(board.workspace_id, 'BOARD_ARCHIVED', {
        boardId,
        senderId: userId,
      });
    }

    return { message: 'Đã lưu trữ Board thành công', is_archived: true };
  }

  async restoreBoard(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canDelete && !board.isWorkspaceOwner && !board.isWorkspaceAdmin) {
      throw new ForbiddenException('Chỉ Quản trị viên Board hoặc Quản trị viên Workspace mới có quyền khôi phục');
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

    if (board.workspace_id) {
      this.supabase.emitWorkspaceEvent(board.workspace_id, 'BOARD_RESTORED', {
        boardId,
        senderId: userId,
      });
    }

    return { message: 'Đã khôi phục Board thành công', is_archived: false };
  }

  async copyBoard(boardId: string, userId: string, dto: CopyBoardDto) {
    const sourceBoard = await this.findById(boardId, userId);
    const targetWorkspaceId = dto.targetWorkspaceId || sourceBoard.workspace_id;
    const wsAccess = await this.verifyWorkspaceAccess(targetWorkspaceId, userId);
    if (wsAccess.role === 'GUEST') {
      throw new ForbiddenException('Khách (Guest) không có quyền sao chép hoặc tạo Bảng trong Không gian làm việc này');
    }

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

    const copiedResult = await this.findById(newBoard.id, userId);
    if (targetWorkspaceId) {
      this.supabase.emitWorkspaceEvent(targetWorkspaceId, 'BOARD_CREATED', {
        board: copiedResult,
        senderId: userId,
      });
    }

    return copiedResult;
  }

  async delete(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canDelete && !board.isWorkspaceOwner && !board.isWorkspaceAdmin) {
      throw new ForbiddenException('Chỉ Quản trị viên Board hoặc Quản trị viên Workspace mới có quyền xóa Board');
    }

    const { error } = await this.supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) throw new BadRequestException(error.message);

    if (board.workspace_id) {
      this.supabase.emitWorkspaceEvent(board.workspace_id, 'BOARD_DELETED', {
        boardId,
        senderId: userId,
      });
    }

    return { message: 'Xóa Board thành công' };
  }

  // --- BOARD MEMBERS MANAGEMENT ---
  private async cleanupBoardCardAssignments(boardId: string, userId: string) {
    try {
      const { data: boardCards } = await this.supabase
        .from('cards')
        .select('id, list:lists!inner(board_id)')
        .eq('list.board_id', boardId);

      const cardIds = (boardCards || []).map((c: any) => c.id);
      if (cardIds.length > 0) {
        await this.supabase
          .from('card_assignees')
          .delete()
          .eq('user_id', userId)
          .in('card_id', cardIds);
      }
    } catch (err: any) {
      console.warn(`Failed to cleanup card assignments for user ${userId} in board ${boardId}: ${err?.message}`);
    }
  }

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

  async getAssignableMembers(boardId: string, userId: string) {
    await this.findById(boardId, userId);

    // Nghiệp vụ: Chỉ thành viên Board có role ADMIN hoặc EDITOR mới có thể được phân công Card
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
      .eq('board_id', boardId)
      .in('role', ['ADMIN', 'EDITOR', 'MEMBER']);

    if (error) throw new BadRequestException(error.message);

    return members || [];
  }

  async addBoardMember(boardId: string, currentUserId: string, dto: AddBoardMemberDto) {
    const board = await this.findById(boardId, currentUserId);
    // Cả Board ADMIN và Board EDITOR đều có quyền mời / thêm thành viên vào Board
    if (!board.canInviteMembers && !board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền thêm thành viên vào Board này (chỉ Admin và Editor)');
    }

    // Nếu người mời là EDITOR, vai trò của thành viên mới bắt buộc phải là EDITOR (Section 8.1)
    const roleToAssign = board.currentUserBoardRole === 'ADMIN' ? (dto.role || 'EDITOR') : 'EDITOR';

    // Kiểm tra xem targetUser có thuộc Workspace không (hoặc là chủ sở hữu workspace)
    const isWsOwner = (board.workspace as any)?.owner_id === dto.userId;
    if (!isWsOwner) {
      const { data: wsMember } = await this.supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', board.workspace_id)
        .eq('user_id', dto.userId)
        .maybeSingle();

      if (!wsMember) {
        throw new BadRequestException('Người dùng này chưa phải là thành viên của Không gian làm việc. Phải mời vào Workspace trước.');
      }
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
        role: roleToAssign,
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

    if (dto.userId && dto.userId !== currentUserId) {
      const boardTitle = board.name || 'Bảng';
      await this.notificationsService.createNotification({
        userId: dto.userId,
        title: 'Lời mời tham gia bảng',
        message: `Bạn đã được thêm vào bảng "${boardTitle}"||/boards/${boardId}`,
        type: 'BOARD_INVITE',
      }).catch(() => {});
    }

    return newMember;
  }

  async updateBoardMemberRole(
    boardId: string,
    currentUserId: string,
    targetUserId: string,
    dto: UpdateBoardMemberRoleDto,
  ) {
    const board = await this.findById(boardId, currentUserId);
    // Nghiệp vụ TC05C & Section 8.1: Chỉ Board ADMIN mới có quyền thay đổi Board Role
    if (board.currentUserBoardRole !== 'ADMIN' && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Board (Admin) hoặc Quản trị viên Workspace mới có quyền thay đổi vai trò thành viên');
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

    // Nghiệp vụ TC11 & Section 26: Khi đổi sang VIEWER, tự động gỡ bỏ thành viên khỏi tất cả Card Assignment trong Board đó
    if (dto.role === 'VIEWER') {
      await this.cleanupBoardCardAssignments(boardId, targetUserId);
    }

    const targetUserObj = Array.isArray((updated as any)?.user) ? (updated as any)?.user[0] : (updated as any)?.user;
    const targetName = targetUserObj?.name || targetUserObj?.email || 'thành viên';
    const roleLabel = dto.role === 'ADMIN' ? 'Quản trị viên' : dto.role === 'VIEWER' ? 'Người xem' : 'Biên tập viên';

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: currentUserId,
      action: `đã đổi vai trò của "${targetName}" thành ${roleLabel} trong Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
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
          title: 'Thay đổi vai trò trong Bảng',
          message: `${changerName} đã thay đổi vai trò của bạn thành "${roleLabel}" trong bảng "${board.name}".`,
          type: 'BOARD_ROLE_UPDATED',
        })
        .catch(() => {});

      this.supabase.emitUserEvent(targetUserId, 'BOARD_MEMBERS_CHANGED', {
        boardId,
        action: 'ROLE_UPDATED',
        role: dto.role,
      });
    }

    this.supabase.emitBoardEvent(boardId, 'BOARD_MEMBERS_CHANGED', {
      senderId: currentUserId,
    });

    return updated;
  }

  async removeBoardMember(boardId: string, currentUserId: string, targetUserId: string) {
    const board = await this.findById(boardId, currentUserId);
    // Nghiệp vụ TC05B & Section 8.1: Chỉ Board ADMIN mới có quyền xóa thành viên khỏi Board
    if (board.currentUserBoardRole !== 'ADMIN' && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Board (Admin) hoặc Quản trị viên Workspace mới có quyền xóa thành viên khỏi Board này');
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

    // Nghiệp vụ TC10 & Section 27: Cleanup toàn bộ Card Assignment của user trong Board này trước khi xóa BoardMember
    await this.cleanupBoardCardAssignments(boardId, targetUserId);

    // Lấy thông tin thành viên bị xóa để ghi rõ tên trong dòng hoạt động
    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email')
      .eq('id', targetUserId)
      .maybeSingle();

    const targetName = targetUser?.name || targetUser?.email || 'thành viên';

    const { error } = await this.supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', targetUserId);

    if (error) throw new BadRequestException(error.message);

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: currentUserId,
      action: `đã xóa thành viên "${targetName}" khỏi Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
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
          title: 'Thông báo rời khỏi Bảng Kanban',
          message: `Bạn đã bị ${removerName} xóa khỏi bảng "${board.name}".`,
          type: 'BOARD_REMOVED',
        })
        .catch(() => {});

      this.supabase.emitUserEvent(targetUserId, 'BOARD_MEMBERS_CHANGED', {
        boardId,
        action: 'REMOVED',
      });
    }

    this.supabase.emitBoardEvent(boardId, 'BOARD_MEMBERS_CHANGED', {
      senderId: currentUserId,
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

    // Dọn dẹp Card Assignment của chính mình trong board trước khi rời
    await this.cleanupBoardCardAssignments(boardId, currentUserId);

    const { error } = await this.supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', currentUserId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Bạn đã rời khỏi Board thành công' };
  }

  // --- BOARD INVITATIONS ---
  async inviteMember(boardId: string, currentUserId: string, dto: InviteBoardMemberDto) {
    const board = await this.findById(boardId, currentUserId);
    // Cả Board ADMIN và Board EDITOR đều được quyền mời thành viên vào Board (Section 8.1 & TC05)
    if (!board.canInviteMembers && !board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền mời thành viên vào Board');
    }

    const email = dto.email.trim().toLowerCase();
    // Nếu Actor là EDITOR, role mời bắt buộc là EDITOR (chỉ Admin mới được chọn role khác)
    const role = board.currentUserBoardRole === 'ADMIN' ? (dto.role || 'EDITOR') : 'EDITOR';

    // 1. Kiểm tra xem người dùng đã là thành viên của Board chưa
    const { data: targetUser } = await this.supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle();

    if (targetUser) {
      const { data: existingMember } = await this.supabase
        .from('board_members')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (existingMember) {
        throw new ConflictException('Người dùng này đã là thành viên của Bảng');
      }
    }

    // 2. Kiểm tra xem đã có lời mời PENDING còn hạn cho email này chưa
    const now = new Date().toISOString();
    const { data: existingInvite } = await this.supabase
      .from('board_invites')
      .select('id, token, expired_at, role, status')
      .eq('board_id', boardId)
      .eq('email', email)
      .eq('status', 'PENDING')
      .gte('expired_at', now)
      .maybeSingle();

    if (existingInvite) {
      return {
        type: 'INVITE_EXISTS',
        message: 'Lời mời cho email này đã được gửi trước đó và vẫn còn hiệu lực',
        invite: existingInvite,
      };
    }

    // 3. Tạo lời mời mới
    const token = crypto.randomBytes(32).toString('hex');
    const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error } = await this.supabase
      .from('board_invites')
      .insert({
        board_id: boardId,
        inviter_id: currentUserId,
        email,
        role,
        token,
        status: 'PENDING',
        expired_at: expiredAt,
      })
      .select()
      .single();

    if (error || !invite) {
      throw new BadRequestException(error?.message || 'Không thể tạo lời mời tham gia Board');
    }

    // 4. Nếu người dùng đã có tài khoản, gửi thông báo trực tiếp
    if (targetUser) {
      await this.notificationsService
        .createNotification({
          userId: targetUser.id,
          title: 'Lời mời tham gia Bảng',
          message: `Bạn nhận được lời mời tham gia Bảng "${board.name}" với vai trò ${role}.||/invite/${token}`,
          type: 'BOARD_INVITE',
        })
        .catch(() => {});
    }

    // 5. Ghi log hoạt động
    await this.activitiesService
      .logActivity({
        workspaceId: board.workspace_id,
        userId: currentUserId,
        action: `đã gửi lời mời tham gia Bảng tới ${email}`,
        targetType: `board:${boardId}`,
      })
      .catch(() => {});

    return {
      type: 'INVITE_CREATED',
      message: 'Tạo lời mời tham gia Bảng thành công!',
      invite,
    };
  }

  async getPendingBoardInvites(boardId: string, currentUserId: string) {
    const board = await this.findById(boardId, currentUserId);
    if (!board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách lời mời của Bảng');
    }

    const { data: invites, error } = await this.supabase
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
        inviter:users!fk_board_invite_inviter (
          id,
          name,
          email,
          avatar
        )
      `)
      .eq('board_id', boardId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return invites || [];
  }

  async revokeBoardInvite(boardId: string, currentUserId: string, inviteId: string) {
    const board = await this.findById(boardId, currentUserId);
    if (!board.canManageMembers) {
      throw new ForbiddenException('Bạn không có quyền thu hồi lời mời');
    }

    const { error } = await this.supabase
      .from('board_invites')
      .delete()
      .eq('board_id', boardId)
      .eq('id', inviteId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Đã thu hồi lời mời thành công' };
  }

  async getBoardInviteByToken(token: string) {
    const { data: invite, error } = await this.supabase
      .from('board_invites')
      .select(`
        id,
        board_id,
        inviter_id,
        email,
        role,
        token,
        status,
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
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) {
      throw new NotFoundException('Lời mời không tồn tại hoặc liên kết không hợp lệ');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException(
        invite.status === 'ACCEPTED'
          ? 'Lời mời này đã được chấp nhận trước đó'
          : 'Lời mời này không còn khả dụng',
      );
    }

    if (new Date(invite.expired_at) < new Date()) {
      throw new BadRequestException('Lời mời này đã hết hạn sử dụng');
    }

    return invite;
  }

  async acceptBoardInvite(token: string, userId: string) {
    const invite = await this.getBoardInviteByToken(token);
    const board = invite.board as any;

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

    // 1. Kiểm tra xem đã là member của Board chưa
    const { data: existingMember } = await this.supabase
      .from('board_members')
      .select('id')
      .eq('board_id', invite.board_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingMember) {
      const { error: insertErr } = await this.supabase
        .from('board_members')
        .insert({
          board_id: invite.board_id,
          user_id: userId,
          role: invite.role,
        });

      if (insertErr) {
        throw new BadRequestException(insertErr.message);
      }
    }

    // 2. Người dùng truy cập Không gian làm việc với tư cách Khách (Guest) thông qua board_members, không tự ý gán MEMBER toàn Workspace.

    // 3. Cập nhật trạng thái lời mời thành ACCEPTED
    await this.supabase
      .from('board_invites')
      .update({ status: 'ACCEPTED' })
      .eq('id', invite.id);

    // 4. Ghi log hoạt động
    await this.activitiesService
      .logActivity({
        workspaceId: board.workspace_id,
        userId,
        action: `đã gia nhập Bảng "${board.name}" qua lời mời`,
        targetType: `board:${invite.board_id}`,
      })
      .catch(() => {});

    // 5. Thông báo cho người mời
    await this.notificationsService
      .createNotification({
        userId: invite.inviter_id,
        title: 'Lời mời Bảng được chấp nhận',
        message: `Thành viên đã chấp nhận lời mời gia nhập Bảng "${board.name}".||/boards/${invite.board_id}`,
        type: 'BOARD_INVITE_ACCEPTED',
      })
      .catch(() => {});

    return {
      message: 'Gia nhập Bảng thành công!',
      boardId: invite.board_id,
      workspaceId: board?.workspace_id,
    };
  }

  async rejectBoardInvite(token: string, userId: string) {
    const invite = await this.getBoardInviteByToken(token);

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
      .from('board_invites')
      .update({ status: 'REJECTED' })
      .eq('id', invite.id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Đã từ chối lời mời tham gia Bảng' };
  }

  private async verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<{ role: string }> {
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace) {
      throw new NotFoundException('Không tìm thấy Không gian làm việc');
    }

    if (workspace.owner_id === userId) {
      return { role: 'OWNER' };
    }

    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (member) {
      return { role: member.role || 'MEMBER' };
    }

    // Kiểm tra nếu là Khách (Guest) trong ít nhất một Bảng thuộc Workspace
    const { data: boards } = await this.supabase
      .from('boards')
      .select('id, members:board_members(user_id)')
      .eq('workspace_id', workspaceId);

    const isBoardGuest = (boards || []).some((b: any) =>
      (b.members || []).some((m: any) => m.user_id === userId)
    );

    if (isBoardGuest) {
      return { role: 'GUEST' };
    }

    throw new ForbiddenException('Bạn không có quyền truy cập Không gian làm việc này');
  }

  async uploadBackground(boardId: string, file: Express.Multer.File, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canEdit) {
      throw new ForbiddenException('Bạn không có quyền thay đổi hình nền của Bảng này');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp ảnh hợp lệ để tải lên');
    }

    const ALLOWED_BG_MIMES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    if (!file.mimetype || !ALLOWED_BG_MIMES[file.mimetype]) {
      throw new BadRequestException('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP, GIF');
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Dung lượng ảnh không được vượt quá 15MB');
    }

    let publicUrl = '';
    const ext = ALLOWED_BG_MIMES[file.mimetype];
    const filePath = `boards/${boardId}/background-${Date.now()}.${ext}`;

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

    // Tự động lưu hình nền mới vào Board, đồng thời lấy thẳng ảnh nền làm favicon & biểu tượng đại diện
    await this.update(boardId, userId, { background: publicUrl, icon: publicUrl });

    return {
      success: true,
      url: publicUrl,
      icon: publicUrl,
    };
  }

  async uploadIcon(boardId: string, file: Express.Multer.File, userId: string) {
    const board = await this.findById(boardId, userId);
    if (!board.canEdit) {
      throw new ForbiddenException('Bạn không có quyền thay đổi biểu tượng của Bảng này');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp ảnh biểu tượng hợp lệ');
    }

    const ALLOWED_ICON_MIMES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
    };
    if (!file.mimetype || !ALLOWED_ICON_MIMES[file.mimetype]) {
      throw new BadRequestException('Định dạng ảnh biểu tượng không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP, GIF, ICO');
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Dung lượng ảnh biểu tượng không được vượt quá 5MB');
    }

    let publicUrl = '';
    const ext = ALLOWED_ICON_MIMES[file.mimetype];
    const filePath = `boards/${boardId}/icon-${Date.now()}.${ext}`;

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

    // Tự động lưu icon mới vào Board
    await this.update(boardId, userId, { icon: publicUrl });

    return {
      success: true,
      url: publicUrl,
    };
  }

  // --- BOARD EDITOR JOIN MODE & REQUESTS METHODS ---

  async requestEditor(boardId: string, userId: string, dto?: RequestEditorDto) {
    const board = await this.findById(boardId, userId);

    if (board.currentUserBoardRole === 'ADMIN' || board.currentUserBoardRole === 'EDITOR') {
      throw new BadRequestException('Bạn đã có quyền Biên tập viên hoặc Quản trị viên trong Bảng này');
    }

    const { data: existingReq } = await this.supabase
      .from('board_editor_requests')
      .select('id, status, created_at')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingReq) {
      return {
        message: 'Yêu cầu cấp quyền Biên tập viên của bạn đã được gửi trước đó và đang chờ phê duyệt',
        request: existingReq,
      };
    }

    const { data: newRequest, error: reqErr } = await this.supabase
      .from('board_editor_requests')
      .insert({
        board_id: boardId,
        user_id: userId,
        note: dto?.note?.trim() || null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (reqErr) {
      throw new BadRequestException(reqErr.message || 'Không thể gửi yêu cầu cấp quyền Biên tập viên');
    }

    const { data: senderUser } = await this.supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .maybeSingle();
    const senderName = senderUser?.name || 'Một thành viên';

    const recipientIds = new Set<string>();

    (board.members || []).forEach((m: any) => {
      if (m.role === 'ADMIN' && m.user_id !== userId) {
        recipientIds.add(m.user_id);
      }
    });

    const wsOwnerId = (board.workspace as any)?.owner_id;
    if (wsOwnerId && wsOwnerId !== userId) {
      recipientIds.add(wsOwnerId);
    }

    const { data: wsAdmins } = await this.supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', board.workspace_id)
      .eq('role', 'ADMIN');

    (wsAdmins || []).forEach((wa: any) => {
      if (wa.user_id !== userId) {
        recipientIds.add(wa.user_id);
      }
    });

    const notifTitle = 'Yêu cầu quyền Biên tập viên';
    const notifMessage = `${senderName} đã gửi yêu cầu cấp quyền Biên tập viên trong Bảng ${board.name}||/boards/${boardId}`;

    await Promise.all(
      Array.from(recipientIds).map((targetId) =>
        this.notificationsService.createNotification({
          userId: targetId,
          title: notifTitle,
          message: notifMessage,
          type: 'BOARD_EDITOR_REQUEST',
        }).catch(() => {})
      )
    );

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId,
      action: `đã gửi yêu cầu cấp quyền Biên tập viên trong Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
    });

    this.supabase.emitBoardEvent(boardId, 'EDITOR_REQUEST_CREATED', {
      boardId,
      requestId: newRequest.id,
      userId,
      senderName,
    });

    return {
      message: 'Gửi yêu cầu cấp quyền Biên tập viên thành công. Vui lòng chờ Quản trị viên phê duyệt.',
      request: newRequest,
    };
  }

  async claimEditor(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);

    if (board.editor_join_mode !== 'AUTO_WORKSPACE') {
      throw new BadRequestException('Bảng này không cho phép tự động nhận quyền Biên tập viên. Vui lòng gửi yêu cầu phê duyệt.');
    }

    if (board.isGuest || !board.isWorkspaceMember) {
      throw new ForbiddenException('Chỉ thành viên chính thức của Không gian làm việc mới có quyền tự nhận làm Biên tập viên');
    }

    const { data: existingMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    let memberResult: any;
    if (existingMember) {
      if (existingMember.role === 'ADMIN') {
        memberResult = existingMember;
      } else {
        const { data: updated, error: uErr } = await this.supabase
          .from('board_members')
          .update({ role: 'EDITOR' })
          .eq('id', existingMember.id)
          .select(`
            id,
            board_id,
            user_id,
            role,
            joined_at,
            user:users (id, name, email, avatar)
          `)
          .single();
        if (uErr) throw new BadRequestException(uErr.message);
        memberResult = updated;
      }
    } else {
      const { data: inserted, error: iErr } = await this.supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: userId,
          role: 'EDITOR',
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
      if (iErr) throw new BadRequestException(iErr.message);
      memberResult = inserted;
    }

    await this.supabase
      .from('board_editor_requests')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .eq('status', 'PENDING');

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId,
      action: `đã tham gia Bảng "${board.name}" với vai trò Biên tập viên (Tự động)`,
      targetType: `board:${boardId}`,
    });

    this.supabase.emitBoardEvent(boardId, 'MEMBER_JOINED', {
      boardId,
      userId,
      role: 'EDITOR',
    });

    return {
      message: 'Nhận quyền Biên tập viên thành công',
      member: memberResult,
    };
  }

  async getEditorRequests(boardId: string, userId: string) {
    const board = await this.findById(boardId, userId);

    if (!board.canManageMembers && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Bảng hoặc Quản trị viên Workspace mới có quyền xem danh sách yêu cầu Biên tập viên');
    }

    const { data: requests, error } = await this.supabase
      .from('board_editor_requests')
      .select(`
        id,
        board_id,
        user_id,
        note,
        status,
        created_at,
        updated_at,
        user:users (id, name, email, avatar)
      `)
      .eq('board_id', boardId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return requests || [];
  }

  async approveEditorRequest(boardId: string, targetUserId: string, actorId: string) {
    const board = await this.findById(boardId, actorId);

    if (!board.canManageMembers && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Bảng hoặc Quản trị viên Workspace mới có quyền phê duyệt yêu cầu');
    }

    const { data: updatedReq, error: reqErr } = await this.supabase
      .from('board_editor_requests')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('board_id', boardId)
      .eq('user_id', targetUserId)
      .eq('status', 'PENDING')
      .select()
      .maybeSingle();

    if (reqErr) throw new BadRequestException(reqErr.message);

    const { data: existingMember } = await this.supabase
      .from('board_members')
      .select('id, role')
      .eq('board_id', boardId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    let memberResult: any;
    if (existingMember) {
      if (existingMember.role !== 'ADMIN') {
        const { data: updated, error: uErr } = await this.supabase
          .from('board_members')
          .update({ role: 'EDITOR' })
          .eq('id', existingMember.id)
          .select(`
            id,
            board_id,
            user_id,
            role,
            joined_at,
            user:users (id, name, email, avatar)
          `)
          .single();
        if (uErr) throw new BadRequestException(uErr.message);
        memberResult = updated;
      } else {
        memberResult = existingMember;
      }
    } else {
      const { data: inserted, error: iErr } = await this.supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: targetUserId,
          role: 'EDITOR',
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
      if (iErr) throw new BadRequestException(iErr.message);
      memberResult = inserted;
    }

    await this.notificationsService.createNotification({
      userId: targetUserId,
      title: 'Yêu cầu được phê duyệt',
      message: `Yêu cầu cấp quyền Biên tập viên trong Bảng "${board.name}" của bạn đã được phê duyệt||/boards/${boardId}`,
      type: 'BOARD_EDITOR_APPROVED',
    }).catch(() => {});

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: actorId,
      action: `đã phê duyệt quyền Biên tập viên cho thành viên trong Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
    });

    this.supabase.emitBoardEvent(boardId, 'EDITOR_REQUEST_APPROVED', {
      boardId,
      targetUserId,
      actorId,
    });

    return {
      message: 'Đã phê duyệt yêu cầu cấp quyền Biên tập viên thành công',
      member: memberResult,
      request: updatedReq,
    };
  }

  async rejectEditorRequest(boardId: string, targetUserId: string, actorId: string) {
    const board = await this.findById(boardId, actorId);

    if (!board.canManageMembers && !board.isWorkspaceAdmin && !board.isWorkspaceOwner) {
      throw new ForbiddenException('Chỉ Quản trị viên Bảng hoặc Quản trị viên Workspace mới có quyền từ chối yêu cầu');
    }

    const { data: updatedReq, error: reqErr } = await this.supabase
      .from('board_editor_requests')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('board_id', boardId)
      .eq('user_id', targetUserId)
      .eq('status', 'PENDING')
      .select()
      .maybeSingle();

    if (reqErr) throw new BadRequestException(reqErr.message);

    await this.notificationsService.createNotification({
      userId: targetUserId,
      title: 'Yêu cầu bị từ chối',
      message: `Yêu cầu cấp quyền Biên tập viên trong Bảng "${board.name}" của bạn đã bị từ chối||/boards/${boardId}`,
      type: 'BOARD_EDITOR_REJECTED',
    }).catch(() => {});

    await this.activitiesService.logActivity({
      workspaceId: board.workspace_id,
      userId: actorId,
      action: `đã từ chối yêu cầu cấp quyền Biên tập viên trong Bảng "${board.name}"`,
      targetType: `board:${boardId}`,
    });

    this.supabase.emitBoardEvent(boardId, 'EDITOR_REQUEST_REJECTED', {
      boardId,
      targetUserId,
      actorId,
    });

    return {
      message: 'Đã từ chối yêu cầu cấp quyền Biên tập viên',
      request: updatedReq,
    };
  }
}
