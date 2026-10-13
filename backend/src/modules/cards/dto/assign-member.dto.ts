import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignMemberDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'ID thành viên Board hoặc ID người dùng',
  })
  @IsOptional()
  @IsUUID('4', { message: 'board_member_id phải là định dạng UUID hợp lệ' })
  board_member_id?: string;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'ID người dùng (user_id)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'user_id phải là định dạng UUID hợp lệ' })
  user_id?: string;
}
