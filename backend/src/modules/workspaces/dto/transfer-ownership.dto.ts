import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferOwnershipDto {
  @ApiProperty({
    description: 'ID người dùng được chuyển giao quyền Chủ sở hữu (Owner)',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsNotEmpty({ message: 'newOwnerId không được để trống' })
  @IsUUID('4', { message: 'newOwnerId phải là định dạng UUID hợp lệ' })
  newOwnerId: string;
}
