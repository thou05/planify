import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

export class CreateTemplateFromBoardDto {
  @ApiProperty({ example: 'Quy trình phát triển Sprint', description: 'Tên của Mẫu Template mới' })
  @IsNotEmpty({ message: 'Tên mẫu không được để trống' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết cách sử dụng mẫu này' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'productivity', description: 'Danh mục mẫu' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: true, description: 'Chia sẻ công khai trong Thư viện Mẫu' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
