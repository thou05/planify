import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ImportExportService } from './import-export.service';
import { ValidateImportDto, ImportBoardDto, ImportIntoBoardDto } from './dto/import-board.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Import & Export')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Get('boards/:boardId/export')
  @ApiOperation({ summary: 'Xuất dữ liệu Board ra định dạng JSON hoặc Excel (.xlsx)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'xlsx'] })
  @ApiQuery({ name: 'includeCards', required: false, type: Boolean })
  @ApiQuery({ name: 'includeLabels', required: false, type: Boolean })
  @ApiQuery({ name: 'includeChecklists', required: false, type: Boolean })
  @ApiQuery({ name: 'includeMembers', required: false, type: Boolean })
  async exportBoard(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Query('format') format: 'json' | 'xlsx' = 'json',
    @Query('includeCards') includeCards?: string,
    @Query('includeLabels') includeLabels?: string,
    @Query('includeChecklists') includeChecklists?: string,
    @Query('includeMembers') includeMembers?: string,
    @Res() res?: Response,
  ) {
    const options = {
      includeCards: includeCards !== 'false',
      includeLabels: includeLabels !== 'false',
      includeChecklists: includeChecklists !== 'false',
      includeMembers: includeMembers !== 'false',
    };

    const result = await this.importExportService.exportBoard(
      boardId,
      userId,
      format === 'xlsx' ? 'excel' : 'json',
      options,
    );

    if (res) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.filename)}"`,
      );
      return res.status(HttpStatus.OK).send(result.buffer);
    }
    return result.buffer;
  }

  @Post('workspaces/:workspaceId/validate-import')
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ và xem trước dữ liệu nhập (Preview & Validate)' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra & tóm tắt dữ liệu' })
  async validateImport(
    @Param('workspaceId') _workspaceId: string,
    @Body() dto: ValidateImportDto,
  ) {
    return this.importExportService.validateImportData(dto.rawData);
  }

  @Post('workspaces/:workspaceId/import-board')
  @ApiOperation({ summary: 'Nhập tạo Board mới từ dữ liệu JSON / Excel' })
  @ApiResponse({ status: 201, description: 'Tạo Board mới từ dữ liệu nhập thành công' })
  async importNewBoard(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ImportBoardDto,
  ) {
    return this.importExportService.importNewBoard(workspaceId, userId, dto);
  }

  @Post('boards/:boardId/import-data')
  @ApiOperation({ summary: 'Nhập dữ liệu vào Board hiện có (Existing Board)' })
  @ApiResponse({ status: 200, description: 'Nhập dữ liệu vào Board thành công' })
  async importIntoExistingBoard(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ImportIntoBoardDto,
  ) {
    return this.importExportService.importIntoExistingBoard(boardId, userId, dto);
  }
}
