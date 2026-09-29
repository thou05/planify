import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async getMyActivities(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.activitiesService.getMyActivities(userId, limit, page);
  }

  @Get('cards/:cardId/activities')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động của một Thẻ' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async getCardActivities(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.activitiesService.getCardActivities(cardId, userId, limit, page);
  }

  @Get('boards/:boardId/activities')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động của một Bảng (bao gồm Bảng và toàn bộ Thẻ)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async getBoardActivities(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.activitiesService.getBoardActivities(boardId, userId, limit, page);
  }

  @Get('workspaces/:workspaceId/activities')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử hoạt động trong một Không gian làm việc' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async getWorkspaceActivities(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.activitiesService.getWorkspaceActivities(workspaceId, userId, limit, page);
  }
}
