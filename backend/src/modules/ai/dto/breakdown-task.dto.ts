import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BreakdownTaskDto {
  @ApiPropertyOptional({
    description: 'Hướng dẫn hoặc yêu cầu bổ sung cho AI khi phân rã task',
    example: 'Chia nhỏ thành 3 giai đoạn: Thiết kế Database, Viết API NestJS, và Xây dựng UI React',
  })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}
