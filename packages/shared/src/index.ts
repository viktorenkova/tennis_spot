export const USER_STATUSES = ['pending', 'active', 'blocked', 'deleted'] as const;
export const PLAYER_PROFILE_STATUSES = ['draft', 'active', 'limited', 'blocked'] as const;
export const PARTNER_VERIFICATION_STATUSES = [
  'draft',
  'pending_verification',
  'verified',
  'rejected',
  'suspended',
  'archived',
] as const;
export const BOOKING_REQUEST_STATUSES = [
  'draft',
  'pending',
  'confirmed',
  'rejected',
  'cancelled_by_player',
  'cancelled_by_partner',
  'expired',
  'completed',
] as const;
export const MATCH_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'cancelled',
] as const;
export const COMPLAINT_TYPES = [
  'no_show',
  'late_cancel',
  'bad_behavior',
  'court_issue',
  'other',
] as const;
export const COMPLAINT_STATUSES = [
  'pending',
  'in_review',
  'resolved',
  'rejected',
] as const;
export const NOTIFICATION_TYPES = [
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
] as const;
export const NOTIFICATION_RELATED_ENTITY_TYPES = [
  'verification_request',
  'booking_request',
  'match_request',
  'complaint',
] as const;
export const TOURNAMENT_STATUSES = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'ongoing',
  'completed',
  'archived',
  'cancelled',
] as const;
export const TOURNAMENT_REGISTRATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'waitlisted',
  'cancelled',
] as const;
export const VERIFICATION_REQUEST_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'needs_correction',
] as const;
export const ROLE_KEYS = ['player', 'partner', 'admin', 'superadmin'] as const;
export const PARTNER_TYPE_KEYS = ['club', 'school', 'organizer', 'store', 'mixed'] as const;

export const STARTER_CITIES = [
  {
    slug: 'moscow',
    name: 'Москва',
    districts: [
      'Центральный административный округ',
      'Северный административный округ',
      'Западный административный округ',
    ],
  },
  {
    slug: 'saint-petersburg',
    name: 'Санкт-Петербург',
    districts: [
      'Адмиралтейский район',
      'Петроградский район',
      'Приморский район',
    ],
  },
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
export type PlayerProfileStatus = (typeof PLAYER_PROFILE_STATUSES)[number];
export type PartnerVerificationStatus = (typeof PARTNER_VERIFICATION_STATUSES)[number];
export type BookingRequestStatus = (typeof BOOKING_REQUEST_STATUSES)[number];
export type MatchRequestStatus = (typeof MATCH_REQUEST_STATUSES)[number];
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationRelatedEntityType =
  (typeof NOTIFICATION_RELATED_ENTITY_TYPES)[number];
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export type TournamentRegistrationStatus =
  (typeof TOURNAMENT_REGISTRATION_STATUSES)[number];
export type VerificationRequestStatus = (typeof VERIFICATION_REQUEST_STATUSES)[number];
export type RoleKey = (typeof ROLE_KEYS)[number];
export type PartnerTypeKey = (typeof PARTNER_TYPE_KEYS)[number];
