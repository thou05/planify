import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CopyListDto {
  @ApiPropertyOptional({ example: 'Bản sao - To Do', description: 'Tên danh sách mới' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;
}
