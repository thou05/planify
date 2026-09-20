import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ example: 'Thiết kế giao diện Kanban', description: 'Tiêu đề thẻ' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề thẻ không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề thẻ không quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({ example: 'Mô tả chi tiết công việc...', description: 'Mô tả thẻ' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí thứ tự thẻ trong list' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'TODO', description: 'Trạng thái thẻ' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2026-09-25T00:00:00.000Z', description: 'Ngày bắt đầu' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59.000Z', description: 'Ngày hết hạn' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ example: false, description: 'Đã hoàn thành hạn chót hay chưa' })
  @IsOptional()
  @IsBoolean()
  is_due_date_completed?: boolean;
}
