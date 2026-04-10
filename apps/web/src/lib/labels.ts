const verificationRequestStatuses: Record<string, string> = {
  draft: 'Черновик',
  submitted: 'Отправлена',
  in_review: 'На рассмотрении',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  needs_correction: 'Требует исправлений',
};

const partnerVerificationStatuses: Record<string, string> = {
  draft: 'Черновик',
  pending_verification: 'На проверке',
  verified: 'Верифицирован',
  rejected: 'Отклонен',
  suspended: 'Приостановлен',
  archived: 'В архиве',
};

const playerStatuses: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активен',
  limited: 'Ограничен',
  blocked: 'Заблокирован',
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
  'verification_request.approved': 'Заявка одобрена',
  'verification_request.rejected': 'Заявка отклонена',
  'verification_request.needs_correction': 'Запрошены исправления',
};

const documentTypes: Record<string, string> = {
  registration_certificate: 'Регистрационный документ',
};

export function formatVerificationRequestStatus(status: string) {
  return verificationRequestStatuses[status] ?? status;
}

export function formatPartnerVerificationStatus(status: string) {
  return partnerVerificationStatuses[status] ?? status;
}

export function formatPlayerStatus(status: string) {
  return playerStatuses[status] ?? status;
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
