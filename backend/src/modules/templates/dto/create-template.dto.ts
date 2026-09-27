import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ example: 'My Tasks | Quản lý công việc cá nhân', description: 'Tên mẫu Template' })
  @IsNotEmpty({ message: 'Tên mẫu không được để trống' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Mô tả chi tiết về cách áp dụng mẫu', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'productivity', description: 'Danh mục mẫu' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)', description: 'Phông nền / màu' })
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ description: 'Cấu trúc lists, cards, checklists của mẫu' })
  @IsOptional()
  structure?: any;

  @ApiPropertyOptional({ default: true, description: 'Công khai cho mọi người sử dụng' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
