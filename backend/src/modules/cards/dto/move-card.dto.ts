import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class MoveCardDto {
  @ApiProperty({
    example: 'uuid-target-list',
    description: 'ID danh sách đích (có thể cùng danh sách hiện tại)',
  })
  @IsUUID('4', { message: 'ID danh sách không hợp lệ' })
  @IsNotEmpty({ message: 'targetListId không được để trống' })
  targetListId: string;

  @ApiProperty({ example: 0, description: 'Vị trí mới trong danh sách đích' })
  @IsInt()
  @Min(0)
  position: number;
}
