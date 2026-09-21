import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ToggleCardLabelDto {
  @ApiProperty({ description: 'ID của nhãn (Label ID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4', { message: 'ID nhãn không hợp lệ' })
  @IsNotEmpty({ message: 'ID nhãn không được để trống' })
  label_id: string;
}
