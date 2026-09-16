import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: 'member@example.com', description: 'Email của người dùng muốn thêm vào Workspace' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiPropertyOptional({ example: 'MEMBER', enum: ['ADMIN', 'MEMBER'], description: 'Vai trò trong Workspace' })
  @IsOptional()
  @IsIn(['ADMIN', 'MEMBER'], { message: 'Vai trò phải là ADMIN hoặc MEMBER' })
  role?: string;
}
