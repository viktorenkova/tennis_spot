import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class AddVerificationDocumentDto {
  @ApiProperty()
  @IsString()
  documentType!: string;

  @ApiProperty()
  @IsString()
  originalName!: string;

  @ApiProperty()
  @IsString()
  storageKey!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
