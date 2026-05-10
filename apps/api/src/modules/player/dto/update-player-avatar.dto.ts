import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class UpdatePlayerAvatarDto {
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

  @ApiProperty({ enum: AVATAR_MIME_TYPES })
  @IsDefined({ message: 'MIME-тип обязателен.' })
  @IsString({ message: 'MIME-тип должен быть строкой.' })
  @IsIn(AVATAR_MIME_TYPES, {
    message: 'Аватар должен быть изображением JPEG, PNG или WebP.',
  })
  mimeType!: string;

  @ApiProperty()
  @IsDefined({ message: 'Размер файла обязателен.' })
  @Type(() => Number)
  @IsInt({ message: 'Размер файла должен быть целым числом.' })
  @Min(1, { message: 'Размер файла должен быть больше нуля.' })
  sizeBytes!: number;
}
