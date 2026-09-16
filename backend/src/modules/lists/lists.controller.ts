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
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Lists')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post('boards/:boardId/lists')
  @ApiOperation({ summary: 'Tạo cột List mới trong Board' })
  @ApiResponse({ status: 201, description: 'Tạo List thành công' })
  async create(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.create(boardId, userId, dto);
  }

  @Patch('lists/:id')
  @ApiOperation({ summary: 'Cập nhật cột List (tiêu đề, WIP limit, vị trí)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.update(id, userId, dto);
  }

  @Delete('lists/:id')
  @ApiOperation({ summary: 'Xóa cột List' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listsService.delete(id, userId);
  }
}
