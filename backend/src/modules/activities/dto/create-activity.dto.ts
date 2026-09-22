import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateActivityDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  action: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  targetType: string;
}
