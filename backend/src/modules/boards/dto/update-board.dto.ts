import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBoardDto {
  @ApiPropertyOptional({ example: 'Sprint 1 - Nâng cấp', description: 'Tên Board mới' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Mô tả cập nhật', description: 'Mô tả Board mới' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Đánh dấu yêu thích' })
  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @ApiPropertyOptional({
    description: 'Quyền hiển thị của Board',
    enum: ['WORKSPACE', 'PRIVATE', 'PUBLIC'],
  })
  @IsOptional()
  @IsEnum(['WORKSPACE', 'PRIVATE', 'PUBLIC'], {
    message: 'visibility phải là WORKSPACE, PRIVATE hoặc PUBLIC',
  })
  visibility?: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC';

  @ApiPropertyOptional({ example: false, description: 'Trạng thái lưu trữ của Board' })
  @IsOptional()
  @IsBoolean()
  is_archived?: boolean;

  @ApiPropertyOptional({ example: '#2b1572', description: 'Màu nền hoặc gradient' })
  @IsOptional()
  @IsString()
  background?: string;
}
