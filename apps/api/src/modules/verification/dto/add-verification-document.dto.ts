import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const DOCUMENT_TYPES = ['registration_certificate', 'tax_document', 'charter', 'other'] as const;

export class AddVerificationDocumentDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsDefined({ message: 'Тип документа обязателен.' })
  @IsString({ message: 'Тип документа должен быть строкой.' })
  @IsNotEmpty({ message: 'Тип документа обязателен.' })
  @IsIn(DOCUMENT_TYPES, {
    message: 'Тип документа должен быть одним из допустимых значений.',
  })
  documentType!: string;

  @ApiProperty()
  @IsDefined({ message: 'Исходное имя файла обязательно.' })
  @IsString({ message: 'Исходное имя файла должно быть строкой.' })
  @IsNotEmpty({ message: 'Исходное имя файла обязательно.' })
  originalName!: string;

  @ApiProperty()
  @IsDefined({ message: 'Ключ хранения обязателен.' })
  @IsString({ message: 'Ключ хранения должен быть строкой.' })
  @IsNotEmpty({ message: 'Ключ хранения обязателен.' })
  storageKey!: string;

  @ApiProperty()
  @IsDefined({ message: 'MIME-тип обязателен.' })
  @IsString({ message: 'MIME-тип должен быть строкой.' })
  @IsNotEmpty({ message: 'MIME-тип обязателен.' })
  mimeType!: string;

  @ApiProperty()
  @IsDefined({ message: 'Размер файла обязателен.' })
  @Type(() => Number)
  @IsInt({ message: 'Размер файла должен быть целым числом.' })
  @Min(1, { message: 'Размер файла должен быть больше нуля.' })
  sizeBytes!: number;
}
