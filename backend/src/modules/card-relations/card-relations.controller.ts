import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CardRelationsService } from './card-relations.service';
import { CreateCardRelationDto } from './dto/create-card-relation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Card Relations')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardRelationsController {
  constructor(private readonly cardRelationsService: CardRelationsService) {}

  @Get('cards/:cardId/relations')
  @ApiOperation({ summary: 'Lấy danh sách quan hệ của thẻ' })
  @ApiResponse({ status: 200, description: 'Danh sách quan hệ thẻ' })
  async getCardRelations(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cardRelationsService.getCardRelations(cardId, userId);
  }

  @Get('cards/:cardId/relations/search-candidates')
  @ApiOperation({ summary: 'Tìm kiếm các thẻ ứng viên để tạo liên kết trong cùng workspace/board' })
  @ApiQuery({ name: 'q', required: false, description: 'Từ khóa tìm kiếm tiêu đề thẻ' })
  @ApiResponse({ status: 200, description: 'Danh sách thẻ ứng viên' })
  async searchCandidateCards(
    @Param('cardId') cardId: string,
    @Query('q') query: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cardRelationsService.searchCandidateCards(cardId, query, userId);
  }

  @Post('cards/:cardId/relations')
  @ApiOperation({ summary: 'Tạo mối quan hệ mới giữa 2 thẻ (kèm kiểm tra chu trình phụ thuộc)' })
  @ApiResponse({ status: 201, description: 'Tạo quan hệ thành công' })
  async createCardRelation(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCardRelationDto,
  ) {
    return this.cardRelationsService.createCardRelation(cardId, userId, dto);
  }

  @Delete('cards/:cardId/relations/:relationId')
  @ApiOperation({ summary: 'Gỡ bỏ một mối quan hệ thẻ' })
  @ApiResponse({ status: 200, description: 'Gỡ bỏ quan hệ thành công' })
  async deleteCardRelation(
    @Param('cardId') cardId: string,
    @Param('relationId') relationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cardRelationsService.deleteCardRelation(cardId, relationId, userId);
  }
}
