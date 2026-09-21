import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty({ example: 'Chuẩn bị tài liệu kỹ thuật', description: 'Nội dung mục công việc con' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung công việc không được để trống' })
  @MaxLength(500, { message: 'Nội dung công việc không quá 500 ký tự' })
  content: string;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí thứ tự mục trong checklist' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
