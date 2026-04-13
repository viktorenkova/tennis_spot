import { PartialType } from '@nestjs/swagger';
import { CreateCourtScheduleExceptionDto } from './create-court-schedule-exception.dto';

export class UpdateCourtScheduleExceptionDto extends PartialType(CreateCourtScheduleExceptionDto) {}
