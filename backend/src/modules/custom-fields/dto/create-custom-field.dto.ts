import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsIn, IsOptional, IsArray } from 'class-validator';

export const ALLOWED_CUSTOM_FIELD_TYPES = [
  'TEXT',
  'NUMBER',
  'CURRENCY',
  'RATING',
  'PERCENT',
  'CHECKBOX',
  'DROPDOWN',
] as const;

export type CustomFieldType = (typeof ALLOWED_CUSTOM_FIELD_TYPES)[number];

export class CreateCustomFieldDto {
  @ApiProperty({
    description: 'Tên trường tùy chỉnh',
    example: 'Story Points',
  })
  @IsString({ message: 'Tên trường tùy chỉnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên trường tùy chỉnh không được để trống' })
  @MaxLength(100, { message: 'Tên trường tùy chỉnh tối đa 100 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Loại trường dữ liệu',
    enum: ALLOWED_CUSTOM_FIELD_TYPES,
    example: 'NUMBER',
  })
  @IsString({ message: 'Kiểu trường tùy chỉnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Kiểu trường tùy chỉnh không được để trống' })
  @IsIn(ALLOWED_CUSTOM_FIELD_TYPES as any, {
    message: `Kiểu trường phải là một trong: ${ALLOWED_CUSTOM_FIELD_TYPES.join(', ')}`,
  })
  field_type: string;

  @ApiPropertyOptional({
    description: 'Danh sách các tùy chọn cho kiểu trường DROPDOWN',
    example: ['Tùy chọn 1', 'Tùy chọn 2'],
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách tùy chọn phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tùy chọn phải là chuỗi ký tự' })
  options?: string[];
}
