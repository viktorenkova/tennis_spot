import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchRequestsController } from './match-requests.controller';
import { MatchRequestsService } from './match-requests.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MatchRequestsController],
  providers: [MatchRequestsService],
})
export class MatchRequestsModule {}
