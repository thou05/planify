import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateListDto {
  @ApiPropertyOptional({ example: 'Đã hoàn thành', description: 'Tên cột List' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 1, description: 'Vị trí thứ tự cột' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 10, description: 'Giới hạn số lượng Card (WIP limit)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
