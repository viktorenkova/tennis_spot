import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePlayerVisibilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  profileVisibleToAuthenticated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCity?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAvailability?: boolean;
}
