import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty()
  @IsString({ message: 'Название площадки должно быть строкой.' })
  @MaxLength(255, { message: 'Название площадки не должно превышать 255 символов.' })
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Описание площадки должно быть строкой.' })
  @MaxLength(2000, { message: 'Описание площадки не должно превышать 2000 символов.' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Контактный телефон площадки должен быть строкой.' })
  @MaxLength(32, { message: 'Контактный телефон площадки не должен превышать 32 символа.' })
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Укажите корректный email площадки.' })
  @MaxLength(255, { message: 'Контактный email площадки не должен превышать 255 символов.' })
  contactEmail?: string;

  @ApiProperty()
  @IsUUID('4', { message: 'Идентификатор города площадки должен быть корректным UUID.' })
  cityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор района площадки должен быть корректным UUID.' })
  districtId?: string;

  @ApiProperty()
  @IsString({ message: 'Адрес площадки должен быть строкой.' })
  @MaxLength(255, { message: 'Адрес площадки не должен превышать 255 символов.' })
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Дополнительная строка адреса должна быть строкой.' })
  @MaxLength(255, { message: 'Дополнительная строка адреса не должна превышать 255 символов.' })
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Почтовый индекс должен быть строкой.' })
  @MaxLength(32, { message: 'Почтовый индекс не должен превышать 32 символа.' })
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Подсказка по доступу на площадку должна быть строкой.' })
  @MaxLength(500, { message: 'Подсказка по доступу на площадку не должна превышать 500 символов.' })
  accessNotes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Признак активности площадки должен быть булевым значением.' })
  isActive?: boolean;
}
