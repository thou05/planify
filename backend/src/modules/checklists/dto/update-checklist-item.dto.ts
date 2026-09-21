import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, IsISO8601, IsUUID } from 'class-validator';

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

  @ApiPropertyOptional({ example: '2026-10-15T17:00:00.000Z', description: 'Thời hạn hoàn thành' })
  @IsOptional()
  @IsISO8601({}, { message: 'Định dạng ngày hết hạn không hợp lệ' })
  due_date?: string | null;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'ID thành viên được phân công' })
  @IsOptional()
  @IsUUID('4', { message: 'ID thành viên không hợp lệ' })
  member_id?: string | null;
}
