export const SCHEDULE_EXCEPTION_TYPES = [
  'closed',
  'custom_hours',
  'blocked',
  'custom_price',
] as const;

export type ScheduleExceptionTypeValue = (typeof SCHEDULE_EXCEPTION_TYPES)[number];
