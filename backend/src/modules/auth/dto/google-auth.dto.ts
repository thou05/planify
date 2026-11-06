import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google ID token credential (JWT) nhận được từ Google OAuth SDK',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Google credential không được để trống' })
  credential: string;

  @ApiPropertyOptional({
    description: 'Email người dùng nhận từ Google (tùy chọn)',
    example: 'user@gmail.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Họ và tên người dùng từ Google (tùy chọn)',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Ảnh đại diện người dùng từ Google (tùy chọn)',
    example: 'https://lh3.googleusercontent.com/a/...',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}

