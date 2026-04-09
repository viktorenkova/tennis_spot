import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerTypeKey } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePartnerProfileDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  legalName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiProperty({ type: [String], enum: ['club', 'school', 'organizer', 'store', 'mixed'] })
  @IsArray()
  @IsEnum(PartnerTypeKey, { each: true })
  partnerTypes!: PartnerTypeKey[];
}
