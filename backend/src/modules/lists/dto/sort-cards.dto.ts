import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SortCardsDto {
  @ApiProperty({
    example: 'due_date',
    description: 'Tiêu chí sắp xếp: due_date | title | created_at',
    enum: ['due_date', 'title', 'created_at'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['due_date', 'title', 'created_at'])
  sortBy: 'due_date' | 'title' | 'created_at';

  @ApiPropertyOptional({
    example: 'asc',
    description: 'Thứ tự: asc (tăng dần) | desc (giảm dần)',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
