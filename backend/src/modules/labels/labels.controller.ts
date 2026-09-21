import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { ToggleCardLabelDto } from './dto/toggle-card-label.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Labels')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get('boards/:boardId/labels')
  @ApiOperation({ summary: 'Lấy danh sách các nhãn trong bảng' })
  @ApiResponse({ status: 200, description: 'Danh sách nhãn' })
  async getBoardLabels(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.labelsService.getBoardLabels(boardId, userId);
  }

  @Post('boards/:boardId/labels')
  @ApiOperation({ summary: 'Tạo nhãn mới cho bảng' })
  @ApiResponse({ status: 201, description: 'Tạo nhãn thành công' })
  async createLabel(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLabelDto,
  ) {
    return this.labelsService.createLabel(boardId, userId, dto);
  }

  @Patch('labels/:id')
  @ApiOperation({ summary: 'Cập nhật nhãn (tên, màu sắc)' })
  @ApiResponse({ status: 200, description: 'Cập nhật nhãn thành công' })
  async updateLabel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.updateLabel(id, userId, dto);
  }

  @Delete('labels/:id')
  @ApiOperation({ summary: 'Xóa nhãn khỏi bảng' })
  @ApiResponse({ status: 200, description: 'Xóa nhãn thành công' })
  async deleteLabel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.labelsService.deleteLabel(id, userId);
  }

  @Post('cards/:cardId/labels/toggle')
  @ApiOperation({ summary: 'Gán hoặc bỏ nhãn khỏi thẻ (Toggle)' })
  @ApiResponse({ status: 200, description: 'Thao tác nhãn thành công' })
  async toggleCardLabel(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleCardLabelDto,
  ) {
    return this.labelsService.toggleCardLabel(cardId, userId, dto.label_id);
  }
}
