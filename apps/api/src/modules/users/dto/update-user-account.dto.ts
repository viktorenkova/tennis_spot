import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Укажите корректный email.' })
  @MaxLength(255, { message: 'Email не должен превышать 255 символов.' })
  email?: string;
}
