import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ example: 'Sprint 1 - Ra mắt MVP', description: 'Tên Board' })
  @IsString()
  @IsNotEmpty({ message: 'Tên Board không được để trống' })
  @MaxLength(150, { message: 'Tên Board không quá 150 ký tự' })
  name: string;

  @ApiPropertyOptional({ example: 'Kế hoạch công việc Sprint 1', description: 'Mô tả Board' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Đánh dấu yêu thích' })
  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;
}
