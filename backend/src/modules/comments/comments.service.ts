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
      .select('id, workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (error || !board) {
      throw new NotFoundException('Không tìm thấy Bảng (Board)');
    }

    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', board.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', board.workspace_id)
        .maybeSingle();

      if (workspace?.owner_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
      }
    }

    return board;
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

  // Thêm bình luận mới và xử lý @mention notifications
  async createComment(cardId: string, userId: string, dto: CreateCommentDto) {
    const { card, boardId } = await this.verifyCardAccess(cardId, userId);
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

    const { workspaceId } = await this.verifyCardAccess(cardId, userId);
    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: 'đã bình luận về thẻ này',
        targetType: `card:${cardId}`,
      });
    }

    // 2. Xử lý @mention và tạo notifications nếu có
    if (boardId && content.includes('@')) {
      try {
        // Lấy danh sách thành viên trong bảng
        const { data: boardMembers } = await this.supabase
          .from('board_members')
          .select('user_id, user:users (id, name)')
          .eq('board_id', boardId);

        if (boardMembers && boardMembers.length > 0) {
          const authorName = (comment.user as any)?.name || 'Một thành viên';
          const cardTitle = card.title || 'thẻ công việc';

          for (const member of boardMembers) {
            const memberUserId = member.user_id;
            const memberName = (member.user as any)?.name;

            // Không gửi thông báo cho chính người viết comment
            if (memberUserId === userId || !memberName) continue;

            // Kiểm tra xem nội dung comment có chứa @Tên thành viên không (case-insensitive)
            const mentionTag = `@${memberName.toLowerCase()}`;
            const contentLower = content.toLowerCase();

            if (contentLower.includes(mentionTag)) {
              await this.supabase.from('notifications').insert({
                user_id: memberUserId,
                title: `${authorName} đã nhắc đến bạn trong một bình luận`,
                message: `${authorName} đã nhắc đến bạn trong thẻ "${cardTitle}": "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"||/boards/${boardId}?cardId=${cardId}`,
                type: 'MENTION',
                is_read: false,
              });
            }
          }
        }
      } catch (notifyErr) {
        // Log warning nhưng không làm gián đoạn việc tạo comment
        console.warn('Lỗi khi gửi thông báo mention:', notifyErr);
      }
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

    const isAuthor = existing.user_id === userId;
    if (!isAuthor) {
      // Nếu không phải tác giả, kiểm tra xem user có phải Admin/Owner của Board không
      const boardId = (existing.card as any)?.list?.board_id;
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

    return { message: 'Đã xóa bình luận thành công', id: commentId, card_id: existing.card_id };
  }
}
