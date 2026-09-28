import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics & Statistics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('boards/:boardId')
  @ApiOperation({ summary: 'Lấy dữ liệu thống kê tổng thể của Bảng (Cards, Lists, Workload, Due Dates, Labels)' })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu thống kê thành công' })
  async getBoardAnalytics(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.analyticsService.getBoardAnalytics(boardId, userId);
  }

  @Post('boards/:boardId/ai-insights')
  @ApiOperation({ summary: 'Tạo nhận xét & phân tích rủi ro thông minh bằng AI dựa trên số liệu thống kê của Bảng' })
  @ApiResponse({ status: 200, description: 'Phân tích AI thành công' })
  async getBoardAiInsights(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.analyticsService.getBoardAiInsights(boardId, userId);
  }
}
