import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CardRelationType {
  BLOCKS = 'BLOCKS',
  BLOCKED_BY = 'BLOCKED_BY',
  PARENT = 'PARENT',
  SUBTASK = 'SUBTASK',
  RELATES_TO = 'RELATES_TO',
  DUPLICATE = 'DUPLICATE',
}

export class CreateCardRelationDto {
  @ApiProperty({ description: 'ID của thẻ liên kết (mục tiêu)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4', { message: 'relatedCardId phải là định dạng UUID hợp lệ' })
  @IsNotEmpty({ message: 'relatedCardId không được để trống' })
  relatedCardId: string;

  @ApiProperty({
    description: 'Loại quan hệ giữa 2 thẻ',
    enum: CardRelationType,
    example: CardRelationType.BLOCKS,
  })
  @IsEnum(CardRelationType, {
    message: 'type phải là một trong các giá trị: BLOCKS, BLOCKED_BY, PARENT, SUBTASK, RELATES_TO, DUPLICATE',
  })
  @IsNotEmpty({ message: 'type không được để trống' })
  type: CardRelationType;
}
