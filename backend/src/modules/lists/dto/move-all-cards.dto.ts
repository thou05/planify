import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MoveAllCardsDto {
  @ApiProperty({ example: 'uuid-target-list', description: 'ID danh sách đích để chuyển tất cả thẻ tới' })
  @IsUUID('4', { message: 'ID danh sách đích không hợp lệ' })
  @IsNotEmpty({ message: 'Target list ID không được để trống' })
  targetListId: string;
}
