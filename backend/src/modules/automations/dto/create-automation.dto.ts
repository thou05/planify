import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationDto {
  @ApiProperty({ description: 'Tên của quy tắc / nút tự động hóa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Loại automation',
    enum: ['RULE', 'SCHEDULED', 'DUE_DATE', 'CARD_BUTTON', 'BOARD_BUTTON'],
  })
  @IsString()
  @IsIn(['RULE', 'SCHEDULED', 'DUE_DATE', 'CARD_BUTTON', 'BOARD_BUTTON'])
  type: 'RULE' | 'SCHEDULED' | 'DUE_DATE' | 'CARD_BUTTON' | 'BOARD_BUTTON';

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt (mặc định true)' })
  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Icon cho button (nếu là CARD_BUTTON hoặc BOARD_BUTTON)' })
  @IsString()
  @IsOptional()
  button_icon?: string;

  @ApiPropertyOptional({ description: 'Nhãn hiển thị trên button' })
  @IsString()
  @IsOptional()
  button_label?: string;

  @ApiProperty({
    description: 'Sự kiện kích hoạt',
    example: 'CARD_MOVED',
  })
  @IsString()
  @IsNotEmpty()
  trigger_type: string;

  @ApiPropertyOptional({ description: 'Cấu hình chi tiết của trigger (nguồn, đích, chu kỳ)' })
  @IsObject()
  @IsOptional()
  trigger_config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Danh sách các điều kiện lọc (Conditions)' })
  @IsArray()
  @IsOptional()
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  }>;

  @ApiProperty({ description: 'Danh sách các hành động cần thực thi (Actions)' })
  @IsArray()
  actions: Array<{
    id?: string;
    type: string;
    params: Record<string, any>;
  }>;
}
