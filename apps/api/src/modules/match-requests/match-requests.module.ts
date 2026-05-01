import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchRequestsController } from './match-requests.controller';
import { MatchRequestsService } from './match-requests.service';

@Module({
  imports: [BookingModule, NotificationsModule],
  controllers: [MatchRequestsController],
  providers: [MatchRequestsService],
})
export class MatchRequestsModule {}
