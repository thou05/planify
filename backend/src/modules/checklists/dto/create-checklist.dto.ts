import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateChecklistDto {
  @ApiProperty({ example: 'Việc cần làm', description: 'Tiêu đề Checklist' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề checklist không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề checklist không quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí thứ tự checklist' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
