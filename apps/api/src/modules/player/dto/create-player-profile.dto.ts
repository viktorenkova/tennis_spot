import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, Min, Max, IsNumber } from 'class-validator';

export class CreatePlayerProfileDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  ntrpSelfRating?: number;
}
