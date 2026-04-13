import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PartnerBookingActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий партнёра должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий партнёра не должен превышать 1000 символов.' })
  commentFromPartner?: string;
}
