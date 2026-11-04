import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class AssignMemberDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'ID thành viên Board hoặc ID người dùng',
  })
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'board_member_id phải là định dạng UUID hợp lệ' })
  board_member_id?: string;

  @ApiPropertyOptional({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'ID người dùng (user_id)',
  })
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'user_id phải là định dạng UUID hợp lệ' })
  user_id?: string;

  @ApiPropertyOptional({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'ID thành viên hoặc người dùng (memberId alias theo spec)',
  })
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'memberId phải là định dạng UUID hợp lệ' })
  memberId?: string;
}
