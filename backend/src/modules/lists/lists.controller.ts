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
import { ReorderListsDto } from './dto/reorder-lists.dto';
import { CopyListDto } from './dto/copy-list.dto';
import { MoveAllCardsDto } from './dto/move-all-cards.dto';
import { SortCardsDto } from './dto/sort-cards.dto';
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

  @Patch('boards/:boardId/lists/reorder')
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự các cột List trong Board' })
  @ApiResponse({ status: 200, description: 'Sắp xếp thành công' })
  async reorder(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderListsDto,
  ) {
    return this.listsService.reorder(boardId, userId, dto);
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

  @Post('lists/:id/copy')
  @ApiOperation({ summary: 'Sao chép cột List và toàn bộ thẻ bên trong' })
  @ApiResponse({ status: 201, description: 'Sao chép List thành công' })
  async copy(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CopyListDto,
  ) {
    return this.listsService.copy(id, userId, dto);
  }

  @Post('lists/:id/move-all-cards')
  @ApiOperation({ summary: 'Chuyển toàn bộ thẻ từ cột này sang cột khác' })
  @ApiResponse({ status: 200, description: 'Chuyển thẻ thành công' })
  async moveAllCards(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: MoveAllCardsDto,
  ) {
    return this.listsService.moveAllCards(id, userId, dto);
  }

  @Post('lists/:id/sort-cards')
  @ApiOperation({ summary: 'Sắp xếp lại các thẻ trong cột theo tiêu chí' })
  @ApiResponse({ status: 200, description: 'Sắp xếp thẻ thành công' })
  async sortCards(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SortCardsDto,
  ) {
    return this.listsService.sortCards(id, userId, dto);
  }
}
