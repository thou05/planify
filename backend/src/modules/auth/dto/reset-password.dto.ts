import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email tài khoản cần đặt lại mật khẩu',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    description: 'Mã xác thực OTP gồm 6 chữ số đã gửi về email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}

