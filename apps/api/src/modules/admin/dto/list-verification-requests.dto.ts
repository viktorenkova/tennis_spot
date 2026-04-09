import { ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListVerificationRequestsDto {
  @ApiPropertyOptional({
    enum: VerificationRequestStatus,
  })
  @IsOptional()
  @IsEnum(VerificationRequestStatus)
  status?: VerificationRequestStatus;
}
