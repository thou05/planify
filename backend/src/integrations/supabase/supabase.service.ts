import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL') ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      '';

    this.supabaseKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      this.logger.warn(
        '⚠️ Chưa tìm thấy NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env!',
      );
    }

    this.clientInstance = createClient(
      this.supabaseUrl || 'https://placeholder.supabase.co',
      this.supabaseKey || 'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          transport: WebSocket as any,
        },
      },
    );
  }

  async onModuleInit() {
    if (this.supabaseUrl && this.supabaseKey && !this.supabaseUrl.includes('placeholder')) {
      try {
        const { error } = await this.clientInstance.from('users').select('id').limit(1);
        if (error) {
          this.logger.warn(`⚠️ Supabase ping: bảng 'users' trả về lỗi: ${error.message}`);
        } else {
          this.logger.log(`✅ Kết nối Supabase thành công! (Dự án: ${this.supabaseUrl})`);
        }
      } catch (err: any) {
        this.logger.warn(`⚠️ Lỗi khi ping Supabase: ${err.message}`);
      }
    }
  }

  private boardChannels = new Map<string, any>();

  get client(): SupabaseClient {
    return this.clientInstance;
  }

  from(table: string) {
    return this.clientInstance.from(table);
  }

  async emitChannelEvent(channelName: string, event: string, payload: any = {}) {
    if (!channelName) return;
    try {
      let ch = this.boardChannels.get(channelName);
      if (!ch) {
        ch = this.clientInstance.channel(channelName);
        ch.subscribe();
        this.boardChannels.set(channelName, ch);
      }

      ch.send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          emittedAt: new Date().toISOString(),
        },
      }).catch((err: any) => {
        this.logger.debug(`Broadcast send error [${channelName}]: ${err?.message}`);
      });
    } catch (err: any) {
      this.logger.warn(`⚠️ Lỗi khi broadcast [${event}] tới [${channelName}]: ${err?.message}`);
    }
  }

  async emitBoardEvent(boardId: string, event: string, payload: any = {}) {
    if (!boardId) return;
    return this.emitChannelEvent(`board:${boardId}`, event, { ...payload, boardId });
  }

  async emitWorkspaceEvent(workspaceId: string, event: string, payload: any = {}) {
    if (!workspaceId) return;
    return this.emitChannelEvent(`workspace:${workspaceId}`, event, { ...payload, workspaceId });
  }

  async emitUserEvent(userId: string, event: string, payload: any = {}) {
    if (!userId) return;
    return this.emitChannelEvent(`user:${userId}`, event, { ...payload, userId });
  }
}
