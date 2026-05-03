import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SelectOnboardingRoleDto {
  @ApiProperty({ enum: ['player', 'partner'] })
  @IsIn(['player', 'partner'], {
    message: 'Выберите сценарий: игрок или партнёр.',
  })
  mode!: 'player' | 'partner';
}
