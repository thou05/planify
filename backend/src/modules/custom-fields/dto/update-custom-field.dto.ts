import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsIn, IsArray } from 'class-validator';
import { ALLOWED_CUSTOM_FIELD_TYPES } from './create-custom-field.dto';

export class UpdateCustomFieldDto {
  @ApiPropertyOptional({
    description: 'Tên trường tùy chỉnh mới',
    example: 'Ước lượng điểm (SP)',
  })
  @IsOptional()
  @IsString({ message: 'Tên trường tùy chỉnh phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Tên trường tùy chỉnh tối đa 100 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Loại trường dữ liệu mới',
    enum: ALLOWED_CUSTOM_FIELD_TYPES,
    example: 'NUMBER',
  })
  @IsOptional()
  @IsString({ message: 'Kiểu trường tùy chỉnh phải là chuỗi ký tự' })
  @IsIn(ALLOWED_CUSTOM_FIELD_TYPES as any, {
    message: `Kiểu trường phải là một trong: ${ALLOWED_CUSTOM_FIELD_TYPES.join(', ')}`,
  })
  field_type?: string;

  @ApiPropertyOptional({
    description: 'Danh sách các tùy chọn cho kiểu trường DROPDOWN',
    example: ['Tùy chọn 1', 'Tùy chọn 2'],
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách tùy chọn phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tùy chọn phải là chuỗi ký tự' })
  options?: string[];
}
