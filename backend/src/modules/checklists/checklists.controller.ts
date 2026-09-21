import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Checklists')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post('cards/:cardId/checklists')
  @ApiOperation({ summary: 'Tạo Checklist mới cho thẻ' })
  @ApiResponse({ status: 201, description: 'Tạo Checklist thành công' })
  async createChecklist(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistsService.createChecklist(cardId, userId, dto);
  }

  @Patch('checklists/:id')
  @ApiOperation({ summary: 'Cập nhật Checklist (đổi tên, vị trí)' })
  @ApiResponse({ status: 200, description: 'Cập nhật Checklist thành công' })
  async updateChecklist(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklistsService.updateChecklist(id, userId, dto);
  }

  @Delete('checklists/:id')
  @ApiOperation({ summary: 'Xóa Checklist' })
  @ApiResponse({ status: 200, description: 'Xóa Checklist thành công' })
  async deleteChecklist(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.checklistsService.deleteChecklist(id, userId);
  }

  @Post('checklists/:checklistId/items')
  @ApiOperation({ summary: 'Thêm mục công việc vào Checklist' })
  @ApiResponse({ status: 201, description: 'Thêm mục công việc thành công' })
  async createItem(
    @Param('checklistId') checklistId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.checklistsService.createItem(checklistId, userId, dto);
  }

  @Patch('checklist-items/:id')
  @ApiOperation({ summary: 'Cập nhật mục công việc (nội dung, trạng thái hoàn thành)' })
  @ApiResponse({ status: 200, description: 'Cập nhật mục công việc thành công' })
  async updateItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateItem(id, userId, dto);
  }

  @Delete('checklist-items/:id')
  @ApiOperation({ summary: 'Xóa mục công việc khỏi Checklist' })
  @ApiResponse({ status: 200, description: 'Xóa mục công việc thành công' })
  async deleteItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.checklistsService.deleteItem(id, userId);
  }
}
