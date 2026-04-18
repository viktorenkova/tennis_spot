import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class FindBookingOptionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор города должен быть корректным UUID.' })
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор района должен быть корректным UUID.' })
  districtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'Дата бронирования должна быть корректной датой.' })
  bookingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Время начала должно быть строкой.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время начала должно быть в формате HH:mm.' })
  timeFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Время окончания должно быть строкой.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время окончания должно быть в формате HH:mm.' })
  timeTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Покрытие корта должно быть строкой.' })
  surfaceType?: string;

  @ApiPropertyOptional({
    enum: ['any', 'indoor', 'outdoor'],
    default: 'any',
  })
  @IsOptional()
  @IsIn(['any', 'indoor', 'outdoor'], {
    message: 'Тип корта должен быть одним из значений: any, indoor, outdoor.',
  })
  courtType?: 'any' | 'indoor' | 'outdoor';

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Количество игроков должно быть целым числом.' })
  @Min(1, { message: 'Количество игроков должно быть не меньше 1.' })
  @Max(8, { message: 'Количество игроков должно быть не больше 8.' })
  playersCount?: number;
}
