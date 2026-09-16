import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ example: 'Dự án Cập nhật', description: 'Tên Workspace mới' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Mô tả cập nhật', description: 'Mô tả mới' })
  @IsOptional()
  @IsString()
  description?: string;
}
