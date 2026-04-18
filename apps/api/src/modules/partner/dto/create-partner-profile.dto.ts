import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerTypeKey } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePartnerProfileDto {
  @ApiProperty()
  @IsDefined({ message: 'Юридическое название обязательно.' })
  @IsString({ message: 'Юридическое название должно быть строкой.' })
  @IsNotEmpty({ message: 'Юридическое название обязательно.' })
  @MaxLength(255, { message: 'Юридическое название не должно превышать 255 символов.' })
  legalName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Название бренда должно быть строкой.' })
  @MaxLength(255, { message: 'Название бренда не должно превышать 255 символов.' })
  brandName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой.' })
  @MaxLength(2000, { message: 'Описание не должно превышать 2000 символов.' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Контактный телефон должен быть строкой.' })
  @MaxLength(32, { message: 'Контактный телефон не должен превышать 32 символа.' })
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Укажите корректный email для связи.' })
  @MaxLength(255, { message: 'Контактный email не должен превышать 255 символов.' })
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'ИНН должен быть строкой.' })
  @MaxLength(32, { message: 'ИНН не должен превышать 32 символа.' })
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Юридический адрес должен быть строкой.' })
  @MaxLength(500, { message: 'Юридический адрес не должен превышать 500 символов.' })
  legalAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Фактический адрес должен быть строкой.' })
  @MaxLength(500, { message: 'Фактический адрес не должен превышать 500 символов.' })
  actualAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор города должен быть корректным UUID.' })
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор района должен быть корректным UUID.' })
  districtId?: string;

  @ApiProperty({ type: [String], enum: ['club', 'school', 'organizer', 'store', 'mixed'] })
  @IsDefined({ message: 'Типы партнера обязательны.' })
  @IsArray({ message: 'Список типов партнера должен быть массивом.' })
  @ArrayMinSize(1, { message: 'Выберите хотя бы один тип партнера.' })
  @IsEnum(PartnerTypeKey, {
    each: true,
    message: 'Каждый тип партнера должен быть одним из допустимых значений.',
  })
  partnerTypes!: PartnerTypeKey[];
}
