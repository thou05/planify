import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestEditorDto {
  @ApiPropertyOptional({
    description: 'Ghi chú / lý do gửi yêu cầu cấp quyền Biên tập viên',
    example: 'Tôi cần quyền biên tập để tham gia cập nhật tiến độ thẻ nhiệm vụ.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

