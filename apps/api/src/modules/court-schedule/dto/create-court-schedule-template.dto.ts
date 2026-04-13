import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourtScheduleTemplateDto {
  @ApiProperty({ description: '1 = Monday, 7 = Sunday' })
  @Type(() => Number)
  @IsInt({ message: 'День недели должен быть целым числом.' })
  @Min(1, { message: 'День недели должен быть в диапазоне от 1 до 7.' })
  @Max(7, { message: 'День недели должен быть в диапазоне от 1 до 7.' })
  weekday!: number;

  @ApiProperty()
  @IsString({ message: 'Время начала должно быть строкой.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время начала должно быть в формате HH:mm.' })
  timeFrom!: string;

  @ApiProperty()
  @IsString({ message: 'Время окончания должно быть строкой.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время окончания должно быть в формате HH:mm.' })
  timeTo!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'Длительность слота должна быть целым числом минут.' })
  @Min(15, { message: 'Длительность слота должна быть не меньше 15 минут.' })
  @Max(240, { message: 'Длительность слота должна быть не больше 240 минут.' })
  slotDurationMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Флаг открытого интервала должен быть булевым значением.' })
  isOpen?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Базовая цена должна быть числом с точностью до двух знаков.' },
  )
  @Min(0, { message: 'Базовая цена не может быть отрицательной.' })
  basePrice?: number;
}
