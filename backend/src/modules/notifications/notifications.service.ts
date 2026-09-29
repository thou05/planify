import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private readonly supabase: SupabaseService) {}

  onModuleInit() {
    if (!this.supabase.isConfigured()) {
      return;
    }

    // Quét ngay 1 lần khi server khởi động
    this.checkDueCardReminders().catch((err) => {
      console.error('Lỗi khi quét hạn chót thẻ lúc khởi động:', err);
    });

    // Chạy quét hạn chót thẻ nền mỗi 2 phút
    setInterval(() => {
      this.checkDueCardReminders().catch((err) => {
        console.error('Lỗi khi quét hạn chót thẻ định kỳ:', err);
      });
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

    if (data) {
      this.supabase.emitUserEvent(dto.userId, 'NOTIFICATION_RECEIVED', {
        notification: data,
      });
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

    this.supabase.emitUserEvent(userId, 'NOTIFICATION_UPDATED', {
      notificationId: id,
      isRead: true,
    });

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

    this.supabase.emitUserEvent(userId, 'ALL_NOTIFICATIONS_READ', {});

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

    this.supabase.emitUserEvent(userId, 'NOTIFICATION_DELETED', {
      notificationId: id,
    });

    return { success: true };
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
   * Quét các thẻ & mục công việc con có hạn chót (sắp đến hạn hoặc quá hạn) để tự động tạo thông báo
   */
  async checkDueCardReminders(targetUserId?: string) {
    if (!this.supabase.isConfigured()) {
      return;
    }
    try {
      const now = new Date();

      // =========================================================================
      // 1. QUÉT THỜI HẠN THẺ CÔNG VIỆC (CARDS)
      // ==========================================
      const { data: cards, error: cardError } = await this.supabase
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
              name
            )
          ),
          card_assignees (
            board_member:board_members (
              user_id
            )
          )
        `)
        .eq('is_due_date_completed', false)
        .not('due_date', 'is', null);

      if (cardError) {
        console.error('Lỗi khi truy vấn thẻ đến hạn:', cardError);
      } else if (cards && cards.length > 0) {
        for (const c of cards as any[]) {
          if (!c.due_date) continue;
          const dueDate = new Date(c.due_date);
          if (isNaN(dueDate.getTime())) continue;

          const boardId = c.lists?.board_id || c.lists?.boards?.id;
          const boardTitle = c.lists?.boards?.name || 'Bảng làm việc';
          if (!boardId) continue;

          // Xác định danh sách user nhận thông báo: tất cả assignees và người tạo thẻ
          const recipientUserIds = new Set<string>();
          if (Array.isArray(c.card_assignees)) {
            c.card_assignees.forEach((a: any) => {
              const uId = a.user_id || a.board_member?.user_id;
              if (uId) recipientUserIds.add(uId);
            });
          }
          if (c.created_by) recipientUserIds.add(c.created_by);

          if (recipientUserIds.size === 0) continue;

          const isOverdue = dueDate.getTime() < now.getTime();
          const overdueThresholdMs = 3 * 24 * 60 * 60 * 1000; // 3 ngày
          const isTooOldOverdue = isOverdue && now.getTime() - dueDate.getTime() > overdueThresholdMs;

          // Nếu quá hạn quá 3 ngày trước thì không spam thông báo
          if (isTooOldOverdue) continue;

          const reminderTime = c.reminder_at ? new Date(c.reminder_at).getTime() : null;
          const isReminderHit = reminderTime
            ? reminderTime <= now.getTime() && reminderTime > now.getTime() - 24 * 60 * 60 * 1000
            : false;
          const isWithin24h =
            dueDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 && dueDate.getTime() > now.getTime();

          let notifType: 'DUE_SOON' | 'OVERDUE' | null = null;
          let notifTitle = '';
          let notifMessage = '';
          let deduplicateFromDate = '';

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
            // Với OVERDUE: kiểm tra xem đã gửi thông báo kể từ thời điểm dueDate đến nay chưa (chỉ gửi 1 lần duy nhất cho mỗi deadline)
            deduplicateFromDate = dueDate.toISOString();
          } else if (isReminderHit || isWithin24h) {
            notifType = 'DUE_SOON';
            notifTitle = `⏰ Thẻ sắp đến hạn: ${c.title}`;
            notifMessage = `Thẻ "${c.title}" trong bảng "${boardTitle}" sẽ hết hạn vào lúc ${formattedDueDate}||/boards/${boardId}?cardId=${c.id}`;
            // Với DUE_SOON: kiểm tra trong khoảng 24h trước hạn
            deduplicateFromDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
          }

          if (!notifType || !deduplicateFromDate) continue;

          for (const uId of Array.from(recipientUserIds)) {
            if (targetUserId && uId !== targetUserId) continue;

            // Chống trùng lặp: kiểm tra xem đã có thông báo kể từ deduplicateFromDate chưa
            const { data: existingNotif } = await this.supabase
              .from('notifications')
              .select('id')
              .eq('user_id', uId)
              .eq('type', notifType)
              .ilike('message', `%cardId=${c.id}%`)
              .gte('created_at', deduplicateFromDate)
              .limit(1);

            if (existingNotif && existingNotif.length > 0) {
              continue; // Đã gửi 1 lần trong chu kỳ deadline này rồi, bỏ qua
            }

            // Tạo thông báo mới và phát sự kiện realtime WebSocket
            const { data: createdNotif } = await this.supabase
              .from('notifications')
              .insert({
                user_id: uId,
                title: notifTitle,
                message: notifMessage,
                type: notifType,
                is_read: false,
              })
              .select('id, user_id, title, message, type, is_read, created_at')
              .single();

            if (createdNotif) {
              this.supabase.emitUserEvent(uId, 'NOTIFICATION_RECEIVED', {
                notification: createdNotif,
              });
            }
          }
        }
      }

      // =========================================================================
      // 2. QUÉT THỜI HẠN MỤC CÔNG VIỆC CON (CHECKLIST ITEMS)
      // =========================================================================
      const { data: checklistItems, error: itemError } = await this.supabase
        .from('checklist_items')
        .select(`
          id,
          content,
          is_completed,
          due_date,
          member_id,
          checklist:checklists (
            id,
            title,
            card:cards (
              id,
              title,
              created_by,
              list:lists (
                id,
                board:boards (
                  id,
                  name
                )
              ),
              card_assignees (
                board_member:board_members (
                  user_id
                )
              )
            )
          ),
          member:board_members (
            id,
            user_id
          )
        `)
        .eq('is_completed', false)
        .not('due_date', 'is', null);

      if (itemError) {
        console.error('Lỗi khi truy vấn mục checklist đến hạn:', itemError);
      } else if (checklistItems && checklistItems.length > 0) {
        for (const item of checklistItems as any[]) {
          if (!item.due_date) continue;
          const dueDate = new Date(item.due_date);
          if (isNaN(dueDate.getTime())) continue;

          const card = item.checklist?.card;
          if (!card) continue;

          const boardId = card.list?.board?.id;
          const boardTitle = card.list?.board?.name || 'Bảng làm việc';
          if (!boardId) continue;

          const itemContent = item.content || 'Mục công việc';
          const cardTitle = card.title || 'Thẻ công việc';

          // Xác định người nhận: ưu tiên người được giao mục con, nếu không có thì gửi cho assignees & creator của thẻ
          const recipientUserIds = new Set<string>();
          if (item.member?.user_id) {
            recipientUserIds.add(item.member.user_id);
          } else {
            if (Array.isArray(card.card_assignees)) {
              card.card_assignees.forEach((a: any) => {
                const uId = a.user_id || a.board_member?.user_id;
                if (uId) recipientUserIds.add(uId);
              });
            }
            if (card.created_by) recipientUserIds.add(card.created_by);
          }

          if (recipientUserIds.size === 0) continue;

          const isOverdue = dueDate.getTime() < now.getTime();
          const overdueThresholdMs = 3 * 24 * 60 * 60 * 1000; // 3 ngày
          const isTooOldOverdue = isOverdue && now.getTime() - dueDate.getTime() > overdueThresholdMs;

          if (isTooOldOverdue) continue;

          const isWithin24h =
            dueDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 && dueDate.getTime() > now.getTime();

          let notifType: 'DUE_SOON' | 'OVERDUE' | null = null;
          let notifTitle = '';
          let notifMessage = '';
          let deduplicateFromDate = '';

          const formattedDueDate = dueDate.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          if (isOverdue) {
            notifType = 'OVERDUE';
            notifTitle = `🚨 Mục công việc đã quá hạn: ${itemContent}`;
            notifMessage = `Mục "${itemContent}" (thuộc thẻ "${cardTitle}") trong bảng "${boardTitle}" đã quá hạn vào lúc ${formattedDueDate}||/boards/${boardId}?cardId=${card.id}&itemId=${item.id}`;
            deduplicateFromDate = dueDate.toISOString();
          } else if (isWithin24h) {
            notifType = 'DUE_SOON';
            notifTitle = `⏰ Mục công việc sắp đến hạn: ${itemContent}`;
            notifMessage = `Mục "${itemContent}" (thuộc thẻ "${cardTitle}") trong bảng "${boardTitle}" sẽ hết hạn vào lúc ${formattedDueDate}||/boards/${boardId}?cardId=${card.id}&itemId=${item.id}`;
            deduplicateFromDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
          }

          if (!notifType || !deduplicateFromDate) continue;

          for (const uId of Array.from(recipientUserIds)) {
            if (targetUserId && uId !== targetUserId) continue;

            // Chống trùng lặp theo itemId
            const { data: existingNotif } = await this.supabase
              .from('notifications')
              .select('id')
              .eq('user_id', uId)
              .eq('type', notifType)
              .ilike('message', `%itemId=${item.id}%`)
              .gte('created_at', deduplicateFromDate)
              .limit(1);

            if (existingNotif && existingNotif.length > 0) {
              continue;
            }

            const { data: createdNotif } = await this.supabase
              .from('notifications')
              .insert({
                user_id: uId,
                title: notifTitle,
                message: notifMessage,
                type: notifType,
                is_read: false,
              })
              .select('id, user_id, title, message, type, is_read, created_at')
              .single();

            if (createdNotif) {
              this.supabase.emitUserEvent(uId, 'NOTIFICATION_RECEIVED', {
                notification: createdNotif,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi quét thông báo hạn chót thẻ & mục công việc:', err);
    }
  }
}
