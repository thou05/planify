import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { CopyCardDto } from './dto/copy-card.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cards')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('lists/:listId/cards')
  @ApiOperation({ summary: 'Tạo thẻ (Card) mới trong danh sách' })
  @ApiResponse({ status: 201, description: 'Tạo thẻ thành công' })
  async create(
    @Param('listId') listId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.cardsService.create(listId, userId, dto);
  }

  @Get('cards/:id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của thẻ' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cardsService.findById(id, userId);
  }

  @Patch('cards/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin thẻ (tiêu đề, mô tả, ngày hết hạn, v.v.)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.update(id, userId, dto);
  }

  @Delete('cards/:id')
  @ApiOperation({ summary: 'Xóa thẻ' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cardsService.delete(id, userId);
  }

  @Patch('cards/:id/move')
  @ApiOperation({ summary: 'Di chuyển thẻ sang vị trí mới hoặc danh sách mới' })
  @ApiResponse({ status: 200, description: 'Di chuyển thẻ thành công' })
  async move(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: MoveCardDto,
  ) {
    return this.cardsService.move(id, userId, dto);
  }

  @Post('cards/:id/copy')
  @ApiOperation({ summary: 'Sao chép thẻ sang danh sách đích' })
  @ApiResponse({ status: 201, description: 'Sao chép thẻ thành công' })
  async copy(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CopyCardDto,
  ) {
    return this.cardsService.copy(id, userId, dto);
  }

  @Post('cards/:id/assignees/toggle')
  @ApiOperation({ summary: 'Bật/tắt gán thành viên vào thẻ' })
  @ApiResponse({ status: 200, description: 'Thao tác gán thành viên thành công' })
  async toggleAssignMember(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AssignMemberDto,
  ) {
    const targetId = dto.user_id || dto.board_member_id;
    if (!targetId) {
      throw new BadRequestException('Vui lòng cung cấp user_id hoặc board_member_id');
    }
    return this.cardsService.toggleAssignMember(id, userId, targetId);
  }
}
