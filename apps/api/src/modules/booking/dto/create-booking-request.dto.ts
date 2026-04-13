import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
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
  @IsUUID('4', { message: 'Идентификатор площадки должен быть корректным UUID.' })
  venueId!: string;

  @ApiProperty()
  @IsUUID('4', { message: 'Идентификатор корта должен быть корректным UUID.' })
  courtId!: string;

  @ApiProperty()
  @IsDateString({}, { message: 'Дата бронирования должна быть корректной датой.' })
  bookingDate!: string;

  @ApiProperty()
  @IsString({ message: 'Время начала должно быть строкой.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время начала должно быть в формате HH:mm.' })
  timeFrom!: string;

  @ApiProperty()
  @IsString({ message: 'Время окончания должно быть строкой.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время окончания должно быть в формате HH:mm.' })
  timeTo!: string;

  @ApiProperty()
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
