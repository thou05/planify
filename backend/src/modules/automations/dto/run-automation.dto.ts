import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RunAutomationDto {
  @ApiPropertyOptional({ description: 'ID của thẻ (áp dụng với CARD_BUTTON hoặc chạy thử trên một thẻ)' })
  @IsString()
  @IsOptional()
  cardId?: string;
}
