import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({ description: 'Tên nhãn (Label)', example: 'Backend' })
  @IsString()
  @IsNotEmpty({ message: 'Tên nhãn không được để trống' })
  @MaxLength(50, { message: 'Tên nhãn tối đa 50 ký tự' })
  name: string;

  @ApiProperty({ description: 'Màu nhãn (Hex code)', example: '#10b981' })
  @IsString()
  @IsNotEmpty({ message: 'Mã màu không được để trống' })
  color: string;
}
