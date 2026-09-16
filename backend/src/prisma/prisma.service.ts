import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Kết nối cơ sở dữ liệu PostgreSQL thành công');
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Cảnh báo kết nối Database: ${error.message}. Vui lòng kiểm tra DATABASE_URL trong file .env và đảm bảo database tồn tại.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
