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
  verified: { label: 'Подтвержден', tone: 'success' },
  rejected: { label: 'Отклонен', tone: 'danger' },
  suspended: { label: 'Приостановлен', tone: 'danger' },
  archived: { label: 'В архиве', tone: 'neutral' },
};

const playerStatuses: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  active: { label: 'Активен', tone: 'success' },
  limited: { label: 'Ограничен', tone: 'warning' },
  blocked: { label: 'Заблокирован', tone: 'danger' },
};

const roles: Record<string, string> = {
  player: 'Игрок',
  partner: 'Партнер',
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
