import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ReorderListsDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Danh sách ID các cột theo thứ tự mới',
  })
  @IsArray()
  @IsString({ each: true })
  listIds: string[];
}
