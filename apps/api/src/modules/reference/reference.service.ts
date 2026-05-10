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
        'pending',
        'accepted',
        'declined',
        'cancelled',
      ],
      complaintType: [
        'no_show',
        'late_cancel',
        'bad_behavior',
        'court_issue',
        'other',
      ],
      complaintStatus: [
        'pending',
        'in_review',
        'resolved',
        'rejected',
      ],
      notificationType: [
        'verification_submitted',
        'verification_approved',
        'verification_rejected',
        'verification_needs_correction',
        'booking_created',
        'booking_confirmed',
        'booking_rejected',
        'booking_cancelled',
        'booking_completed',
        'match_request_created',
        'match_request_accepted',
        'match_request_declined',
        'match_request_cancelled',
        'match_booking_created',
        'complaint_created',
        'complaint_status_updated',
      ],
      notificationRelatedEntityType: [
        'verification_request',
        'booking_request',
        'match_request',
        'complaint',
      ],
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
