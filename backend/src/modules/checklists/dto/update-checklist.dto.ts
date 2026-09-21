import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateChecklistDto {
  @ApiPropertyOptional({ example: 'Kế hoạch tuần này', description: 'Tiêu đề Checklist' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Tiêu đề checklist không quá 255 ký tự' })
  title?: string;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí thứ tự checklist' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
