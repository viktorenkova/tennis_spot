'use client';

import { DemoSession, hasRole } from './session';

export type NotificationLinkSource = {
  type: string;
  relatedEntityType:
    | 'verification_request'
    | 'booking_request'
    | 'match_request'
    | 'complaint'
    | null;
  relatedEntityId: string | null;
};

export type NotificationLinkTarget = {
  href: string;
  label: string;
};

export function resolveNotificationLink(
  notification: NotificationLinkSource,
  session: DemoSession | null,
): NotificationLinkTarget | null {
  const isAdmin = hasRole(session, 'admin') || hasRole(session, 'superadmin');
  const isPartner = hasRole(session, 'partner');

  if (notification.relatedEntityType === 'verification_request') {
    if (notification.type === 'verification_submitted' && notification.relatedEntityId) {
      return isAdmin
        ? {
            href: `/admin/verification-requests/${notification.relatedEntityId}`,
            label: 'Открыть заявку на верификацию',
          }
        : {
            href: '/me/partner/verification',
            label: 'Открыть верификацию партнёра',
          };
    }

    return {
      href: '/me/partner/verification',
      label: 'Открыть верификацию партнёра',
    };
  }

  if (notification.relatedEntityType === 'booking_request' && notification.relatedEntityId) {
    if (notification.type === 'booking_created' && isPartner) {
      return {
        href: `/me/partner/booking-requests?bookingRequestId=${notification.relatedEntityId}`,
        label: 'Открыть входящую заявку',
      };
    }

    return {
      href: `/booking-requests?bookingRequestId=${notification.relatedEntityId}`,
      label: 'Открыть заявку на бронь',
    };
  }

  if (notification.relatedEntityType === 'match_request' && notification.relatedEntityId) {
    return {
      href: `/match-requests?matchRequestId=${notification.relatedEntityId}`,
      label: 'Открыть вызов на игру',
    };
  }

  if (notification.relatedEntityType === 'complaint' && notification.relatedEntityId) {
    if (notification.type === 'complaint_created' && isAdmin) {
      return {
        href: `/admin/complaints?complaintId=${notification.relatedEntityId}`,
        label: 'Открыть жалобу в модерации',
      };
    }

    return {
      href: `/complaints?complaintId=${notification.relatedEntityId}`,
      label: 'Открыть жалобу',
    };
  }

  return null;
}
