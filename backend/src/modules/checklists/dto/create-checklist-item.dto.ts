import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, IsISO8601, Matches } from 'class-validator';

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

  @ApiPropertyOptional({ example: '2026-10-15T17:00:00.000Z', description: 'Thời hạn hoàn thành' })
  @IsOptional()
  @IsISO8601({}, { message: 'Định dạng ngày hết hạn không hợp lệ' })
  due_date?: string | null;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'ID thành viên được phân công' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: 'ID thành viên không hợp lệ' })
  member_id?: string | null;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'ID người dùng được phân công trực tiếp' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: 'ID người dùng không hợp lệ' })
  user_id?: string | null;
}
