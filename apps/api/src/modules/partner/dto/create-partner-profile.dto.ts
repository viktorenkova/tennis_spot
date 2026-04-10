import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerTypeKey } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePartnerProfileDto {
  @ApiProperty()
  @IsString({ message: 'Юридическое название должно быть строкой.' })
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
  @IsUUID('4', { message: 'Идентификатор города должен быть корректным UUID.' })
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор района должен быть корректным UUID.' })
  districtId?: string;

  @ApiProperty({ type: [String], enum: ['club', 'school', 'organizer', 'store', 'mixed'] })
  @IsArray({ message: 'Список типов партнера должен быть массивом.' })
  @IsEnum(PartnerTypeKey, {
    each: true,
    message: 'Каждый тип партнера должен быть одним из допустимых значений.',
  })
  partnerTypes!: PartnerTypeKey[];
}
