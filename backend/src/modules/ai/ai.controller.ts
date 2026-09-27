import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { BreakdownTaskDto } from './dto/breakdown-task.dto';
import { ApplyBreakdownDto } from './dto/apply-breakdown.dto';
import { BoardChatDto } from './dto/board-chat.dto';

@ApiTags('AI (Artificial Intelligence)')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('cards/:cardId/breakdown')
  @ApiOperation({ summary: 'Dùng AI phân rã công việc trong thẻ thành các checklist items' })
  @ApiResponse({ status: 200, description: 'Phân rã thành công, trả về danh sách gợi ý' })
  async breakdownTask(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BreakdownTaskDto,
  ) {
    return this.aiService.breakdownTask(cardId, userId, dto);
  }

  @Post('cards/:cardId/apply-breakdown')
  @ApiOperation({ summary: 'Lưu kết quả phân rã AI vào Checklist của thẻ' })
  @ApiResponse({ status: 201, description: 'Lưu checklist thành công' })
  async applyBreakdown(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyBreakdownDto,
  ) {
    return this.aiService.applyBreakdown(cardId, userId, dto);
  }

  @Post('boards/:boardId/daily-standup')
  @ApiOperation({ summary: 'Dùng AI tổng hợp dữ liệu Bảng Kanban và tạo báo cáo Daily Standup' })
  @ApiResponse({ status: 200, description: 'Tạo báo cáo Daily Standup thành công' })
  async generateDailyStandup(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.generateDailyStandup(boardId, userId);
  }

  @Post('boards/:boardId/risk-scan')
  @ApiOperation({ summary: 'Dùng AI quét điểm nghẽn, rủi ro quá hạn và phân bổ công việc trên Bảng' })
  @ApiResponse({ status: 200, description: 'Quét rủi ro thành công, trả về điểm số và đề xuất' })
  async scanBoardRisks(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.scanBoardRisks(boardId, userId);
  }

  @Post('boards/:boardId/chat')
  @ApiOperation({ summary: 'Hỏi đáp AI Copilot dựa trên dữ liệu thời gian thực của Bảng' })
  @ApiResponse({ status: 200, description: 'Trả lời câu hỏi với ngữ cảnh của Bảng' })
  async chatWithBoardCopilot(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BoardChatDto,
  ) {
    return this.aiService.chatWithBoardCopilot(boardId, userId, dto);
  }
}

