import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, Min, Max, IsNumber } from 'class-validator';

export class CreatePlayerProfileDto {
  @ApiProperty()
  @IsString({ message: 'Имя должно быть строкой.' })
  @MaxLength(120, { message: 'Имя не должно превышать 120 символов.' })
  firstName!: string;

  @ApiProperty()
  @IsString({ message: 'Фамилия должна быть строкой.' })
  @MaxLength(120, { message: 'Фамилия не должна превышать 120 символов.' })
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Поле "О себе" должно быть строкой.' })
  @MaxLength(2000, { message: 'Поле "О себе" не должно превышать 2000 символов.' })
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор города должен быть корректным UUID.' })
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор района должен быть корректным UUID.' })
  districtId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @IsNumber({}, { message: 'Самооценка NTRP должна быть числом.' })
  @Min(1, { message: 'Самооценка NTRP должна быть не меньше 1.' })
  @Max(7, { message: 'Самооценка NTRP должна быть не больше 7.' })
  ntrpSelfRating?: number;
}
