import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'Vai trò mới của thành viên trong Workspace',
    enum: ['ADMIN', 'MEMBER'],
    example: 'ADMIN',
  })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsEnum(['ADMIN', 'MEMBER'], {
    message: 'Vai trò chỉ có thể là ADMIN hoặc MEMBER',
  })
  role: 'ADMIN' | 'MEMBER';
}
