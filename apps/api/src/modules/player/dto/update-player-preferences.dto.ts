import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdatePlayerPreferencesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredFormats?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDays?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTimes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  preferredCityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  preferredDistrictId?: string;
}
