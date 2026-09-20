import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCardDto {
  @ApiPropertyOptional({ example: 'Cập nhật tiêu đề thẻ', description: 'Tiêu đề thẻ' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Nội dung mô tả mới', description: 'Mô tả thẻ' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Vị trí thứ tự thẻ' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'IN_PROGRESS', description: 'Trạng thái thẻ' })
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

  @ApiPropertyOptional({ example: true, description: 'Đánh dấu hoàn thành hạn chót' })
  @IsOptional()
  @IsBoolean()
  is_due_date_completed?: boolean;
}
