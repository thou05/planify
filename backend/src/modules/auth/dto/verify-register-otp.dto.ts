import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class VerifyRegisterOtpDto {
  @ApiProperty({
    description: 'Họ và tên người dùng',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  name: string;

  @ApiProperty({
    description: 'Email đăng ký',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    description: 'Mật khẩu khởi tạo (tối thiểu 6 ký tự)',
    example: 'Password123!',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Mã xác thực OTP gồm 6 chữ số',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  otp: string;
}

