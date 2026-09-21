import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Nội dung bình luận', example: 'Đã hoàn thành phần giao diện, @NguyenVanA xem giúp mình nhé!' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;
}
