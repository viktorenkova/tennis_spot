import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReferenceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getCities() {
    return this.prisma.city.findMany({
      include: {
        districts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  getDistricts(cityId: string) {
    return this.prisma.district.findMany({
      where: { cityId },
      orderBy: {
        name: 'asc',
      },
    });
  }

  getEnums() {
    return {
      userStatus: ['pending', 'active', 'blocked', 'deleted'],
      playerProfileStatus: ['draft', 'active', 'limited', 'blocked'],
      partnerVerificationStatus: [
        'draft',
        'pending_verification',
        'verified',
        'rejected',
        'suspended',
        'archived',
      ],
      bookingRequestStatus: [
        'draft',
        'pending',
        'confirmed',
        'rejected',
        'cancelled_by_player',
        'cancelled_by_partner',
        'expired',
        'completed',
      ],
      matchRequestStatus: [
        'draft',
        'sent',
        'viewed',
        'accepted',
        'declined',
        'cancelled',
        'expired',
        'completed',
      ],
      tournamentStatus: [
        'draft',
        'published',
        'registration_open',
        'registration_closed',
        'ongoing',
        'completed',
        'archived',
        'cancelled',
      ],
      tournamentRegistrationStatus: ['pending', 'approved', 'rejected', 'waitlisted', 'cancelled'],
      verificationRequestStatus: [
        'draft',
        'submitted',
        'in_review',
        'approved',
        'rejected',
        'needs_correction',
      ],
      roles: ['player', 'partner', 'admin', 'superadmin'],
      partnerTypes: ['club', 'school', 'organizer', 'store', 'mixed'],
    };
  }
}
