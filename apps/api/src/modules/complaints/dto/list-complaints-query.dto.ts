import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { complaintTypes } from './create-complaint.dto';
import { complaintStatuses } from './update-complaint-status.dto';

export class ListComplaintsQueryDto {
  @ApiPropertyOptional({
    enum: complaintStatuses,
  })
  @IsOptional()
  @IsIn(complaintStatuses, {
    message: 'Статус жалобы должен быть одним из поддерживаемых значений.',
  })
  status?: (typeof complaintStatuses)[number];

  @ApiPropertyOptional({
    enum: complaintTypes,
  })
  @IsOptional()
  @IsIn(complaintTypes, {
    message: 'Тип жалобы должен быть одним из поддерживаемых значений.',
  })
  type?: (typeof complaintTypes)[number];
}
