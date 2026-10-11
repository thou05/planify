import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class SetCustomFieldValueDto {
  @ApiProperty({
    description: 'Giá trị trường tùy chỉnh cho thẻ',
    example: '5',
  })
  @Allow()
  value: any;
}
