import { PartialType } from '@nestjs/swagger';
import { CreatePartnerProfileDto } from './create-partner-profile.dto';

export class UpdatePartnerProfileDto extends PartialType(CreatePartnerProfileDto) {}
