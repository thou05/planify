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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Comments')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('cards/:cardId/comments')
  @ApiOperation({ summary: 'Lấy danh sách bình luận của thẻ' })
  @ApiResponse({ status: 200, description: 'Danh sách bình luận' })
  async getCardComments(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commentsService.getCardComments(cardId, userId);
  }

  @Post('cards/:cardId/comments')
  @ApiOperation({ summary: 'Thêm bình luận mới vào thẻ (hỗ trợ @mention)' })
  @ApiResponse({ status: 201, description: 'Tạo bình luận thành công' })
  async createComment(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(cardId, userId, dto);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Chỉnh sửa bình luận' })
  @ApiResponse({ status: 200, description: 'Cập nhật bình luận thành công' })
  async updateComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(id, userId, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Xóa bình luận' })
  @ApiResponse({ status: 200, description: 'Xóa bình luận thành công' })
  async deleteComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commentsService.deleteComment(id, userId);
  }
}
