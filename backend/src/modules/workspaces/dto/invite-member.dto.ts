import { IsEmail, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email của người được mời',
    example: 'member@planify.io',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({
    description: 'Vai trò dự kiến',
    enum: ['ADMIN', 'MEMBER'],
    default: 'MEMBER',
    required: false,
  })
  @IsOptional()
  @IsEnum(['ADMIN', 'MEMBER'], {
    message: 'Vai trò chỉ có thể là ADMIN hoặc MEMBER',
  })
  role?: 'ADMIN' | 'MEMBER' = 'MEMBER';

  @ApiProperty({
    description: 'Tương thích ngược (không còn tự động thêm trực tiếp)',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  directAdd?: boolean = false;
}
