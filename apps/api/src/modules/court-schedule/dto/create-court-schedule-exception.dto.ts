import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SCHEDULE_EXCEPTION_TYPES,
  type ScheduleExceptionTypeValue,
} from '../schedule.constants';

export class CreateCourtScheduleExceptionDto {
  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsString({ message: 'Дата исключения должна быть строкой.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата исключения должна быть в формате YYYY-MM-DD.' })
  date!: string;

  @ApiProperty({ enum: SCHEDULE_EXCEPTION_TYPES })
  @IsEnum(SCHEDULE_EXCEPTION_TYPES, {
    message: 'Укажите корректный тип исключения.',
  })
  exceptionType!: ScheduleExceptionTypeValue;

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
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Кастомная цена должна быть числом с точностью до двух знаков.' },
  )
  @Min(0, { message: 'Кастомная цена не может быть отрицательной.' })
  customPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий не должен превышать 1000 символов.' })
  comment?: string;
}
