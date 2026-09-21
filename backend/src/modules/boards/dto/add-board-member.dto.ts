import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddBoardMemberDto {
  @ApiProperty({
    description: 'ID người dùng trong Workspace được thêm vào Board',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsNotEmpty({ message: 'userId không được để trống' })
  @IsUUID('4', { message: 'userId phải là UUID hợp lệ' })
  userId: string;

  @ApiPropertyOptional({
    description: 'Vai trò trong Board (ADMIN, EDITOR, VIEWER)',
    enum: ['ADMIN', 'EDITOR', 'VIEWER'],
    default: 'EDITOR',
  })
  @IsOptional()
  @IsEnum(['ADMIN', 'EDITOR', 'VIEWER'], {
    message: 'Vai trò chỉ có thể là ADMIN, EDITOR hoặc VIEWER',
  })
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
}
