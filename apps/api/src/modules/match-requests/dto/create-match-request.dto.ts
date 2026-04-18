import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateMatchRequestDto {
  @ApiProperty()
  @IsDefined({ message: 'Идентификатор соперника обязателен.' })
  @IsUUID('4', { message: 'Идентификатор соперника должен быть корректным UUID.' })
  opponentId!: string;

  @ApiProperty()
  @IsDefined({ message: 'Дата игры обязательна.' })
  @IsDateString({}, { message: 'Дата игры должна быть корректной датой.' })
  proposedDate!: string;

  @ApiProperty()
  @IsDefined({ message: 'Время начала обязательно.' })
  @IsString({ message: 'Время начала должно быть строкой.' })
  @IsNotEmpty({ message: 'Время начала обязательно.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время начала должно быть в формате HH:mm.' })
  proposedTimeFrom!: string;

  @ApiProperty()
  @IsDefined({ message: 'Время окончания обязательно.' })
  @IsString({ message: 'Время окончания должно быть строкой.' })
  @IsNotEmpty({ message: 'Время окончания обязательно.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время окончания должно быть в формате HH:mm.' })
  proposedTimeTo!: string;

  @ApiProperty({
    enum: ['singles', 'doubles'],
  })
  @IsDefined({ message: 'Формат игры обязателен.' })
  @IsIn(['singles', 'doubles'], {
    message: 'Формат игры должен быть singles или doubles.',
  })
  format!: 'singles' | 'doubles';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Сообщение должно быть строкой.' })
  @MaxLength(1000, { message: 'Сообщение не должно превышать 1000 символов.' })
  message?: string;
}
