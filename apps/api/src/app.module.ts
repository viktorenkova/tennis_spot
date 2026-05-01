import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { BookingModule } from './modules/booking/booking.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { CourtScheduleModule } from './modules/court-schedule/court-schedule.module';
import { configuration, envFilePaths } from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MatchRequestsModule } from './modules/match-requests/match-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PartnerModule } from './modules/partner/partner.module';
import { PlayerModule } from './modules/player/player.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { UsersModule } from './modules/users/users.module';
import { VenueModule } from './modules/venue/venue.module';
import { VerificationModule } from './modules/verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: envFilePaths,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    BookingModule,
    ComplaintsModule,
    CourtScheduleModule,
    MatchRequestsModule,
    NotificationsModule,
    UsersModule,
    ReferenceModule,
    PlayerModule,
    PartnerModule,
    VenueModule,
    VerificationModule,
  ],
})
export class AppModule {}
