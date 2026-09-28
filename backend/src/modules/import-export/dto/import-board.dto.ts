import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CleanChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;
}

export class CleanChecklistDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CleanChecklistItemDto)
  items?: CleanChecklistItemDto[];
}

export class CleanLabelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class CleanCardDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  due_date?: string;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignees?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CleanChecklistDto)
  checklists?: CleanChecklistDto[];
}

export class CleanListDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CleanCardDto)
  cards?: CleanCardDto[];
}

export class CleanBoardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CleanBoardDataDto {
  @IsOptional()
  @IsString()
  version?: string;

  @ValidateNested()
  @Type(() => CleanBoardDto)
  board: CleanBoardDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CleanLabelDto)
  labels?: CleanLabelDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CleanListDto)
  lists: CleanListDto[];
}

export class ImportBoardDto {
  @IsNotEmpty()
  data: any;

  @IsOptional()
  @IsString()
  targetBoardName?: string;
}

export class ImportIntoBoardDto {
  @IsNotEmpty()
  data: any;

  @IsOptional()
  @IsIn(['skip', 'replace', 'create_new'])
  duplicateStrategy?: 'skip' | 'replace' | 'create_new';
}

export class ValidateImportDto {
  @IsNotEmpty()
  rawData: any;
}

