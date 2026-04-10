import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveVerificationRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий не должен превышать 1000 символов.' })
  comment?: string;
}

export class RejectVerificationRequestDto {
  @ApiProperty()
  @IsString({ message: 'Комментарий должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий не должен превышать 1000 символов.' })
  comment!: string;
}

export class NeedsCorrectionVerificationRequestDto {
  @ApiProperty()
  @IsString({ message: 'Комментарий должен быть строкой.' })
  @MaxLength(1000, { message: 'Комментарий не должен превышать 1000 символов.' })
  comment!: string;
}
