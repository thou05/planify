import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateBoardMemberRoleDto {
  @ApiProperty({
    description: 'Vai trò mới trong Board (ADMIN, EDITOR, VIEWER)',
    enum: ['ADMIN', 'EDITOR', 'VIEWER'],
    example: 'EDITOR',
  })
  @IsNotEmpty({ message: 'role không được để trống' })
  @IsEnum(['ADMIN', 'EDITOR', 'VIEWER'], {
    message: 'Vai trò chỉ có thể là ADMIN, EDITOR hoặc VIEWER',
  })
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}
