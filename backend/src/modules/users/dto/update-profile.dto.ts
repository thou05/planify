import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn B', description: 'Tên người dùng mới' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'URL ảnh đại diện' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Lập trình viên đam mê công nghệ', description: 'Tiểu sử / Bio' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh', description: 'Múi giờ' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'vi', description: 'Ngôn ngữ giao diện' })
  @IsOptional()
  @IsString()
  @IsIn(['vi', 'en'])
  language?: string;

  @ApiPropertyOptional({ example: '+84 987 654 321', description: 'Số điện thoại liên hệ' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'system', description: 'Chủ đề giao diện (system, light, dark)' })
  @IsOptional()
  @IsString()
  @IsIn(['system', 'light', 'dark'])
  theme?: string;
}
