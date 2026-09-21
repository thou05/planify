import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateLinkAttachmentDto {
  @IsString({ message: 'Tên hiển thị phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  @MaxLength(255, { message: 'Tên hiển thị không được vượt quá 255 ký tự' })
  file_name: string;

  @IsString({ message: 'Đường dẫn liên kết phải là chuỗi' })
  @IsNotEmpty({ message: 'Đường dẫn liên kết không được để trống' })
  file_url: string;
}
