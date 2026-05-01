import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBookingFromMatchRequestDto {
  @ApiProperty()
  @IsDefined({ message: 'Идентификатор площадки обязателен.' })
  @IsUUID('4', { message: 'Идентификатор площадки должен быть корректным UUID.' })
  venueId!: string;

  @ApiProperty()
  @IsDefined({ message: 'Идентификатор корта обязателен.' })
  @IsUUID('4', { message: 'Идентификатор корта должен быть корректным UUID.' })
  courtId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий игрока должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий игрока не должен превышать 1000 символов.' })
  commentFromPlayer?: string;
}
