import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiPropertyOptional({ example: 'Chuẩn bị tài liệu kỹ thuật (đã sửa)', description: 'Nội dung mục công việc con' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Nội dung công việc không quá 500 ký tự' })
  content?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoàn thành' })
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí thứ tự mục trong checklist' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
