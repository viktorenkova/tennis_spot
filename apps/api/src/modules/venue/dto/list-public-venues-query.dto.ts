import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListPublicVenuesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор города должен быть корректным UUID.' })
  cityId?: string;
}
