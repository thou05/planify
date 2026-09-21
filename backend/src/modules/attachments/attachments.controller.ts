import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { CreateLinkAttachmentDto } from './dto/create-link-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('cards/:cardId/attachments')
  async findByCardId(@Param('cardId') cardId: string) {
    return this.attachmentsService.findByCardId(cardId);
  }

  @Post('cards/:cardId/attachments/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.attachmentsService.uploadFile(cardId, file);
  }

  @Post('cards/:cardId/attachments/link')
  async createLink(
    @Param('cardId') cardId: string,
    @Body() dto: CreateLinkAttachmentDto,
  ) {
    return this.attachmentsService.createLink(cardId, dto);
  }

  @Patch('attachments/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAttachmentDto,
  ) {
    return this.attachmentsService.update(id, dto);
  }

  @Delete('attachments/:id')
  async delete(@Param('id') id: string) {
    return this.attachmentsService.delete(id);
  }
}
