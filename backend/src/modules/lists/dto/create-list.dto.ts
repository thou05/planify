import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateListDto {
  @ApiProperty({ example: 'Đang thực hiện', description: 'Tên cột List' })
  @IsString()
  @IsNotEmpty({ message: 'Tên danh sách không được để trống' })
  @MaxLength(150, { message: 'Tên danh sách không quá 150 ký tự' })
  title: string;

  @ApiPropertyOptional({ example: 0, description: 'Vị trí thứ tự cột' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 5, description: 'Giới hạn WIP (Work In Progress)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
