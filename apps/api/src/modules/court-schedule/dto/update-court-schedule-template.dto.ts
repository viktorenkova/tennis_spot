import { PartialType } from '@nestjs/swagger';
import { CreateCourtScheduleTemplateDto } from './create-court-schedule-template.dto';

export class UpdateCourtScheduleTemplateDto extends PartialType(CreateCourtScheduleTemplateDto) {}
