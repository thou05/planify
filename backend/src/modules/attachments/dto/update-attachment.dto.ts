import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAttachmentDto {
  @IsString({ message: 'Tên hiển thị phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  @MaxLength(255, { message: 'Tên hiển thị không được vượt quá 255 ký tự' })
  file_name?: string;
}
