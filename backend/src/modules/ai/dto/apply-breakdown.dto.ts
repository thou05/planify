import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BreakdownItemDto {
  @ApiProperty({ description: 'Nội dung checklist item', example: 'Thiết kế schema bảng cards' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Thời gian ước tính (phút)', example: 45 })
  @IsOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ description: 'Độ ưu tiên', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class ApplyBreakdownDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề Checklist muốn tạo',
    example: 'AI Checklist: Phân rã công việc',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Danh sách các checklist items đã chọn từ kết quả AI',
    type: [BreakdownItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakdownItemDto)
  items: BreakdownItemDto[];
}
