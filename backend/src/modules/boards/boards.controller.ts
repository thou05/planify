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
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Boards')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post('workspaces/:workspaceId/boards')
  @ApiOperation({ summary: 'Tạo Board mới trong Workspace' })
  @ApiResponse({ status: 201, description: 'Tạo Board thành công' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardsService.create(workspaceId, userId, dto);
  }

  @Get('workspaces/:workspaceId/boards')
  @ApiOperation({ summary: 'Lấy danh sách Boards trong Workspace' })
  @ApiResponse({ status: 200, description: 'Danh sách Boards' })
  async findAllInWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.findAllInWorkspace(workspaceId, userId);
  }

  @Get('boards/:id')
  @ApiOperation({ summary: 'Chi tiết Board kèm Lists và Cards' })
  @ApiResponse({ status: 200, description: 'Chi tiết Board' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.findById(id, userId);
  }

  @Patch('boards/:id')
  @ApiOperation({ summary: 'Cập nhật Board' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(id, userId, dto);
  }

  @Delete('boards/:id')
  @ApiOperation({ summary: 'Xóa Board' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.delete(id, userId);
  }
}
