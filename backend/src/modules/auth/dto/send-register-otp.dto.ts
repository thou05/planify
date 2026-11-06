import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendRegisterOtpDto {
  @ApiProperty({
    description: 'Email đăng ký nhận mã xác thực OTP',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiPropertyOptional({
    description: 'Tên người dùng dự kiến đăng ký',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

