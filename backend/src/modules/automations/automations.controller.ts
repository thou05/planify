import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { RunAutomationDto } from './dto/run-automation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Automations')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get('automations/templates')
  @ApiOperation({ summary: 'Lấy danh sách các mẫu Automation có sẵn' })
  @ApiResponse({ status: 200, description: 'Danh sách mẫu tự động hóa' })
  getTemplates() {
    return this.automationsService.getTemplates();
  }

  @Get('boards/:boardId/automations')
  @ApiOperation({ summary: 'Lấy danh sách các quy tắc tự động hóa của bảng' })
  @ApiResponse({ status: 200, description: 'Danh sách các quy tắc tự động hóa' })
  async getBoardAutomations(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
  ) {
    return this.automationsService.findAllByBoard(boardId, userId, type);
  }

  @Post('boards/:boardId/automations')
  @ApiOperation({ summary: 'Tạo quy tắc / nút tự động hóa mới cho bảng' })
  @ApiResponse({ status: 201, description: 'Tạo tự động hóa thành công' })
  async createAutomation(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationsService.create(boardId, userId, dto);
  }

  @Get('boards/:boardId/automations/logs')
  @ApiOperation({ summary: 'Lấy lịch sử thực thi các quy tắc tự động hóa của bảng' })
  @ApiResponse({ status: 200, description: 'Lịch sử thực thi tự động hóa' })
  async getExecutionLogs(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.automationsService.getExecutionLogs(boardId, userId, limit ? Number(limit) : 50);
  }

  @Get('automations/:id')
  @ApiOperation({ summary: 'Xem chi tiết một quy tắc tự động' })
  @ApiResponse({ status: 200, description: 'Chi tiết quy tắc' })
  async getAutomation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.findById(id, userId);
  }

  @Patch('automations/:id')
  @ApiOperation({ summary: 'Cập nhật quy tắc tự động hóa' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateAutomation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(id, userId, dto);
  }

  @Delete('automations/:id')
  @ApiOperation({ summary: 'Xóa quy tắc tự động hóa' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteAutomation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.delete(id, userId);
  }

  @Patch('automations/:id/toggle')
  @ApiOperation({ summary: 'Bật / Tắt trạng thái quy tắc tự động hóa' })
  @ApiResponse({ status: 200, description: 'Đổi trạng thái thành công' })
  async toggleAutomation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.toggle(id, userId);
  }

  @Post('automations/:id/duplicate')
  @ApiOperation({ summary: 'Nhân bản một quy tắc tự động hóa' })
  @ApiResponse({ status: 201, description: 'Nhân bản thành công' })
  async duplicateAutomation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.duplicate(id, userId);
  }

  @Post('automations/:id/run')
  @ApiOperation({ summary: 'Thực thi ngay quy tắc tự động hóa (Run now / Bấm nút)' })
  @ApiResponse({ status: 200, description: 'Thực thi thành công' })
  async runAutomation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RunAutomationDto,
  ) {
    return this.automationsService.executeAutomation(id, userId, dto?.cardId);
  }
}
