import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveVerificationRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class RejectVerificationRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  comment!: string;
}

export class NeedsCorrectionVerificationRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  comment!: string;
}
