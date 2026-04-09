import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminVerificationController } from './admin-verification.controller';
import { AdminVerificationService } from './admin-verification.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminVerificationController],
  providers: [AdminVerificationService, RolesGuard],
})
export class AdminModule {}
