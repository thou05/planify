import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  private async verifyBoardAccess(boardId: string, userId: string) {
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
      if (board.visibility === 'PRIVATE') {
        throw new ForbiddenException('Bảng này ở chế độ Riêng tư (Private), bạn không có quyền truy cập');
      }
      return board;
    }

    if (board.visibility === 'PUBLIC') {
      return board;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
  }

  private async verifyCardAccess(cardId: string, userId: string) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select('id, title, list:lists (board_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thẻ (Card)');
    }

    const boardId = (card.list as any)?.board_id;
    let workspaceId = '';
    if (boardId) {
      const b = await this.verifyBoardAccess(boardId, userId);
      workspaceId = b.workspace_id;
    }

    return { card, boardId, workspaceId };
  }

  // Lấy tất cả bình luận của 1 thẻ
  async getCardComments(cardId: string, userId: string) {
    await this.verifyCardAccess(cardId, userId);

    const { data: comments, error } = await this.supabase
      .from('comments')
      .select(`
        id,
        card_id,
        user_id,
        content,
        created_at,
        user:users (id, name, email, avatar)
      `)
      .eq('card_id', cardId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách bình luận');
    }

    return comments || [];
  }

  private async handleMentionNotifications(params: {
    cardId: string;
    boardId: string;
    workspaceId?: string;
    authorId: string;
    authorName: string;
    cardTitle: string;
    content: string;
  }) {
    const { cardId, boardId, workspaceId, authorId, authorName, cardTitle, content } = params;
    if (!content.includes('@')) return;

    try {
      const usersMap = new Map<string, { id: string; name: string }>();

      // 1. Lấy danh sách thành viên trong bảng
      if (boardId) {
        const { data: boardMembers } = await this.supabase
          .from('board_members')
          .select('user_id, user:users (id, name)')
          .eq('board_id', boardId);

        if (boardMembers) {
          for (const bm of boardMembers) {
            const u = bm.user as any;
            if (bm.user_id && u?.name) {
              usersMap.set(bm.user_id, { id: bm.user_id, name: u.name });
            }
          }
        }
      }

      // 2. Lấy danh sách thành viên trong Workspace & Owner
      if (workspaceId) {
        const { data: wsMembers } = await this.supabase
          .from('workspace_members')
          .select('user_id, user:users (id, name)')
          .eq('workspace_id', workspaceId);

        if (wsMembers) {
          for (const wm of wsMembers) {
            const u = wm.user as any;
            if (wm.user_id && u?.name && !usersMap.has(wm.user_id)) {
              usersMap.set(wm.user_id, { id: wm.user_id, name: u.name });
            }
          }
        }

        const { data: ws } = await this.supabase
          .from('workspaces')
          .select('owner_id, owner:users!workspaces_owner_id_fkey (id, name)')
          .eq('id', workspaceId)
          .maybeSingle();

        if (ws?.owner_id && !usersMap.has(ws.owner_id)) {
          const ownerUser = ws.owner as any;
          if (ownerUser?.name) {
            usersMap.set(ws.owner_id, { id: ws.owner_id, name: ownerUser.name });
          }
        }
      }

      const contentLower = content.toLowerCase();

      for (const [targetUserId, userInfo] of usersMap.entries()) {
        // Không gửi thông báo cho chính người viết comment
        if (targetUserId === authorId || !userInfo.name) continue;

        const mentionTag = `@${userInfo.name.toLowerCase()}`;
        if (contentLower.includes(mentionTag)) {
          const newNotif = {
            user_id: targetUserId,
            title: `${authorName} đã nhắc đến bạn trong một bình luận`,
            message: `${authorName} đã nhắc đến bạn trong thẻ "${cardTitle}": "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"||/boards/${boardId}?cardId=${cardId}`,
            type: 'MENTION',
            is_read: false,
          };

          const { data: insertedNotif } = await this.supabase
            .from('notifications')
            .insert(newNotif)
            .select()
            .single();

          if (insertedNotif) {
            this.supabase.emitUserEvent(targetUserId, 'NOTIFICATION_RECEIVED', {
              notification: insertedNotif,
              unreadCountDelta: 1,
            });
          }
        }
      }
    } catch (notifyErr) {
      console.warn('Lỗi khi gửi thông báo mention:', notifyErr);
    }
  }

  // Thêm bình luận mới và xử lý @mention notifications
  async createComment(cardId: string, userId: string, dto: CreateCommentDto) {
    const { card, boardId, workspaceId } = await this.verifyCardAccess(cardId, userId);
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }

    // 1. Thêm comment vào database
    const { data: comment, error } = await this.supabase
      .from('comments')
      .insert({
        card_id: cardId,
        user_id: userId,
        content,
      })
      .select(`
        id,
        card_id,
        user_id,
        content,
        created_at,
        user:users (id, name, email, avatar)
      `)
      .single();

    if (error || !comment) {
      throw new BadRequestException(error?.message || 'Không thể tạo bình luận');
    }

    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: 'đã bình luận về thẻ này',
        targetType: `card:${cardId}`,
      });
    }

    // 2. Xử lý @mention và tạo notifications cho thành viên Board + Workspace
    if (boardId && content.includes('@')) {
      const authorName = (comment.user as any)?.name || 'Một thành viên';
      const cardTitle = card.title || 'thẻ công việc';
      await this.handleMentionNotifications({
        cardId,
        boardId,
        workspaceId,
        authorId: userId,
        authorName,
        cardTitle,
        content,
      });
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
    }

    return comment;
  }

  // Chỉnh sửa bình luận
  async updateComment(commentId: string, userId: string, dto: UpdateCommentDto) {
    const { data: existing, error: findError } = await this.supabase
      .from('comments')
      .select('id, user_id, card_id')
      .eq('id', commentId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa bình luận của chính mình');
    }

    const { boardId } = await this.verifyCardAccess(existing.card_id, userId);

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }

    const { data: updatedComment, error: updateError } = await this.supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select(`
        id,
        card_id,
        user_id,
        content,
        created_at,
        user:users (id, name, email, avatar)
      `)
      .single();

    if (updateError || !updatedComment) {
      throw new BadRequestException(updateError?.message || 'Không thể cập nhật bình luận');
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId: existing.card_id,
        senderId: userId,
      });
    }

    return updatedComment;
  }

  // Xóa bình luận
  async deleteComment(commentId: string, userId: string) {
    const { data: existing, error: findError } = await this.supabase
      .from('comments')
      .select('id, user_id, card_id, card:cards (list:lists (board_id))')
      .eq('id', commentId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }

    const boardId = (existing.card as any)?.list?.board_id;
    const isAuthor = existing.user_id === userId;
    if (!isAuthor) {
      // Nếu không phải tác giả, kiểm tra xem user có phải Admin/Owner của Board không
      if (boardId) {
        await this.verifyBoardAccess(boardId, userId);
      } else {
        throw new ForbiddenException('Bạn không có quyền xóa bình luận này');
      }
    }

    const { error: delError } = await this.supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (delError) {
      throw new BadRequestException(delError.message || 'Không thể xóa bình luận');
    }

    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId: existing.card_id,
        senderId: userId,
      });
    }

    return { message: 'Đã xóa bình luận thành công', id: commentId, card_id: existing.card_id };
  }
}
