import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';

@ApiTags('Activities')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('activities/me')
  @ApiOperation({ summary: 'Lấy dòng hoạt động của bản thân người dùng hiện tại' })
  async getMyActivities(@CurrentUser('id') userId: string) {
    return this.activitiesService.getMyActivities(userId);
  }

  @Get('cards/:cardId/activities')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động của một Thẻ' })
  async getCardActivities(@Param('cardId') cardId: string) {
    return this.activitiesService.getCardActivities(cardId);
  }

  @Get('boards/:boardId/activities')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động của một Bảng (bao gồm Bảng và toàn bộ Thẻ)' })
  async getBoardActivities(@Param('boardId') boardId: string) {
    return this.activitiesService.getBoardActivities(boardId);
  }

  @Get('workspaces/:workspaceId/activities')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử hoạt động trong một Không gian làm việc' })
  async getWorkspaceActivities(@Param('workspaceId') workspaceId: string) {
    return this.activitiesService.getWorkspaceActivities(workspaceId);
  }
}
