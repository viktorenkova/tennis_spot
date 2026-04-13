import { Module } from '@nestjs/common';
import { CourtScheduleModule } from '../court-schedule/court-schedule.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [CourtScheduleModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
