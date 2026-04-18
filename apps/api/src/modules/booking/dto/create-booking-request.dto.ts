import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingRequestDto {
  @ApiProperty()
  @IsDefined({ message: 'Идентификатор площадки обязателен.' })
  @IsUUID('4', { message: 'Идентификатор площадки должен быть корректным UUID.' })
  venueId!: string;

  @ApiProperty()
  @IsDefined({ message: 'Идентификатор корта обязателен.' })
  @IsUUID('4', { message: 'Идентификатор корта должен быть корректным UUID.' })
  courtId!: string;

  @ApiProperty()
  @IsDefined({ message: 'Дата бронирования обязательна.' })
  @IsDateString({}, { message: 'Дата бронирования должна быть корректной датой.' })
  bookingDate!: string;

  @ApiProperty()
  @IsDefined({ message: 'Время начала обязательно.' })
  @IsString({ message: 'Время начала должно быть строкой.' })
  @IsNotEmpty({ message: 'Время начала обязательно.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время начала должно быть в формате HH:mm.' })
  timeFrom!: string;

  @ApiProperty()
  @IsDefined({ message: 'Время окончания обязательно.' })
  @IsString({ message: 'Время окончания должно быть строкой.' })
  @IsNotEmpty({ message: 'Время окончания обязательно.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время окончания должно быть в формате HH:mm.' })
  timeTo!: string;

  @ApiProperty()
  @IsDefined({ message: 'Количество игроков обязательно.' })
  @Type(() => Number)
  @IsInt({ message: 'Количество игроков должно быть целым числом.' })
  @Min(1, { message: 'Количество игроков должно быть не меньше 1.' })
  @Max(8, { message: 'Количество игроков должно быть не больше 8.' })
  playersCount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий игрока должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий игрока не должен превышать 1000 символов.' })
  commentFromPlayer?: string;
}
