import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const complaintStatuses = ['pending', 'in_review', 'resolved', 'rejected'] as const;

export type UpdateComplaintStatus = (typeof complaintStatuses)[number];

export class UpdateComplaintStatusDto {
  @ApiProperty({
    enum: complaintStatuses,
  })
  @IsDefined({ message: 'Статус жалобы обязателен.' })
  @IsIn(complaintStatuses, {
    message: 'Статус жалобы должен быть одним из поддерживаемых значений.',
  })
  status!: UpdateComplaintStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Комментарий администратора должен быть строкой.' })
  @MaxLength(2000, {
    message: 'Комментарий администратора не должен превышать 2000 символов.',
  })
  resolutionComment?: string;
}
