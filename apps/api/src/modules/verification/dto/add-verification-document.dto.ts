import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class AddVerificationDocumentDto {
  @ApiProperty()
  @IsString({ message: 'Тип документа должен быть строкой.' })
  documentType!: string;

  @ApiProperty()
  @IsString({ message: 'Исходное имя файла должно быть строкой.' })
  originalName!: string;

  @ApiProperty()
  @IsString({ message: 'Ключ хранения должен быть строкой.' })
  storageKey!: string;

  @ApiProperty()
  @IsString({ message: 'MIME-тип должен быть строкой.' })
  mimeType!: string;

  @ApiProperty()
  @IsInt({ message: 'Размер файла должен быть целым числом.' })
  @Min(1, { message: 'Размер файла должен быть больше нуля.' })
  sizeBytes!: number;
}
