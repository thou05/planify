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

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg', description: 'URL ảnh bìa hồ sơ cá nhân' })
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiPropertyOptional({ example: 'Senior Fullstack Engineer', description: 'Chức danh / Vị trí công việc' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  job_title?: string;

  @ApiPropertyOptional({ example: 'Platform & Engineering', description: 'Phòng ban / Đội ngũ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'Hà Nội, Việt Nam', description: 'Địa điểm làm việc / sinh sống' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'https://myportfolio.dev', description: 'Website / Portfolio cá nhân' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: { github: 'octocat', linkedin: 'in/user' }, description: 'Liên kết mạng xã hội' })
  @IsOptional()
  social_links?: Record<string, any>;

  @ApiPropertyOptional({ example: 'WORKING', description: 'Trạng thái làm việc (WORKING, BUSY, AWAY)' })
  @IsOptional()
  @IsString()
  work_status?: string;

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
