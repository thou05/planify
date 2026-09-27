import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class InviteBoardMemberDto {
  @ApiProperty({ example: 'colleague@example.com', description: 'Email của người được mời' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email: string;

  @ApiPropertyOptional({
    enum: ['ADMIN', 'EDITOR', 'VIEWER'],
    default: 'EDITOR',
    description: 'Vai trò trong Board (ADMIN | EDITOR | VIEWER)',
  })
  @IsOptional()
  @IsIn(['ADMIN', 'EDITOR', 'VIEWER'], {
    message: 'Vai trò phải là ADMIN, EDITOR hoặc VIEWER',
  })
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
}
