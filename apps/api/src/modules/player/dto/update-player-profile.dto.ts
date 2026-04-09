import { PartialType } from '@nestjs/swagger';
import { CreatePlayerProfileDto } from './create-player-profile.dto';

export class UpdatePlayerProfileDto extends PartialType(CreatePlayerProfileDto) {}
