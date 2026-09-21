import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ description: 'Nội dung bình luận cần cập nhật', example: 'Nội dung bình luận đã chỉnh sửa' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;
}
