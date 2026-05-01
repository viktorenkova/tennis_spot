import { randomUUID } from 'node:crypto';

type RoleKey = 'player' | 'partner' | 'admin' | 'superadmin';
type UserStatus = 'pending' | 'active' | 'blocked' | 'deleted';
type PlayerProfileStatus = 'draft' | 'active' | 'limited' | 'blocked';
type PartnerVerificationStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'archived';
type VerificationRequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_correction';
type BookingRequestStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled_by_player'
  | 'cancelled_by_partner'
  | 'expired'
  | 'completed';
type ScheduleExceptionType = 'closed' | 'custom_hours' | 'blocked' | 'custom_price';
type MatchRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
type MatchRequestFormat = 'singles' | 'doubles';
type NotificationType =
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_needs_correction'
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'match_request_created'
  | 'match_request_accepted'
  | 'match_request_declined'
  | 'match_request_cancelled'
  | 'match_booking_created';
type NotificationRelatedEntityType = 'verification_request' | 'booking_request' | 'match_request';

type UserRecord = {
  id: string;
  phone: string;
  email?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type RoleRecord = {
  id: string;
  key: RoleKey;
  name: string;
  description: string;
};

type UserRoleRecord = {
  id: string;
  userId: string;
  roleId: string;
  createdAt: Date;
};

type UserSettingRecord = {
  id: string;
  userId: string;
  locale: string;
  timezone: string;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UserSessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuthPhoneChallengeRecord = {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

type PlayerProfileRecord = {
  id: string;
  userId: string;
  status: PlayerProfileStatus;
  firstName: string;
  lastName: string;
  bio: string | null;
  ntrpSelfRating: number | null;
  cityId: string | null;
  districtId: string | null;
  avatarFileId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PlayerVisibilitySettingRecord = {
  id: string;
  playerProfileId: string;
  profileVisibleToAuthenticated: boolean;
  showPhone: boolean;
  showCity: boolean;
  showAvailability: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PlayerPlayPreferenceRecord = {
  id: string;
  playerProfileId: string;
  preferredFormats: string[];
  preferredDays: string[];
  preferredTimes: string[];
  preferredCityId: string | null;
  preferredDistrictId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PartnerTypeRecord = {
  id: string;
  key: 'club' | 'school' | 'organizer' | 'store' | 'mixed';
  name: string;
};

type PartnerProfileRecord = {
  id: string;
  ownerUserId: string;
  legalName: string;
  brandName: string | null;
  description: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  taxId?: string | null;
  legalAddress?: string | null;
  actualAddress?: string | null;
  verificationStatus: PartnerVerificationStatus;
  cityId: string | null;
  districtId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CityRecord = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type DistrictRecord = {
  id: string;
  cityId: string;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type FileRecord = {
  id: string;
  originalName: string;
  storageBucket: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string | null;
  createdAt: Date;
};

type AddressRecord = {
  id: string;
  cityId: string | null;
  districtId: string | null;
  line1: string;
  line2: string | null;
  postalCode: string | null;
  accessNotes: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type VenueRecord = {
  id: string;
  partnerProfileId: string;
  addressId: string;
  name: string;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CourtRecord = {
  id: string;
  venueId: string;
  name: string;
  surfaceType: string;
  isIndoor: boolean;
  hasLighting: boolean;
  isActive: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type PartnerProfileTypeRecord = {
  id: string;
  partnerProfileId: string;
  partnerTypeId: string;
  createdAt: Date;
};

type VerificationRequestRecord = {
  id: string;
  partnerProfileId: string;
  status: VerificationRequestStatus;
  comment: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type VerificationDocumentRecord = {
  id: string;
  verificationRequestId: string;
  fileId: string;
  documentType: string;
  createdAt: Date;
};

type BookingRequestRecord = {
  id: string;
  playerProfileId: string;
  partnerProfileId: string;
  venueId: string;
  courtId: string;
  relatedMatchRequestId: string | null;
  bookingDate: Date;
  timeFrom: string;
  timeTo: string;
  durationMinutes: number;
  playersCount: number;
  commentFromPlayer: string | null;
  commentFromPartner: string | null;
  status: BookingRequestStatus;
  submittedAt: Date | null;
  respondedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingRequestStatusHistoryRecord = {
  id: string;
  bookingRequestId: string;
  oldStatus: BookingRequestStatus | null;
  newStatus: BookingRequestStatus;
  changedByUserId: string | null;
  comment: string | null;
  createdAt: Date;
};

type MatchRequestRecord = {
  id: string;
  initiatorId: string;
  opponentId: string;
  status: MatchRequestStatus;
  proposedDate: Date;
  proposedTimeFrom: string;
  proposedTimeTo: string;
  format: MatchRequestFormat;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CourtScheduleTemplateRecord = {
  id: string;
  courtId: string;
  weekday: number;
  timeFrom: string;
  timeTo: string;
  slotDurationMinutes: number;
  isOpen: boolean;
  basePrice: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type CourtScheduleExceptionRecord = {
  id: string;
  courtId: string;
  date: Date;
  exceptionType: ScheduleExceptionType;
  timeFrom: string | null;
  timeTo: string | null;
  customPrice: number | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditLogRecord = {
  id: string;
  actorUserId: string | null;
  action: string;
  targetEntity: string;
  targetId: string;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType: NotificationRelatedEntityType | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
};

export class InMemoryPrismaService {
  private users: UserRecord[] = [];
  private roles: RoleRecord[] = [];
  private userRoles: UserRoleRecord[] = [];
  private userSettings: UserSettingRecord[] = [];
  private userSessions: UserSessionRecord[] = [];
  private authPhoneChallenges: AuthPhoneChallengeRecord[] = [];
  private cities: CityRecord[] = [];
  private districts: DistrictRecord[] = [];
  private files: FileRecord[] = [];
  private playerProfiles: PlayerProfileRecord[] = [];
  private playerVisibilitySettings: PlayerVisibilitySettingRecord[] = [];
  private playerPlayPreferences: PlayerPlayPreferenceRecord[] = [];
  private partnerTypes: PartnerTypeRecord[] = [];
  private partnerProfiles: PartnerProfileRecord[] = [];
  private partnerProfileTypes: PartnerProfileTypeRecord[] = [];
  private addresses: AddressRecord[] = [];
  private venues: VenueRecord[] = [];
  private courts: CourtRecord[] = [];
  private verificationRequests: VerificationRequestRecord[] = [];
  private verificationDocuments: VerificationDocumentRecord[] = [];
  private bookingRequests: BookingRequestRecord[] = [];
  private bookingRequestStatusHistoryEntries: BookingRequestStatusHistoryRecord[] = [];
  private matchRequests: MatchRequestRecord[] = [];
  private courtScheduleTemplates: CourtScheduleTemplateRecord[] = [];
  private courtScheduleExceptions: CourtScheduleExceptionRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private notifications: NotificationRecord[] = [];

  constructor() {
    this.seed();
  }

  $transaction = async <T>(callback: (tx: this) => Promise<T>) => callback(this);

  authPhoneChallenge: any = {
    create: async (_args: any) => null,
    findFirst: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  role: any = {
    findUnique: async (_args: any) => null,
  };

  city: any = {
    findUnique: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  district: any = {
    findUnique: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  user: any = {
    findUnique: async (_args: any) => null,
    findMany: async (_args: any) => [],
    create: async (_args: any) => null,
    upsert: async (_args: any) => null,
  };

  userSetting: any = {
    create: async (_args: any) => null,
    upsert: async (_args: any) => null,
    findUnique: async (_args: any) => null,
  };

  userSession: any = {
    upsert: async (_args: any) => null,
    findUnique: async (_args: any) => null,
    updateMany: async (_args: any) => null,
  };

  userRole: any = {
    findFirst: async (_args: any) => null,
    create: async (_args: any) => null,
    upsert: async (_args: any) => null,
  };

  playerProfile: any = {
    findUnique: async (_args: any) => null,
    create: async (_args: any) => null,
    update: async (_args: any) => null,
    findFirst: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  playerVisibilitySetting: any = {
    upsert: async (_args: any) => null,
  };

  playerPlayPreference: any = {
    upsert: async (_args: any) => null,
  };

  partnerType: any = {
    findUnique: async (_args: any) => null,
  };

  partnerProfile: any = {
    findUnique: async (_args: any) => null,
    create: async (_args: any) => null,
    update: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  partnerProfileType: any = {
    deleteMany: async (_args: any) => ({ count: 0 }),
    create: async (_args: any) => null,
  };

  address: any = {
    create: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  venue: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  court: any = {
    create: async (_args: any) => null,
    update: async (_args: any) => null,
    findFirst: async (_args: any) => null,
    findUnique: async (_args: any) => null,
  };

  courtScheduleTemplate: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    update: async (_args: any) => null,
    delete: async (_args: any) => null,
  };

  courtScheduleException: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    update: async (_args: any) => null,
    delete: async (_args: any) => null,
  };

  verificationRequest: any = {
    findFirst: async (_args: any) => null,
    create: async (_args: any) => null,
    update: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findUnique: async (_args: any) => null,
  };

  bookingRequest: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    findUnique: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  bookingRequestStatusHistory: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  matchRequest: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    findUnique: async (_args: any) => null,
    update: async (_args: any) => null,
  };

  auditLog: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  notification: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findFirst: async (_args: any) => null,
    update: async (_args: any) => null,
    updateMany: async (_args: any) => ({ count: 0 }),
    count: async (_args: any) => 0,
  };

  file: any = {
    create: async (args: any) => {
      const file: FileRecord = {
        id: randomUUID(),
        createdAt: new Date(),
        originalName: args.data.originalName,
        storageBucket: args.data.storageBucket,
        storageKey: args.data.storageKey,
        mimeType: args.data.mimeType,
        sizeBytes: args.data.sizeBytes,
        uploadedByUserId: args.data.uploadedByUserId ?? null,
      };

      this.files.push(file);
      return file;
    },
  };

  verificationDocument: any = {
    create: async ({ data, include }: any) => {
      const document: VerificationDocumentRecord = {
        id: randomUUID(),
        verificationRequestId: data.verificationRequestId,
        fileId: data.fileId,
        documentType: data.documentType,
        createdAt: new Date(),
      };

      this.verificationDocuments.push(document);

      return {
        ...document,
        ...(include?.file
          ? {
              file: this.files.find((file) => file.id === document.fileId) ?? null,
            }
          : {}),
      };
    },
  };

  private seed() {
    const now = new Date();
    const roleRecords: RoleRecord[] = [
      { id: randomUUID(), key: 'player', name: 'Player', description: 'Player' },
      { id: randomUUID(), key: 'partner', name: 'Partner', description: 'Partner' },
      { id: randomUUID(), key: 'admin', name: 'Admin', description: 'Admin' },
      { id: randomUUID(), key: 'superadmin', name: 'Superadmin', description: 'Superadmin' },
    ];

    const partnerTypeRecords: PartnerTypeRecord[] = [
      { id: randomUUID(), key: 'club', name: 'Club' },
      { id: randomUUID(), key: 'school', name: 'School' },
      { id: randomUUID(), key: 'organizer', name: 'Organizer' },
      { id: randomUUID(), key: 'store', name: 'Store' },
      { id: randomUUID(), key: 'mixed', name: 'Mixed' },
    ];

    this.roles.push(...roleRecords);
    this.partnerTypes.push(...partnerTypeRecords);

    const moscow: CityRecord = {
      id: randomUUID(),
      slug: 'moscow',
      name: 'Москва',
      createdAt: now,
      updatedAt: now,
    };
    const saintPetersburg: CityRecord = {
      id: randomUUID(),
      slug: 'saint-petersburg',
      name: 'Санкт-Петербург',
      createdAt: now,
      updatedAt: now,
    };

    this.cities.push(moscow, saintPetersburg);
    this.districts.push(
      {
        id: randomUUID(),
        cityId: moscow.id,
        slug: 'cao',
        name: 'Центральный административный округ',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        cityId: moscow.id,
        slug: 'sao',
        name: 'Северный административный округ',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        cityId: saintPetersburg.id,
        slug: 'primorskiy',
        name: 'Приморский район',
        createdAt: now,
        updatedAt: now,
      },
    );

    const demoPlayer = this.createSeedUser('+79990000001', ['player']);
    const demoPartner = this.createSeedUser('+79990000002', ['player', 'partner']);
    const demoAdmin = this.createSeedUser('+79990000003', ['admin']);
    const reviewPartner = this.createSeedUser('+79990000004', ['player', 'partner']);

    const reviewPartnerProfile: PartnerProfileRecord = {
      id: randomUUID(),
      ownerUserId: reviewPartner.id,
      legalName: 'Review Club LLC',
      brandName: 'Review Club',
      description: 'Seeded partner profile for review flow.',
      contactPhone: '+79990000004',
      contactEmail: 'review-partner@example.test',
      taxId: null,
      legalAddress: null,
      actualAddress: null,
      verificationStatus: 'pending_verification',
      cityId: moscow.id,
      districtId: this.districts[0].id,
      createdAt: now,
      updatedAt: now,
    };

    this.partnerProfiles.push(reviewPartnerProfile);
    this.partnerProfileTypes.push({
      id: randomUUID(),
      partnerProfileId: reviewPartnerProfile.id,
      partnerTypeId: partnerTypeRecords[0].id,
      createdAt: new Date(),
    });

    const reviewRequest: VerificationRequestRecord = {
      id: randomUUID(),
      partnerProfileId: reviewPartnerProfile.id,
      status: 'submitted',
      comment: null,
      submittedAt: now,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.verificationRequests.push(reviewRequest);
    const seededFile: FileRecord = {
      id: randomUUID(),
      originalName: 'inn.pdf',
      storageBucket: 'local-demo',
      storageKey: 'demo/review-partner/inn.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedByUserId: reviewPartner.id,
      createdAt: now,
    };
    this.files.push(seededFile);
    this.verificationDocuments.push({
      id: randomUUID(),
      verificationRequestId: reviewRequest.id,
      fileId: seededFile.id,
      documentType: 'registration_certificate',
      createdAt: now,
    });
    this.auditLogs.push({
      id: randomUUID(),
      actorUserId: reviewPartner.id,
      action: 'verification_request.seeded',
      targetEntity: 'verification_request',
      targetId: reviewRequest.id,
      comment: 'Seeded pending request.',
      metadata: { status: 'submitted' },
      createdAt: now,
    });

    void demoPlayer;
    void demoPartner;
    void demoAdmin;

    this.buildDelegates();
  }

  private buildDelegates() {
    this.authPhoneChallenge.create = async ({ data }: any) => {
      const challenge: AuthPhoneChallengeRecord = {
        id: randomUUID(),
        phone: data.phone,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
        consumedAt: null,
        createdAt: new Date(),
      };

      this.authPhoneChallenges.push(challenge);
      return challenge;
    };

    this.authPhoneChallenge.findFirst = async ({ where }: any) =>
      this.authPhoneChallenges.find((challenge) => {
        if (where.id && challenge.id !== where.id) {
          return false;
        }

        if (where.phone && challenge.phone !== where.phone) {
          return false;
        }

        if (where.consumedAt === null && challenge.consumedAt !== null) {
          return false;
        }

        if (where.expiresAt?.gt && !(challenge.expiresAt > where.expiresAt.gt)) {
          return false;
        }

        return true;
      }) ?? null;

    this.authPhoneChallenge.update = async ({ where, data }: any) => {
      const challenge = this.authPhoneChallenges.find((item) => item.id === where.id);

      if (!challenge) {
        return null;
      }

      Object.assign(challenge, data);
      return challenge;
    };

    this.role.findUnique = async ({ where }: any) => {
      if (where.key) {
        return this.roles.find((role) => role.key === where.key) ?? null;
      }

      if (where.id) {
        return this.roles.find((role) => role.id === where.id) ?? null;
      }

      return null;
    };

    this.city.findUnique = async ({ where }: any) =>
      this.cities.find((city) => city.id === where.id || city.slug === where.slug) ?? null;

    this.city.findMany = async ({ include, orderBy }: any = {}) => {
      const items = [...this.cities];

      if (orderBy?.name === 'asc') {
        items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      }

      return items.map((city) => ({
        ...city,
        ...(include?.districts
          ? {
              districts: this.districts
                .filter((district) => district.cityId === city.id)
                .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
            }
          : {}),
      }));
    };

    this.district.findUnique = async ({ where }: any) =>
      this.districts.find(
        (district) => district.id === where.id || district.slug === where.slug,
      ) ?? null;

    this.district.findMany = async ({ where, orderBy }: any = {}) => {
      let items = [...this.districts];

      if (where?.cityId) {
        items = items.filter((district) => district.cityId === where.cityId);
      }

      if (orderBy?.name === 'asc') {
        items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      }

      return items;
    };

    this.user.findUnique = async ({ where, include }: any) => {
      const user =
        this.users.find((item) => {
          if (where.id) {
            return item.id === where.id;
          }

          if (where.phone) {
            return item.phone === where.phone;
          }

          return false;
        }) ?? null;

      if (!user) {
        return null;
      }

      return this.withUserIncludes(user, include);
    };

    this.user.findMany = async ({ where, select }: any = {}) => {
      let items = [...this.users];

      if (where?.roles?.some?.role?.key?.in) {
        const roleKeys = where.roles.some.role.key.in as RoleKey[];
        const roleIds = this.roles
          .filter((role) => roleKeys.includes(role.key))
          .map((role) => role.id);
        const userIds = this.userRoles
          .filter((userRole) => roleIds.includes(userRole.roleId))
          .map((userRole) => userRole.userId);

        items = items.filter((user) => userIds.includes(user.id));
      }

      if (select?.id) {
        return items.map((user) => ({ id: user.id }));
      }

      return items;
    };

    this.user.create = async ({ data, include }: any) => {
      const user: UserRecord = {
        id: randomUUID(),
        phone: data.phone,
        email: data.email ?? null,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      this.users.push(user);

      if (data.settings?.create) {
        await this.userSetting.create({
          data: {
            userId: user.id,
          },
        });
      }

      if (data.roles?.create) {
        await this.userRole.create({
          data: {
            userId: user.id,
            roleId: data.roles.create.roleId,
          },
        });
      }

      return this.withUserIncludes(user, include);
    };

    this.user.upsert = async ({ where, update, create }: any) => {
      const existing = this.users.find((user) => user.phone === where.phone);

      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }

      const created: UserRecord = {
        id: randomUUID(),
        phone: create.phone,
        email: create.email ?? null,
        status: create.status,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      this.users.push(created);
      return created;
    };

    this.userSetting.create = async ({ data }: any) => {
      const setting: UserSettingRecord = {
        id: randomUUID(),
        userId: data.userId,
        locale: 'ru',
        timezone: 'Europe/Moscow',
        notificationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.userSettings.push(setting);
      return setting;
    };

    this.userSetting.upsert = async ({ where, update, create }: any) => {
      const existing = this.userSettings.find((setting) => setting.userId === where.userId);

      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }

      const created: UserSettingRecord = {
        id: randomUUID(),
        userId: create.userId,
        locale: create.locale ?? 'ru',
        timezone: create.timezone ?? 'Europe/Moscow',
        notificationsEnabled: create.notificationsEnabled ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.userSettings.push(created);
      return created;
    };

    this.userSetting.findUnique = async ({ where }: any) =>
      this.userSettings.find((setting) => setting.userId === where.userId) ?? null;

    this.userSession.upsert = async ({ where, update, create }: any) => {
      const existing = this.userSessions.find((session) => session.id === where.id);

      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }

      const created: UserSessionRecord = {
        id: create.id,
        userId: create.userId,
        refreshTokenHash: create.refreshTokenHash,
        expiresAt: create.expiresAt,
        revokedAt: create.revokedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.userSessions.push(created);
      return created;
    };

    this.userSession.findUnique = async ({ where, include }: any) => {
      const session = this.userSessions.find((item) => item.id === where.id) ?? null;

      if (!session) {
        return null;
      }

      if (include?.user) {
        return {
          ...session,
          user: this.withUserIncludes(
            this.users.find((user) => user.id === session.userId)!,
            include.user.include,
          ),
        };
      }

      return session;
    };

    this.userSession.updateMany = async ({ where, data }: any) => {
      let count = 0;

      for (const session of this.userSessions) {
        if (session.id !== where.id) {
          continue;
        }

        if (where.revokedAt === null && session.revokedAt !== null) {
          continue;
        }

        Object.assign(session, data, { updatedAt: new Date() });
        count += 1;
      }

      return { count };
    };

    this.userRole.findFirst = async ({ where }: any) =>
      this.userRoles.find(
        (userRole) => userRole.userId === where.userId && userRole.roleId === where.roleId,
      ) ?? null;

    this.userRole.create = async ({ data }: any) => {
      const userRole: UserRoleRecord = {
        id: randomUUID(),
        userId: data.userId,
        roleId: data.roleId,
        createdAt: new Date(),
      };

      this.userRoles.push(userRole);
      return userRole;
    };

    this.userRole.upsert = async ({ where, create }: any) => {
      const existing =
        this.userRoles.find(
          (userRole) =>
            userRole.userId === where.userId_roleId.userId &&
            userRole.roleId === where.userId_roleId.roleId,
        ) ?? null;

      if (existing) {
        return existing;
      }

      return this.userRole.create({ data: create });
    };

    this.playerProfile.findUnique = async ({ where, include }: any) => {
      const profile =
        this.playerProfiles.find((item) => {
          if (where.userId) {
            return item.userId === where.userId;
          }

          if (where.id) {
            return item.id === where.id;
          }

          return false;
        }) ?? null;

      if (!profile) {
        return null;
      }

      return this.withPlayerProfileIncludes(profile, include);
    };

    this.playerProfile.create = async ({ data, include }: any) => {
      const profile: PlayerProfileRecord = {
        id: randomUUID(),
        userId: data.userId,
        status: data.status,
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio ?? null,
        ntrpSelfRating: data.ntrpSelfRating ?? null,
        cityId: data.cityId ?? null,
        districtId: data.districtId ?? null,
        avatarFileId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.playerProfiles.push(profile);

      if (data.visibilitySettings?.create) {
        this.playerVisibilitySettings.push({
          id: randomUUID(),
          playerProfileId: profile.id,
          profileVisibleToAuthenticated: true,
          showPhone: false,
          showCity: true,
          showAvailability: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (data.playPreferences?.create) {
        this.playerPlayPreferences.push({
          id: randomUUID(),
          playerProfileId: profile.id,
          preferredFormats: [],
          preferredDays: [],
          preferredTimes: [],
          preferredCityId: null,
          preferredDistrictId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return this.withPlayerProfileIncludes(profile, include);
    };

    this.playerProfile.update = async ({ where, data, include }: any) => {
      const profile = this.playerProfiles.find((item) => item.userId === where.userId);

      if (!profile) {
        return null;
      }

      Object.assign(profile, data, { updatedAt: new Date() });
      return this.withPlayerProfileIncludes(profile, include);
    };

    this.playerProfile.findFirst = async ({ where, include }: any) => {
      const profile =
        this.playerProfiles.find((item) => {
          if (where.userId && item.userId !== where.userId) {
            return false;
          }

          if (where.id && item.id !== where.id) {
            return false;
          }

          if (where.status && item.status !== where.status) {
            return false;
          }

          if (where.user?.is?.status) {
            const user = this.users.find((candidate) => candidate.id === item.userId);

            if (user?.status !== where.user.is.status) {
              return false;
            }
          }

          return true;
        }) ?? null;

      return profile ? this.withPlayerProfileIncludes(profile, include) : null;
    };

    this.playerProfile.findMany = async ({ where, include, orderBy }: any = {}) => {
      let items = [...this.playerProfiles];

      if (where?.status) {
        items = items.filter((profile) => profile.status === where.status);
      }

      if (where?.cityId) {
        items = items.filter((profile) => profile.cityId === where.cityId);
      }

      if (where?.districtId) {
        items = items.filter((profile) => profile.districtId === where.districtId);
      }

      if (where?.visibilitySettings?.is?.profileVisibleToAuthenticated === true) {
        items = items.filter((profile) => {
          const visibility = this.playerVisibilitySettings.find(
            (setting) => setting.playerProfileId === profile.id,
          );

          return visibility?.profileVisibleToAuthenticated === true;
        });
      }

      if (orderBy?.createdAt === 'desc') {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return items.map((profile) => this.withPlayerProfileIncludes(profile, include));
    };

    this.playerVisibilitySetting.upsert = async ({ where, update, create }: any) => {
      const existing = this.playerVisibilitySettings.find(
        (setting) => setting.playerProfileId === where.playerProfileId,
      );

      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }

      const created = {
        id: randomUUID(),
        playerProfileId: create.playerProfileId,
        profileVisibleToAuthenticated: create.profileVisibleToAuthenticated ?? true,
        showPhone: create.showPhone ?? false,
        showCity: create.showCity ?? true,
        showAvailability: create.showAvailability ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.playerVisibilitySettings.push(created);
      return created;
    };

    this.playerPlayPreference.upsert = async ({ where, update, create }: any) => {
      const existing = this.playerPlayPreferences.find(
        (setting) => setting.playerProfileId === where.playerProfileId,
      );

      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }

      const created = {
        id: randomUUID(),
        playerProfileId: create.playerProfileId,
        preferredFormats: create.preferredFormats ?? [],
        preferredDays: create.preferredDays ?? [],
        preferredTimes: create.preferredTimes ?? [],
        preferredCityId: create.preferredCityId ?? null,
        preferredDistrictId: create.preferredDistrictId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.playerPlayPreferences.push(created);
      return created;
    };

    this.partnerType.findUnique = async ({ where }: any) =>
      this.partnerTypes.find((item) => item.key === where.key || item.id === where.id) ?? null;

    this.partnerProfile.findUnique = async ({ where, include }: any) => {
      const profile =
        this.partnerProfiles.find((item) => {
          if (where.ownerUserId) {
            return item.ownerUserId === where.ownerUserId;
          }

          if (where.id) {
            return item.id === where.id;
          }

          return false;
        }) ?? null;

      return profile ? this.withPartnerProfileIncludes(profile, include) : null;
    };

    this.partnerProfile.create = async ({ data, include }: any) => {
      const profile: PartnerProfileRecord = {
        id: randomUUID(),
        ownerUserId: data.ownerUserId,
        legalName: data.legalName,
        brandName: data.brandName ?? null,
        description: data.description ?? null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        taxId: data.taxId ?? null,
        legalAddress: data.legalAddress ?? null,
        actualAddress: data.actualAddress ?? null,
        verificationStatus: 'draft',
        cityId: data.cityId ?? null,
        districtId: data.districtId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.partnerProfiles.push(profile);

      for (const profileType of data.profileTypes?.create ?? []) {
        this.partnerProfileTypes.push({
          id: randomUUID(),
          partnerProfileId: profile.id,
          partnerTypeId: profileType.partnerTypeId,
          createdAt: new Date(),
        });
      }

      return this.withPartnerProfileIncludes(profile, include);
    };

    this.partnerProfile.update = async ({ where, data, include }: any) => {
      const profile = this.partnerProfiles.find(
        (item) => item.ownerUserId === where.ownerUserId || item.id === where.id,
      );

      if (!profile) {
        return null;
      }

      Object.assign(profile, data, { updatedAt: new Date() });
      return this.withPartnerProfileIncludes(profile, include);
    };

    this.partnerProfile.findMany = async ({ where, include }: any) =>
      this.partnerProfiles
        .filter((profile) => {
          if (where?.verificationStatus) {
            return profile.verificationStatus === where.verificationStatus;
          }

          return true;
        })
        .map((profile) => this.withPartnerProfileIncludes(profile, include));

    this.partnerProfileType.deleteMany = async ({ where }: any) => {
      const before = this.partnerProfileTypes.length;
      this.partnerProfileTypes = this.partnerProfileTypes.filter(
        (item) => item.partnerProfileId !== where.partnerProfileId,
      );

      return { count: before - this.partnerProfileTypes.length };
    };

    this.partnerProfileType.create = async ({ data }: any) => {
      const created = {
        id: randomUUID(),
        partnerProfileId: data.partnerProfileId,
        partnerTypeId: data.partnerTypeId,
        createdAt: new Date(),
      };

      this.partnerProfileTypes.push(created);
      return created;
    };

    this.address.create = async ({ data }: any) => {
      const address: AddressRecord = {
        id: randomUUID(),
        cityId: data.cityId ?? null,
        districtId: data.districtId ?? null,
        line1: data.line1,
        line2: data.line2 ?? null,
        postalCode: data.postalCode ?? null,
        accessNotes: data.accessNotes ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.addresses.push(address);
      return address;
    };

    this.address.update = async ({ where, data }: any) => {
      const address = this.addresses.find((item) => item.id === where.id) ?? null;

      if (!address) {
        return null;
      }

      Object.assign(address, data, { updatedAt: new Date() });
      return address;
    };

    this.venue.create = async ({ data, include }: any) => {
      const venue: VenueRecord = {
        id: randomUUID(),
        partnerProfileId: data.partnerProfileId,
        addressId: data.addressId,
        name: data.name,
        description: data.description ?? null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.venues.push(venue);
      return this.withVenueIncludes(venue, include);
    };

    this.venue.findMany = async ({ where, include, orderBy }: any = {}) => {
      let items = [...this.venues];

      if (where?.partnerProfileId) {
        items = items.filter((venue) => venue.partnerProfileId === where.partnerProfileId);
      }

      if (where?.id) {
        items = items.filter((venue) => venue.id === where.id);
      }

      if (typeof where?.isActive === 'boolean') {
        items = items.filter((venue) => venue.isActive === where.isActive);
      }

      if (where?.partnerProfile?.is?.verificationStatus) {
        items = items.filter((venue) => {
          const partnerProfile = this.partnerProfiles.find(
            (profile) => profile.id === venue.partnerProfileId,
          );

          return (
            partnerProfile?.verificationStatus === where.partnerProfile.is.verificationStatus
          );
        });
      }

      if (where?.partnerProfile?.is?.ownerUserId) {
        items = items.filter((venue) => {
          const partnerProfile = this.partnerProfiles.find(
            (profile) => profile.id === venue.partnerProfileId,
          );

          return partnerProfile?.ownerUserId === where.partnerProfile.is.ownerUserId;
        });
      }

      if (where?.address?.is?.cityId) {
        items = items.filter((venue) => {
          const address = this.addresses.find((item) => item.id === venue.addressId);
          return address?.cityId === where.address.is.cityId;
        });
      }

      if (where?.address?.is?.districtId) {
        items = items.filter((venue) => {
          const address = this.addresses.find((item) => item.id === venue.addressId);
          return address?.districtId === where.address.is.districtId;
        });
      }

      if (orderBy?.createdAt === 'desc') {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return items.map((venue) => this.withVenueIncludes(venue, include));
    };

    this.venue.findFirst = async ({ where, include }: any = {}) => {
      const venues = await this.venue.findMany({ where, include });
      return venues[0] ?? null;
    };

    this.venue.update = async ({ where, data, include }: any) => {
      const venue = this.venues.find((item) => item.id === where.id) ?? null;

      if (!venue) {
        return null;
      }

      Object.assign(venue, data, { updatedAt: new Date() });
      return this.withVenueIncludes(venue, include);
    };

    this.court.create = async ({ data }: any) => {
      const court: CourtRecord = {
        id: randomUUID(),
        venueId: data.venueId,
        name: data.name,
        surfaceType: data.surfaceType,
        isIndoor: data.isIndoor ?? false,
        hasLighting: data.hasLighting ?? false,
        isActive: data.isActive ?? true,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.courts.push(court);
      return court;
    };

    this.court.update = async ({ where, data }: any) => {
      const court = this.courts.find((item) => item.id === where.id) ?? null;

      if (!court) {
        return null;
      }

      Object.assign(court, data, { updatedAt: new Date() });
      return court;
    };

    this.court.findFirst = async ({ where }: any) =>
      this.courts.find((court) => {
        if (where?.id && court.id !== where.id) {
          return false;
        }

        if (where?.venueId && court.venueId !== where.venueId) {
          return false;
        }

        if (typeof where?.isActive === 'boolean' && court.isActive !== where.isActive) {
          return false;
        }

        if (where?.venue?.is?.partnerProfile?.is?.ownerUserId) {
          const venue = this.venues.find((item) => item.id === court.venueId);
          if (!venue) {
            return false;
          }

          const partnerProfile = this.partnerProfiles.find(
            (profile) => profile.id === venue.partnerProfileId,
          );

          return partnerProfile?.ownerUserId === where.venue.is.partnerProfile.is.ownerUserId;
        }

        return true;
      }) ?? null;

    this.court.findUnique = async ({ where, include }: any) => {
      const court = this.courts.find((item) => item.id === where.id) ?? null;

      if (!court) {
        return null;
      }

      return this.withCourtIncludes(court, include);
    };

    this.courtScheduleTemplate.create = async ({ data }: any) => {
      const template: CourtScheduleTemplateRecord = {
        id: randomUUID(),
        courtId: data.courtId,
        weekday: data.weekday,
        timeFrom: data.timeFrom,
        timeTo: data.timeTo,
        slotDurationMinutes: data.slotDurationMinutes,
        isOpen: data.isOpen ?? true,
        basePrice: data.basePrice ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.courtScheduleTemplates.push(template);
      return template;
    };

    this.courtScheduleTemplate.findMany = async ({ where, orderBy }: any = {}) => {
      let items = [...this.courtScheduleTemplates];

      if (where?.id) {
        items = items.filter((template) => template.id === where.id);
      }

      if (where?.courtId) {
        items = items.filter((template) => template.courtId === where.courtId);
      }

      if (typeof where?.weekday === 'number') {
        items = items.filter((template) => template.weekday === where.weekday);
      }

      if (Array.isArray(orderBy)) {
        items.sort((left, right) => {
          for (const rule of orderBy) {
            const [field, direction] = Object.entries(rule)[0] as [keyof CourtScheduleTemplateRecord, 'asc' | 'desc'];
            const leftValue = left[field];
            const rightValue = right[field];

            if (leftValue === rightValue) {
              continue;
            }

            const result = String(leftValue).localeCompare(String(rightValue));
            return direction === 'asc' ? result : -result;
          }

          return 0;
        });
      }

      return items;
    };

    this.courtScheduleTemplate.findFirst = async ({ where }: any = {}) =>
      (await this.courtScheduleTemplate.findMany({ where }))[0] ?? null;

    this.courtScheduleTemplate.update = async ({ where, data }: any) => {
      const template = this.courtScheduleTemplates.find((item) => item.id === where.id) ?? null;

      if (!template) {
        return null;
      }

      const nextData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      );

      Object.assign(template, nextData, { updatedAt: new Date() });
      return template;
    };

    this.courtScheduleTemplate.delete = async ({ where }: any) => {
      const index = this.courtScheduleTemplates.findIndex((item) => item.id === where.id);

      if (index === -1) {
        return null;
      }

      const [deleted] = this.courtScheduleTemplates.splice(index, 1);
      return deleted;
    };

    this.courtScheduleException.create = async ({ data }: any) => {
      const exception: CourtScheduleExceptionRecord = {
        id: randomUUID(),
        courtId: data.courtId,
        date: data.date,
        exceptionType: data.exceptionType,
        timeFrom: data.timeFrom ?? null,
        timeTo: data.timeTo ?? null,
        customPrice: data.customPrice ?? null,
        comment: data.comment ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.courtScheduleExceptions.push(exception);
      return exception;
    };

    this.courtScheduleException.findMany = async ({ where, orderBy }: any = {}) => {
      let items = [...this.courtScheduleExceptions];

      if (where?.id) {
        items = items.filter((exception) => exception.id === where.id);
      }

      if (where?.courtId) {
        items = items.filter((exception) => exception.courtId === where.courtId);
      }

      if (where?.date) {
        items = items.filter(
          (exception) => exception.date.toISOString().slice(0, 10) === where.date.toISOString().slice(0, 10),
        );
      }

      if (Array.isArray(orderBy)) {
        items.sort((left, right) => {
          for (const rule of orderBy) {
            const [field, direction] = Object.entries(rule)[0] as [keyof CourtScheduleExceptionRecord, 'asc' | 'desc'];
            const leftValue = left[field];
            const rightValue = right[field];

            const leftComparable =
              leftValue instanceof Date ? leftValue.toISOString() : String(leftValue ?? '');
            const rightComparable =
              rightValue instanceof Date ? rightValue.toISOString() : String(rightValue ?? '');

            if (leftComparable === rightComparable) {
              continue;
            }

            const result = leftComparable.localeCompare(rightComparable);
            return direction === 'asc' ? result : -result;
          }

          return 0;
        });
      }

      return items;
    };

    this.courtScheduleException.findFirst = async ({ where }: any = {}) =>
      (await this.courtScheduleException.findMany({ where }))[0] ?? null;

    this.courtScheduleException.update = async ({ where, data }: any) => {
      const exception = this.courtScheduleExceptions.find((item) => item.id === where.id) ?? null;

      if (!exception) {
        return null;
      }

      const nextData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      );

      Object.assign(exception, nextData, { updatedAt: new Date() });
      return exception;
    };

    this.courtScheduleException.delete = async ({ where }: any) => {
      const index = this.courtScheduleExceptions.findIndex((item) => item.id === where.id);

      if (index === -1) {
        return null;
      }

      const [deleted] = this.courtScheduleExceptions.splice(index, 1);
      return deleted;
    };

    this.bookingRequest.create = async ({ data, include }: any) => {
      const bookingRequest: BookingRequestRecord = {
        id: randomUUID(),
        playerProfileId: data.playerProfileId,
        partnerProfileId: data.partnerProfileId,
        venueId: data.venueId,
        courtId: data.courtId,
        relatedMatchRequestId: data.relatedMatchRequestId ?? null,
        bookingDate: data.bookingDate,
        timeFrom: data.timeFrom,
        timeTo: data.timeTo,
        durationMinutes: data.durationMinutes,
        playersCount: data.playersCount,
        commentFromPlayer: data.commentFromPlayer ?? null,
        commentFromPartner: data.commentFromPartner ?? null,
        status: data.status ?? 'draft',
        submittedAt: data.submittedAt ?? null,
        respondedAt: data.respondedAt ?? null,
        cancelledAt: data.cancelledAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.bookingRequests.push(bookingRequest);
      return this.withBookingRequestIncludes(bookingRequest, include);
    };

    this.bookingRequest.findMany = async ({ where, include, orderBy }: any = {}) => {
      let items = [...this.bookingRequests];

      if (where?.id && !where.id.not) {
        items = items.filter((bookingRequest) => bookingRequest.id === where.id);
      }

      if (where?.id?.not) {
        items = items.filter((bookingRequest) => bookingRequest.id !== where.id.not);
      }

      if (where?.playerProfileId) {
        items = items.filter(
          (bookingRequest) => bookingRequest.playerProfileId === where.playerProfileId,
        );
      }

      if (where?.partnerProfileId) {
        items = items.filter(
          (bookingRequest) => bookingRequest.partnerProfileId === where.partnerProfileId,
        );
      }

      if (where?.courtId) {
        items = items.filter((bookingRequest) => bookingRequest.courtId === where.courtId);
      }

      if (where?.relatedMatchRequestId) {
        items = items.filter(
          (bookingRequest) =>
            bookingRequest.relatedMatchRequestId === where.relatedMatchRequestId,
        );
      }

      if (where?.status) {
        if (where.status.in) {
          items = items.filter((bookingRequest) => where.status.in.includes(bookingRequest.status));
        } else {
          items = items.filter((bookingRequest) => bookingRequest.status === where.status);
        }
      }

      if (where?.bookingDate) {
        items = items.filter(
          (bookingRequest) =>
            bookingRequest.bookingDate.toISOString().slice(0, 10) ===
            where.bookingDate.toISOString().slice(0, 10),
        );
      }

      if (orderBy?.createdAt === 'desc') {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (orderBy?.createdAt === 'asc') {
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }

      return items.map((bookingRequest) => this.withBookingRequestIncludes(bookingRequest, include));
    };

    this.bookingRequest.findFirst = async ({ where, include }: any = {}) => {
      const items = await this.bookingRequest.findMany({ where, include });
      return items[0] ?? null;
    };

    this.bookingRequest.findUnique = async ({ where, include }: any) => {
      const bookingRequest = this.bookingRequests.find((item) => item.id === where.id) ?? null;
      return bookingRequest ? this.withBookingRequestIncludes(bookingRequest, include) : null;
    };

    this.bookingRequest.update = async ({ where, data, include }: any) => {
      const bookingRequest = this.bookingRequests.find((item) => item.id === where.id) ?? null;

      if (!bookingRequest) {
        return null;
      }

      Object.assign(bookingRequest, data, { updatedAt: new Date() });
      return this.withBookingRequestIncludes(bookingRequest, include);
    };

    this.bookingRequestStatusHistory.create = async ({ data }: any) => {
      const historyEntry: BookingRequestStatusHistoryRecord = {
        id: randomUUID(),
        bookingRequestId: data.bookingRequestId,
        oldStatus: data.oldStatus ?? null,
        newStatus: data.newStatus,
        changedByUserId: data.changedByUserId ?? null,
        comment: data.comment ?? null,
        createdAt: new Date(),
      };

      this.bookingRequestStatusHistoryEntries.push(historyEntry);
      return historyEntry;
    };

    this.bookingRequestStatusHistory.findMany = async ({ where, include, orderBy }: any = {}) => {
      let items = [...this.bookingRequestStatusHistoryEntries];

      if (where?.bookingRequestId) {
        items = items.filter((entry) => entry.bookingRequestId === where.bookingRequestId);
      }

      if (orderBy?.createdAt === 'asc') {
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      } else if (orderBy?.createdAt === 'desc') {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return items.map((entry) => ({
        ...entry,
        ...(include?.changedByUser
          ? {
              changedByUser:
                this.users.find((user) => user.id === entry.changedByUserId) ?? null,
            }
          : {}),
      }));
    };

    this.matchRequest.create = async ({ data, include }: any) => {
      const matchRequest: MatchRequestRecord = {
        id: randomUUID(),
        initiatorId: data.initiatorId,
        opponentId: data.opponentId,
        status: data.status ?? 'pending',
        proposedDate: data.proposedDate,
        proposedTimeFrom: data.proposedTimeFrom,
        proposedTimeTo: data.proposedTimeTo,
        format: data.format,
        message: data.message ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.matchRequests.push(matchRequest);
      return this.withMatchRequestIncludes(matchRequest, include);
    };

    this.matchRequest.findMany = async ({ where, include, orderBy }: any = {}) => {
      let items = [...this.matchRequests];

      if (where?.id) {
        items = items.filter((matchRequest) => matchRequest.id === where.id);
      }

      if (where?.initiatorId) {
        items = items.filter((matchRequest) => matchRequest.initiatorId === where.initiatorId);
      }

      if (where?.opponentId) {
        items = items.filter((matchRequest) => matchRequest.opponentId === where.opponentId);
      }

      if (where?.status) {
        items = items.filter((matchRequest) => matchRequest.status === where.status);
      }

      if (orderBy?.createdAt === 'desc') {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return items.map((matchRequest) => this.withMatchRequestIncludes(matchRequest, include));
    };

    this.matchRequest.findFirst = async ({ where, include }: any = {}) => {
      const items = await this.matchRequest.findMany({ where, include });
      return items[0] ?? null;
    };

    this.matchRequest.findUnique = async ({ where, include }: any) => {
      const matchRequest = this.matchRequests.find((item) => item.id === where.id) ?? null;
      return matchRequest ? this.withMatchRequestIncludes(matchRequest, include) : null;
    };

    this.matchRequest.update = async ({ where, data, include }: any) => {
      const matchRequest = this.matchRequests.find((item) => item.id === where.id) ?? null;

      if (!matchRequest) {
        return null;
      }

      Object.assign(matchRequest, data, { updatedAt: new Date() });
      return this.withMatchRequestIncludes(matchRequest, include);
    };

    this.verificationRequest.findFirst = async ({ where, orderBy, include }: any) => {
      let items = this.verificationRequests.filter((request) => {
        if (where.partnerProfileId && request.partnerProfileId !== where.partnerProfileId) {
          return false;
        }

        if (where.id && request.id !== where.id) {
          return false;
        }

        if (where.status) {
          if (where.status.in) {
            return where.status.in.includes(request.status);
          }

          return request.status === where.status;
        }

        return true;
      });

      if (orderBy?.createdAt === 'desc') {
        items = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return items[0] ? this.withVerificationRequestIncludes(items[0], include) : null;
    };

    this.verificationRequest.create = async ({ data }: any) => {
      const request: VerificationRequestRecord = {
        id: randomUUID(),
        partnerProfileId: data.partnerProfileId,
        status: data.status,
        comment: data.comment ?? null,
        submittedAt: data.submittedAt ?? null,
        reviewedAt: data.reviewedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.verificationRequests.push(request);
      return this.withVerificationRequestIncludes(request, undefined);
    };

    this.verificationRequest.update = async ({ where, data, include }: any) => {
      const request = this.verificationRequests.find((item) => item.id === where.id);

      if (!request) {
        return null;
      }

      Object.assign(request, data, { updatedAt: new Date() });
      return this.withVerificationRequestIncludes(request, include);
    };

    this.verificationRequest.findMany = async ({ where, include, orderBy }: any = {}) => {
      let items = [...this.verificationRequests];

      if (where?.partnerProfileId) {
        items = items.filter((request) => request.partnerProfileId === where.partnerProfileId);
      }

      if (where?.status) {
        if (where.status.in) {
          items = items.filter((request) => where.status.in.includes(request.status));
        } else {
          items = items.filter((request) => request.status === where.status);
        }
      }

      if (Array.isArray(orderBy)) {
        items.sort((left, right) => {
          for (const rule of orderBy) {
            const [field, direction] = Object.entries(rule)[0] as [
              keyof VerificationRequestRecord,
              'asc' | 'desc',
            ];
            const leftValue = left[field];
            const rightValue = right[field];
            const leftTime = leftValue instanceof Date ? leftValue.getTime() : leftValue ? new Date(leftValue as any).getTime() : 0;
            const rightTime = rightValue instanceof Date ? rightValue.getTime() : rightValue ? new Date(rightValue as any).getTime() : 0;

            if (leftTime === rightTime) {
              continue;
            }

            return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
          }

          return 0;
        });
      } else {
        items.sort((a, b) => {
          const aTime = a.submittedAt?.getTime() ?? a.createdAt.getTime();
          const bTime = b.submittedAt?.getTime() ?? b.createdAt.getTime();
          return bTime - aTime;
        });
      }

      return items.map((request) => this.withVerificationRequestIncludes(request, include));
    };

    this.verificationRequest.findUnique = async ({ where, include }: any) => {
      const request = this.verificationRequests.find((item) => item.id === where.id) ?? null;
      return request ? this.withVerificationRequestIncludes(request, include) : null;
    };

    this.auditLog.create = async ({ data }: any) => {
      const auditLog: AuditLogRecord = {
        id: randomUUID(),
        actorUserId: data.actorUserId ?? null,
        action: data.action,
        targetEntity: data.targetEntity,
        targetId: data.targetId,
        comment: data.comment ?? null,
        metadata: data.metadata ?? null,
        createdAt: new Date(),
      };

      this.auditLogs.push(auditLog);
      return auditLog;
    };

    this.auditLog.findMany = async ({ where }: any) =>
      this.auditLogs
        .filter(
          (item) =>
            item.targetEntity === where.targetEntity && item.targetId === where.targetId,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((item) => ({
          ...item,
          actorUser: item.actorUserId
            ? this.users.find((user) => user.id === item.actorUserId) ?? null
            : null,
        }));

    this.notification.create = async ({ data }: any) => {
      const notification: NotificationRecord = {
        id: randomUUID(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        relatedEntityType: data.relatedEntityType ?? null,
        relatedEntityId: data.relatedEntityId ?? null,
        isRead: data.isRead ?? false,
        createdAt: new Date(),
        readAt: data.readAt ?? null,
      };

      this.notifications.push(notification);
      return notification;
    };

    this.notification.findMany = async ({ where, orderBy }: any = {}) => {
      let items = [...this.notifications];

      if (where?.userId) {
        items = items.filter((notification) => notification.userId === where.userId);
      }

      if (typeof where?.isRead === 'boolean') {
        items = items.filter((notification) => notification.isRead === where.isRead);
      }

      if (orderBy?.createdAt === 'desc') {
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (orderBy?.createdAt === 'asc') {
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }

      return items;
    };

    this.notification.findFirst = async ({ where }: any = {}) => {
      const items = await this.notification.findMany({ where });
      return items.find((notification: NotificationRecord) => {
        if (where?.id && notification.id !== where.id) {
          return false;
        }

        return true;
      }) ?? null;
    };

    this.notification.update = async ({ where, data }: any) => {
      const notification = this.notifications.find((item) => item.id === where.id) ?? null;

      if (!notification) {
        return null;
      }

      Object.assign(notification, data);
      return notification;
    };

    this.notification.updateMany = async ({ where, data }: any) => {
      let count = 0;

      for (const notification of this.notifications) {
        if (where?.userId && notification.userId !== where.userId) {
          continue;
        }

        if (typeof where?.isRead === 'boolean' && notification.isRead !== where.isRead) {
          continue;
        }

        Object.assign(notification, data);
        count += 1;
      }

      return { count };
    };

    this.notification.count = async ({ where }: any = {}) =>
      (await this.notification.findMany({ where })).length;
  }

  private createSeedUser(phone: string, roles: RoleKey[]) {
    const user: UserRecord = {
      id: randomUUID(),
      phone,
      email: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    this.users.push(user);
    this.userSettings.push({
      id: randomUUID(),
      userId: user.id,
      locale: 'ru',
      timezone: 'Europe/Moscow',
      notificationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const roleKey of roles) {
      const role = this.roles.find((item) => item.key === roleKey)!;
      this.userRoles.push({
        id: randomUUID(),
        userId: user.id,
        roleId: role.id,
        createdAt: new Date(),
      });
    }

    return user;
  }

  private withUserIncludes(user: UserRecord, include: any) {
    return {
      ...user,
      ...(include?.roles
        ? {
            roles: this.userRoles
              .filter((userRole) => userRole.userId === user.id)
              .map((userRole) => ({
                ...userRole,
                role: this.roles.find((role) => role.id === userRole.roleId)!,
              })),
          }
        : {}),
      ...(include?.settings
        ? {
            settings:
              this.userSettings.find((setting) => setting.userId === user.id) ?? null,
          }
        : {}),
      ...(include?.playerProfile
        ? {
            playerProfile: this.withPlayerProfileIncludes(
              this.playerProfiles.find((profile) => profile.userId === user.id)!,
              include.playerProfile.include,
            ),
          }
        : {}),
    };
  }

  private withPlayerProfileIncludes(profile: PlayerProfileRecord, include: any) {
    return {
      ...profile,
      ...(include?.user
        ? {
            user: this.users.find((user) => user.id === profile.userId) ?? null,
          }
        : {}),
      ...(include?.visibilitySettings
        ? {
            visibilitySettings:
              this.playerVisibilitySettings.find(
                (setting) => setting.playerProfileId === profile.id,
              ) ?? null,
          }
        : {}),
      ...(include?.playPreferences
        ? {
            playPreferences:
              this.playerPlayPreferences.find(
                (setting) => setting.playerProfileId === profile.id,
              ) ?? null,
          }
        : {}),
      ...(include?.city ? { city: null } : {}),
      ...(include?.district ? { district: null } : {}),
    };
  }

  private withPartnerProfileIncludes(profile: PartnerProfileRecord, include: any) {
    return {
      ...profile,
      ...(include?.ownerUser
        ? {
            ownerUser: this.users.find((user) => user.id === profile.ownerUserId) ?? null,
          }
        : {}),
      ...(include?.profileTypes
        ? {
            profileTypes: this.partnerProfileTypes
              .filter((item) => item.partnerProfileId === profile.id)
              .map((item) => ({
                ...item,
                partnerType: this.partnerTypes.find(
                  (partnerType) => partnerType.id === item.partnerTypeId,
                )!,
              })),
          }
        : {}),
      ...(include?.contacts ? { contacts: [] } : {}),
      ...(include?.city
        ? { city: this.cities.find((city) => city.id === profile.cityId) ?? null }
        : {}),
      ...(include?.district
        ? { district: this.districts.find((district) => district.id === profile.districtId) ?? null }
        : {}),
    };
  }

  private withAddressIncludes(address: AddressRecord, include: any) {
    return {
      ...address,
      ...(include?.city
        ? { city: this.cities.find((city) => city.id === address.cityId) ?? null }
        : {}),
      ...(include?.district
        ? {
            district:
              this.districts.find((district) => district.id === address.districtId) ?? null,
          }
        : {}),
    };
  }

  private withCourtIncludes(court: CourtRecord, include: any) {
    return {
      ...court,
      ...(include?.venue
        ? {
            venue: this.withVenueIncludes(
              this.venues.find((venue) => venue.id === court.venueId)!,
              include.venue.include,
            ),
          }
        : {}),
      ...(include?.scheduleTemplates
        ? {
            scheduleTemplates: this.courtScheduleTemplates.filter(
              (template) => template.courtId === court.id,
            ),
          }
        : {}),
      ...(include?.scheduleExceptions
        ? {
            scheduleExceptions: this.courtScheduleExceptions.filter(
              (exception) => exception.courtId === court.id,
            ),
          }
        : {}),
    };
  }

  private withVenueIncludes(venue: VenueRecord, include: any) {
    return {
      ...venue,
      ...(include?.address
        ? {
            address: this.withAddressIncludes(
              this.addresses.find((address) => address.id === venue.addressId)!,
              include.address.include,
            ),
          }
        : {}),
      ...(include?.courts
        ? {
            courts: this.courts
              .filter((court) => court.venueId === venue.id)
              .filter((court) =>
                typeof include.courts.where?.isActive === 'boolean'
                  ? court.isActive === include.courts.where.isActive
                  : true,
              )
              .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                  return a.sortOrder - b.sortOrder;
                }

                return a.name.localeCompare(b.name, 'ru');
              }),
          }
        : {}),
      ...(include?.partnerProfile
        ? {
            partnerProfile: this.withPartnerProfileIncludes(
              this.partnerProfiles.find((profile) => profile.id === venue.partnerProfileId)!,
              include.partnerProfile.include,
            ),
          }
        : {}),
    };
  }

  private withVerificationRequestIncludes(request: VerificationRequestRecord, include: any) {
    const partnerProfile =
      this.partnerProfiles.find((profile) => profile.id === request.partnerProfileId) ?? null;

    return {
      ...request,
      ...(include?.partnerProfile && partnerProfile
        ? {
            partnerProfile: this.withPartnerProfileIncludes(
              partnerProfile,
              include.partnerProfile.include,
            ),
          }
        : {}),
      ...(include?.documents
        ? {
            documents: this.verificationDocuments
              .filter((document) => document.verificationRequestId === request.id)
              .map((document) => ({
                ...document,
                ...(include.documents.include?.file
                  ? {
                      file: this.files.find((file) => file.id === document.fileId) ?? null,
                    }
                  : {}),
              })),
          }
        : {}),
    };
  }

  private withBookingRequestIncludes(bookingRequest: BookingRequestRecord, include: any) {
    return {
      ...bookingRequest,
      ...(include?.playerProfile
        ? {
            playerProfile: this.withPlayerProfileIncludes(
              this.playerProfiles.find((profile) => profile.id === bookingRequest.playerProfileId)!,
              include.playerProfile.include,
            ),
          }
        : {}),
      ...(include?.partnerProfile
        ? {
            partnerProfile: this.withPartnerProfileIncludes(
              this.partnerProfiles.find((profile) => profile.id === bookingRequest.partnerProfileId)!,
              include.partnerProfile.include,
            ),
          }
        : {}),
      ...(include?.venue
        ? {
            venue: this.withVenueIncludes(
              this.venues.find((venue) => venue.id === bookingRequest.venueId)!,
              include.venue.include,
            ),
          }
        : {}),
      ...(include?.court
        ? {
            court: this.courts.find((court) => court.id === bookingRequest.courtId) ?? null,
          }
        : {}),
      ...(include?.statusHistory
        ? {
            statusHistory: this.bookingRequestStatusHistoryEntries
              .filter((entry) => entry.bookingRequestId === bookingRequest.id)
              .sort((a, b) => {
                const direction = include.statusHistory.orderBy?.createdAt === 'desc' ? -1 : 1;
                return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
              })
              .map((entry) => ({
                ...entry,
                ...(include.statusHistory.include?.changedByUser
                  ? {
                      changedByUser:
                        this.users.find((user) => user.id === entry.changedByUserId) ?? null,
                    }
                  : {}),
              })),
          }
        : {}),
      ...(include?.relatedMatchRequest
        ? {
            relatedMatchRequest: bookingRequest.relatedMatchRequestId
              ? this.withMatchRequestIncludes(
                  this.matchRequests.find(
                    (matchRequest) => matchRequest.id === bookingRequest.relatedMatchRequestId,
                  )!,
                  include.relatedMatchRequest.include,
                )
              : null,
          }
        : {}),
    };
  }

  private withMatchRequestIncludes(matchRequest: MatchRequestRecord, include: any) {
    return {
      ...matchRequest,
      ...(include?.initiator
        ? {
            initiator: this.withUserIncludes(
              this.users.find((user) => user.id === matchRequest.initiatorId)!,
              include.initiator.include,
            ),
          }
        : {}),
      ...(include?.opponent
        ? {
            opponent: this.withUserIncludes(
              this.users.find((user) => user.id === matchRequest.opponentId)!,
              include.opponent.include,
            ),
          }
        : {}),
      ...(include?.relatedBookingRequest
        ? {
            relatedBookingRequest: (() => {
              const bookingRequest =
                this.bookingRequests.find(
                  (item) => item.relatedMatchRequestId === matchRequest.id,
                ) ?? null;

              if (!bookingRequest) {
                return null;
              }

              return {
                ...bookingRequest,
                venue: this.venues.find((venue) => venue.id === bookingRequest.venueId) ?? null,
                court: this.courts.find((court) => court.id === bookingRequest.courtId) ?? null,
              };
            })(),
          }
        : {}),
    };
  }
}
