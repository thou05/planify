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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateBoardFromTemplateDto } from './dto/create-board-from-template.dto';
import { CreateTemplateFromBoardDto } from './dto/create-template-from-board.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách các mẫu Template (hỗ trợ lọc category, tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Danh sách templates' })
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.templatesService.findAll({ category, search, authorId });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Xem chi tiết một Template kèm cấu trúc Kanban preview' })
  @ApiResponse({ status: 200, description: 'Chi tiết template' })
  async findById(@Param('id') id: string) {
    return this.templatesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo Template mới từ đầu (UC-TPL-001)' })
  @ApiResponse({ status: 201, description: 'Tạo template thành công' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.create(userId, dto);
  }

  @Post('from-board/:boardId')
  @ApiOperation({ summary: 'Lưu một Board hiện tại thành Template tái sử dụng (UC-TPL-001)' })
  @ApiResponse({ status: 201, description: 'Lưu template thành công' })
  async createFromBoard(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTemplateFromBoardDto,
  ) {
    return this.templatesService.createFromBoard(boardId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật Template (UC-TPL-002)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa Template (UC-TPL-003)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.templatesService.delete(id, userId);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Khởi tạo Board mới từ Template vào Workspace (UC-TPL-004)' })
  @ApiResponse({ status: 201, description: 'Khởi tạo Board thành công' })
  async createBoardFromTemplate(
    @Param('id') templateId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBoardFromTemplateDto,
  ) {
    return this.templatesService.createBoardFromTemplate(templateId, userId, dto);
  }
}
