import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageItem {
  @ApiProperty({ enum: ['user', 'model'], example: 'user' })
  @IsString()
  role: 'user' | 'model';

  @ApiProperty({ example: 'Thẻ nào sắp trễ hạn trong tuần này?' })
  @IsString()
  content: string;
}

export class BoardChatDto {
  @ApiProperty({
    description: 'Nội dung câu hỏi của người dùng gửi cho AI Copilot',
    example: 'Ai đang phụ trách nhiều công việc nhất trên bảng?',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống' })
  message: string;

  @ApiPropertyOptional({
    description: 'Lịch sử hội thoại trước đó',
    type: [ChatMessageItem],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageItem)
  history?: ChatMessageItem[];
}
