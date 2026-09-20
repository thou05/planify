import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CopyCardDto {
  @ApiPropertyOptional({ example: 'Bản sao - Thiết kế giao diện', description: 'Tiêu đề thẻ mới' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'uuid-target-list', description: 'ID danh sách đích (mặc định cùng danh sách)' })
  @IsOptional()
  @IsUUID('4')
  targetListId?: string;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí trong danh sách đích' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
