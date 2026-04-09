import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const demoUserKeys = ['demo-player', 'demo-partner', 'demo-admin', 'review-partner'] as const;

export class DemoLoginDto {
  @ApiProperty({ enum: demoUserKeys })
  @IsIn(demoUserKeys)
  userKey!: (typeof demoUserKeys)[number];
}
