import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CopyBoardDto {
  @ApiProperty({ example: 'Bản sao - Sprint 1', description: 'Tên Board mới' })
  @IsString()
  @IsNotEmpty({ message: 'Tên Board không được để trống' })
  @MaxLength(150, { message: 'Tên Board không quá 150 ký tự' })
  name: string;

  @ApiPropertyOptional({
    description: 'ID của Workspace đích (mặc định sao chép vào cùng Workspace)',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID('4', { message: 'targetWorkspaceId phải là UUID hợp lệ' })
  targetWorkspaceId?: string;

  @ApiPropertyOptional({
    description: 'Sao chép cả các Thẻ công việc (Cards), Checklists và Labels',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCards?: boolean;
}
