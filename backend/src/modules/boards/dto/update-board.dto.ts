import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
