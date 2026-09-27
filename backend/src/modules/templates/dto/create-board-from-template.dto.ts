import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean, IsIn } from 'class-validator';

export class CreateBoardFromTemplateDto {
  @ApiProperty({ description: 'ID của Không gian làm việc đích để tạo Board' })
  @IsNotEmpty({ message: 'workspaceId không được để trống' })
  @IsUUID('4', { message: 'workspaceId phải là UUID hợp lệ' })
  workspaceId: string;

  @ApiProperty({ example: 'Dự án Sản phẩm mới', description: 'Tên Bảng muốn tạo' })
  @IsNotEmpty({ message: 'Tên Board không được để trống' })
  @IsString()
  boardName: string;

  @ApiPropertyOptional({ default: true, description: 'Có sao chép các Thẻ và Checklist mẫu không' })
  @IsOptional()
  @IsBoolean()
  keepCards?: boolean;

  @ApiPropertyOptional({
    enum: ['WORKSPACE', 'PRIVATE', 'PUBLIC'],
    default: 'WORKSPACE',
    description: 'Quyền hiển thị của Board mới',
  })
  @IsOptional()
  @IsIn(['WORKSPACE', 'PRIVATE', 'PUBLIC'])
  visibility?: 'WORKSPACE' | 'PRIVATE' | 'PUBLIC';
}
