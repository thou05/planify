import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { SetCustomFieldValueDto } from './dto/set-custom-field-value.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Custom Fields')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get('boards/:boardId/custom-fields')
  @ApiOperation({ summary: 'Lấy danh sách các trường tùy chỉnh trong bảng' })
  @ApiResponse({ status: 200, description: 'Danh sách các trường tùy chỉnh' })
  async getBoardCustomFields(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customFieldsService.getBoardCustomFields(boardId, userId);
  }

  @Post('boards/:boardId/custom-fields')
  @ApiOperation({ summary: 'Tạo trường tùy chỉnh mới cho bảng' })
  @ApiResponse({ status: 201, description: 'Tạo trường tùy chỉnh thành công' })
  async createCustomField(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.createCustomField(boardId, userId, dto);
  }

  @Patch('custom-fields/:id')
  @ApiOperation({ summary: 'Cập nhật trường tùy chỉnh (tên, kiểu dữ liệu)' })
  @ApiResponse({ status: 200, description: 'Cập nhật trường tùy chỉnh thành công' })
  async updateCustomField(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.customFieldsService.updateCustomField(id, userId, dto);
  }

  @Delete('custom-fields/:id')
  @ApiOperation({ summary: 'Xóa trường tùy chỉnh khỏi bảng' })
  @ApiResponse({ status: 200, description: 'Xóa trường tùy chỉnh thành công' })
  async deleteCustomField(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customFieldsService.deleteCustomField(id, userId);
  }

  @Get('cards/:cardId/custom-field-values')
  @ApiOperation({ summary: 'Lấy các giá trị trường tùy chỉnh của một thẻ' })
  @ApiResponse({ status: 200, description: 'Danh sách giá trị trường tùy chỉnh của thẻ' })
  async getCardCustomFieldValues(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customFieldsService.getCardCustomFieldValues(cardId, userId);
  }

  @Put('cards/:cardId/custom-field-values/:fieldId')
  @ApiOperation({ summary: 'Thiết lập hoặc cập nhật giá trị trường tùy chỉnh cho thẻ' })
  @ApiResponse({ status: 200, description: 'Lưu giá trị thành công' })
  async setCardCustomFieldValue(
    @Param('cardId') cardId: string,
    @Param('fieldId') fieldId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SetCustomFieldValueDto,
  ) {
    return this.customFieldsService.setCardCustomFieldValue(cardId, fieldId, userId, dto);
  }

  @Delete('cards/:cardId/custom-field-values/:fieldId')
  @ApiOperation({ summary: 'Xóa giá trị trường tùy chỉnh khỏi thẻ' })
  @ApiResponse({ status: 200, description: 'Xóa giá trị thành công' })
  async deleteCardCustomFieldValue(
    @Param('cardId') cardId: string,
    @Param('fieldId') fieldId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customFieldsService.deleteCardCustomFieldValue(cardId, fieldId, userId);
  }
}
