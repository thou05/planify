import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({ description: 'Tên nhãn mới', example: 'Frontend Dev' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tên nhãn tối đa 50 ký tự' })
  name?: string;

  @ApiPropertyOptional({ description: 'Mã màu mới (Hex code)', example: '#3b82f6' })
  @IsOptional()
  @IsString()
  color?: string;
}
