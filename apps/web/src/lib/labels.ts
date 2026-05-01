'use client';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

const verificationRequestStatuses: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  submitted: { label: 'На проверке', tone: 'warning' },
  in_review: { label: 'На рассмотрении', tone: 'warning' },
  approved: { label: 'Подтверждена', tone: 'success' },
  rejected: { label: 'Отклонена', tone: 'danger' },
  needs_correction: { label: 'Требуются уточнения', tone: 'warning' },
};

const partnerVerificationStatuses: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  pending_verification: { label: 'На проверке', tone: 'warning' },
  verified: { label: 'Подтверждён', tone: 'success' },
  rejected: { label: 'Отклонён', tone: 'danger' },
  suspended: { label: 'Приостановлен', tone: 'danger' },
  archived: { label: 'В архиве', tone: 'neutral' },
};

const bookingRequestStatuses: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  pending: { label: 'Ожидает подтверждения', tone: 'warning' },
  confirmed: { label: 'Подтверждена', tone: 'success' },
  rejected: { label: 'Отклонена', tone: 'danger' },
  cancelled_by_player: { label: 'Отменена игроком', tone: 'neutral' },
  cancelled_by_partner: { label: 'Отменена партнёром', tone: 'danger' },
  expired: { label: 'Истекла', tone: 'danger' },
  completed: { label: 'Завершена', tone: 'success' },
};

const matchRequestStatuses: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'Ожидает ответа', tone: 'warning' },
  accepted: { label: 'Принят', tone: 'success' },
  declined: { label: 'Отклонён', tone: 'danger' },
  cancelled: { label: 'Отменён', tone: 'neutral' },
};

const matchRequestFormats: Record<string, string> = {
  singles: 'Одиночная игра',
  doubles: 'Парная игра',
};

const complaintStatuses: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'На рассмотрении', tone: 'warning' },
  in_review: { label: 'В работе', tone: 'warning' },
  resolved: { label: 'Решено', tone: 'success' },
  rejected: { label: 'Отклонено', tone: 'danger' },
};

const complaintTypes: Record<string, string> = {
  no_show: 'Не пришёл на игру',
  late_cancel: 'Поздняя отмена',
  bad_behavior: 'Плохое поведение',
  court_issue: 'Проблема с кортом',
  other: 'Другое',
};

const playerStatuses: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  active: { label: 'Активен', tone: 'success' },
  limited: { label: 'Ограничен', tone: 'warning' },
  blocked: { label: 'Заблокирован', tone: 'danger' },
};

const roles: Record<string, string> = {
  player: 'Игрок',
  partner: 'Партнёр',
  admin: 'Администратор',
  superadmin: 'Суперадминистратор',
};

const partnerTypes: Record<string, string> = {
  club: 'Клуб',
  school: 'Школа',
  organizer: 'Организатор',
  store: 'Магазин',
  mixed: 'Смешанный формат',
};

const auditActions: Record<string, string> = {
  'venue.created': 'Создана площадка',
  'venue.updated': 'Обновлена площадка',
  'court.created': 'Создан корт',
  'court.updated': 'Обновлён корт',
  'booking_request.created': 'Создана заявка на бронирование',
  'booking_request.confirmed': 'Заявка подтверждена',
  'booking_request.rejected': 'Заявка отклонена',
  'booking_request.cancelled_by_player': 'Заявка отменена игроком',
  'booking_request.cancelled_by_partner': 'Заявка отменена партнёром',
  'booking_request.completed': 'Заявка завершена',
  'verification_request.draft_created': 'Создан черновик заявки',
  'verification_request.submitted': 'Заявка отправлена',
  'verification_request.approved': 'Заявка подтверждена',
  'verification_request.rejected': 'Заявка отклонена',
  'verification_request.needs_correction': 'Запрошены уточнения',
};

const documentTypes: Record<string, string> = {
  registration_certificate: 'Регистрационный документ',
  tax_document: 'Налоговый документ',
  charter: 'Учредительный документ',
  other: 'Другой документ',
};

export function formatVerificationRequestStatus(status: string) {
  return verificationRequestStatuses[status]?.label ?? status;
}

export function getVerificationRequestStatusTone(status: string) {
  return verificationRequestStatuses[status]?.tone ?? 'neutral';
}

export function formatPartnerVerificationStatus(status: string) {
  return partnerVerificationStatuses[status]?.label ?? status;
}

export function getPartnerVerificationStatusTone(status: string) {
  return partnerVerificationStatuses[status]?.tone ?? 'neutral';
}

export function formatBookingRequestStatus(status: string) {
  return bookingRequestStatuses[status]?.label ?? status;
}

export function getBookingRequestStatusTone(status: string) {
  return bookingRequestStatuses[status]?.tone ?? 'neutral';
}

export function formatMatchRequestStatus(status: string) {
  return matchRequestStatuses[status]?.label ?? status;
}

export function getMatchRequestStatusTone(status: string) {
  return matchRequestStatuses[status]?.tone ?? 'neutral';
}

export function formatMatchRequestFormat(format: string) {
  return matchRequestFormats[format] ?? format;
}

export function formatComplaintStatus(status: string) {
  return complaintStatuses[status]?.label ?? status;
}

export function getComplaintStatusTone(status: string) {
  return complaintStatuses[status]?.tone ?? 'neutral';
}

export function formatComplaintType(type: string) {
  return complaintTypes[type] ?? type;
}

export function formatPlayerStatus(status: string) {
  return playerStatuses[status]?.label ?? status;
}

export function getPlayerStatusTone(status: string) {
  return playerStatuses[status]?.tone ?? 'neutral';
}

export function formatRole(role: string) {
  return roles[role] ?? role;
}

export function formatPartnerType(type: string) {
  return partnerTypes[type] ?? type;
}

export function formatAuditAction(action: string) {
  return auditActions[action] ?? action;
}

export function formatDocumentType(type: string) {
  return documentTypes[type] ?? type;
}

export function formatDateTime(value: string | null, fallback = 'Не указано') {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value: string | null, fallback = 'Не указано') {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
  }).format(date);
}
