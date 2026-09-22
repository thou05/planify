import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private readonly supabase: SupabaseService) {}

  onModuleInit() {
    // Chạy quét hạn chót thẻ nền mỗi 2 phút
    setInterval(() => {
      this.checkDueCardReminders();
    }, 2 * 60 * 1000);
  }

  /**
   * Tạo thông báo mới cho người dùng
   */
  async createNotification(dto: CreateNotificationDto) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: dto.userId,
        title: dto.title.trim(),
        message: dto.message.trim(),
        type: dto.type || 'SYSTEM',
        is_read: false,
      })
      .select('id, user_id, title, message, type, is_read, created_at')
      .single();

    if (error) {
      console.error('Lỗi khi tạo notification:', error);
      throw new BadRequestException(error.message || 'Không thể tạo thông báo');
    }

    return data;
  }

  /**
   * Lấy danh sách thông báo của người dùng kèm số lượng chưa đọc
   */
  async getUserNotifications(userId: string, query?: QueryNotificationsDto) {
    // Kích hoạt quét nhanh thẻ đến hạn của user
    this.checkDueCardReminders(userId).catch(() => {});

    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    let dbQuery = this.supabase
      .from('notifications')
      .select('id, user_id, title, message, type, is_read, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (query?.unreadOnly) {
      dbQuery = dbQuery.eq('is_read', false);
    }

    const { data: notifications, error, count } = await dbQuery.range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách thông báo');
    }

    // Đếm riêng số lượng chưa đọc tổng cộng
    const { count: unreadCount } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      notifications: notifications || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Đếm nhanh số lượng thông báo chưa đọc
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    // Kích hoạt quét nhanh thẻ đến hạn của user
    this.checkDueCardReminders(userId).catch(() => {});

    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { count: 0 };
    }

    return { count: count || 0 };
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(id: string, userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, user_id, title, message, type, is_read, created_at')
      .single();

    if (error || !data) {
      throw new NotFoundException('Không tìm thấy thông báo hoặc bạn không có quyền cập nhật');
    }

    return data;
  }

  /**
   * Đánh dấu TẤT CẢ thông báo của người dùng là đã đọc
   */
  async markAllAsRead(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      throw new BadRequestException(error.message || 'Không thể đánh dấu tất cả thông báo');
    }

    return {
      success: true,
      updatedCount: data?.length || 0,
    };
  }

  /**
   * Xóa 1 thông báo
   */
  async deleteNotification(id: string, userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error || !data) {
      throw new NotFoundException('Không tìm thấy thông báo hoặc bạn không có quyền xóa');
    }

    return { success: true, id };
  }

  /**
   * Xóa tất cả các thông báo ĐÃ ĐỌC của người dùng
   */
  async clearAllRead(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true)
      .select('id');

    if (error) {
      throw new BadRequestException(error.message || 'Không thể xóa thông báo đã đọc');
    }

    return {
      success: true,
      deletedCount: data?.length || 0,
    };
  }

  /**
   * Quét các thẻ có hạn chót (sắp đến hạn hoặc quá hạn) để tự động tạo thông báo
   */
  async checkDueCardReminders(targetUserId?: string) {
    try {
      const now = new Date();

      const { data: cards, error } = await this.supabase
        .from('cards')
        .select(`
          id,
          title,
          list_id,
          due_date,
          reminder_at,
          is_due_date_completed,
          created_by,
          lists (
            id,
            board_id,
            boards (
              id,
              title
            )
          ),
          card_assignees (
            user_id
          )
        `)
        .eq('is_due_date_completed', false)
        .not('due_date', 'is', null);

      if (error || !cards || cards.length === 0) return;

      for (const c of cards as any[]) {
        if (!c.due_date) continue;
        const dueDate = new Date(c.due_date);
        if (isNaN(dueDate.getTime())) continue;

        const boardId = c.lists?.board_id || c.lists?.boards?.id;
        const boardTitle = c.lists?.boards?.title || 'Bảng làm việc';
        if (!boardId) continue;

        // Xác định danh sách user nhận thông báo: tất cả assignees và người tạo thẻ
        const recipientUserIds = new Set<string>();
        if (Array.isArray(c.card_assignees)) {
          c.card_assignees.forEach((a: any) => {
            if (a.user_id) recipientUserIds.add(a.user_id);
          });
        }
        if (c.created_by) recipientUserIds.add(c.created_by);

        if (recipientUserIds.size === 0) continue;

        const isOverdue = dueDate.getTime() < now.getTime();
        const reminderTime = c.reminder_at ? new Date(c.reminder_at).getTime() : null;
        const isReminderHit = reminderTime ? reminderTime <= now.getTime() : false;
        const isWithin24h =
          dueDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 && dueDate.getTime() > now.getTime();

        let notifType: 'DUE_SOON' | 'OVERDUE' | null = null;
        let notifTitle = '';
        let notifMessage = '';

        const formattedDueDate = dueDate.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        if (isOverdue) {
          notifType = 'OVERDUE';
          notifTitle = `🚨 Thẻ đã quá hạn: ${c.title}`;
          notifMessage = `Thẻ "${c.title}" trong bảng "${boardTitle}" đã quá hạn vào lúc ${formattedDueDate}||/boards/${boardId}?cardId=${c.id}`;
        } else if (isReminderHit || isWithin24h) {
          notifType = 'DUE_SOON';
          notifTitle = `⏰ Thẻ sắp đến hạn: ${c.title}`;
          notifMessage = `Thẻ "${c.title}" trong bảng "${boardTitle}" sẽ hết hạn vào lúc ${formattedDueDate}||/boards/${boardId}?cardId=${c.id}`;
        }

        if (!notifType) continue;

        for (const uId of Array.from(recipientUserIds)) {
          if (targetUserId && uId !== targetUserId) continue;

          // Chống trùng lặp (Deduplication): kiểm tra xem trong vòng 24 giờ qua đã gửi thông báo cùng loại cho thẻ này chưa
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          const { data: existingNotif } = await this.supabase
            .from('notifications')
            .select('id')
            .eq('user_id', uId)
            .eq('type', notifType)
            .ilike('message', `%${c.id}%`)
            .gte('created_at', oneDayAgo)
            .limit(1);

          if (existingNotif && existingNotif.length > 0) {
            continue; // Đã gửi trong vòng 24h rồi, bỏ qua
          }

          // Tạo thông báo mới
          await this.supabase.from('notifications').insert({
            user_id: uId,
            title: notifTitle,
            message: notifMessage,
            type: notifType,
            is_read: false,
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi quét thông báo hạn chót thẻ:', err);
    }
  }
}
