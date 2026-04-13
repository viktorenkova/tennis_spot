import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class GetCourtAvailabilityDto {
  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsString({ message: 'Дата должна быть строкой.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата должна быть в формате YYYY-MM-DD.' })
  date!: string;
}
