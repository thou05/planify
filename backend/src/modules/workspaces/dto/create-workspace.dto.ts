import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Dự án Công nghệ 2026', description: 'Tên Workspace' })
  @IsString()
  @IsNotEmpty({ message: 'Tên workspace không được để trống' })
  @MaxLength(150, { message: 'Tên workspace không quá 150 ký tự' })
  name: string;

  @ApiPropertyOptional({ example: 'Không gian làm việc cho nhóm phát triển', description: 'Mô tả Workspace' })
  @IsOptional()
  @IsString()
  description?: string;
}
