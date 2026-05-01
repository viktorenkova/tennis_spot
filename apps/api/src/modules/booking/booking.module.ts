import { Module } from '@nestjs/common';
import { CourtScheduleModule } from '../court-schedule/court-schedule.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [CourtScheduleModule, NotificationsModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
