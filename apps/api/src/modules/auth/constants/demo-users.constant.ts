export const DEMO_USERS = {
  'demo-player': {
    phone: '+79990000001',
    label: 'Demo player',
  },
  'demo-partner': {
    phone: '+79990000002',
    label: 'Demo partner',
  },
  'demo-admin': {
    phone: '+79990000003',
    label: 'Demo admin',
  },
  'review-partner': {
    phone: '+79990000004',
    label: 'Review partner',
  },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;
