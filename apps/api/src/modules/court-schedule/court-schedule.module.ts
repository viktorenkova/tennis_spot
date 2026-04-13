import { Module } from '@nestjs/common';
import { CourtAvailabilityService } from './court-availability.service';
import { CourtScheduleController } from './court-schedule.controller';
import { CourtScheduleService } from './court-schedule.service';

@Module({
  controllers: [CourtScheduleController],
  providers: [CourtScheduleService, CourtAvailabilityService],
  exports: [CourtAvailabilityService],
})
export class CourtScheduleModule {}
