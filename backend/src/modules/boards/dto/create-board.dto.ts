import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ example: 'Sprint 1 - Ra mắt MVP', description: 'Tên Board' })
  @IsString()
  @IsNotEmpty({ message: 'Tên Board không được để trống' })
  @MaxLength(150, { message: 'Tên Board không quá 150 ký tự' })
  name: string;

  @ApiPropertyOptional({ example: 'Kế hoạch công việc Sprint 1', description: 'Mô tả Board' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Đánh dấu yêu thích' })
  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @ApiPropertyOptional({
    description: 'Quyền hiển thị của Board',
    enum: ['WORKSPACE', 'PRIVATE', 'PUBLIC'],
    default: 'WORKSPACE',
  })
  @IsOptional()
  @IsEnum(['WORKSPACE', 'PRIVATE', 'PUBLIC'], {
    message: 'visibility phải là WORKSPACE, PRIVATE hoặc PUBLIC',
  })
  visibility?: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC';

  @ApiPropertyOptional({
    description: 'Tự động tạo 3 danh sách mặc định: "To Do", "In Progress", "Done"',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  create_default_lists?: boolean;

  @ApiPropertyOptional({ example: '#2b1572', description: 'Màu nền, gradient hoặc URL ảnh nền' })
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ example: '🚀', description: 'Biểu tượng Emoji hoặc icon URL của Board (dùng làm Favicon)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;
}

