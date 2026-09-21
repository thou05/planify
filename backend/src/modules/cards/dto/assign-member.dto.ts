import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignMemberDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'ID thành viên Board (board_member_id)',
  })
  @IsUUID('4', { message: 'board_member_id phải là định dạng UUID hợp lệ' })
  @IsNotEmpty({ message: 'board_member_id không được để trống' })
  board_member_id: string;
}
