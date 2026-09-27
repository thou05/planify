import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'My Tasks Updated', description: 'Tên mẫu Template' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Danh mục mẫu' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Phông nền / màu' })
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ description: 'Cấu trúc lists, cards, checklists của mẫu' })
  @IsOptional()
  structure?: any;

  @ApiPropertyOptional({ description: 'Công khai cho mọi người sử dụng' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
