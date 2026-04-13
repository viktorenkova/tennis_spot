import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlayerBookingActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий игрока должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий игрока не должен превышать 1000 символов.' })
  commentFromPlayer?: string;
}
