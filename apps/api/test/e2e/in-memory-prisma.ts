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

type UserRecord = {
  id: string;
  phone: string;
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
  verificationStatus: PartnerVerificationStatus;
  cityId: string | null;
  districtId: string | null;
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

export class InMemoryPrismaService {
  private users: UserRecord[] = [];
  private roles: RoleRecord[] = [];
  private userRoles: UserRoleRecord[] = [];
  private userSettings: UserSettingRecord[] = [];
  private userSessions: UserSessionRecord[] = [];
  private authPhoneChallenges: AuthPhoneChallengeRecord[] = [];
  private playerProfiles: PlayerProfileRecord[] = [];
  private playerVisibilitySettings: PlayerVisibilitySettingRecord[] = [];
  private playerPlayPreferences: PlayerPlayPreferenceRecord[] = [];
  private partnerTypes: PartnerTypeRecord[] = [];
  private partnerProfiles: PartnerProfileRecord[] = [];
  private partnerProfileTypes: PartnerProfileTypeRecord[] = [];
  private verificationRequests: VerificationRequestRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];

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

  user: any = {
    findUnique: async (_args: any) => null,
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

  verificationRequest: any = {
    findFirst: async (_args: any) => null,
    create: async (_args: any) => null,
    update: async (_args: any) => null,
    findMany: async (_args: any) => [],
    findUnique: async (_args: any) => null,
  };

  auditLog: any = {
    create: async (_args: any) => null,
    findMany: async (_args: any) => [],
  };

  file: any = {
    create: async (args: any) => {
      const file = {
        id: randomUUID(),
        createdAt: new Date(),
        ...args.data,
      };

      return file;
    },
  };

  verificationDocument: any = {
    create: async (args: any) => ({
      id: randomUUID(),
      createdAt: new Date(),
      ...args.data,
      file: {
        id: args.data.fileId,
      },
    }),
  };

  private seed() {
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

    const demoPlayer = this.createSeedUser('+79990000001', ['player']);
    const demoPartner = this.createSeedUser('+79990000002', ['player']);
    const demoAdmin = this.createSeedUser('+79990000003', ['admin']);
    const reviewPartner = this.createSeedUser('+79990000004', ['player', 'partner']);

    const reviewPartnerProfile: PartnerProfileRecord = {
      id: randomUUID(),
      ownerUserId: reviewPartner.id,
      legalName: 'Review Club LLC',
      brandName: 'Review Club',
      description: 'Seeded partner profile for review flow.',
      verificationStatus: 'pending_verification',
      cityId: null,
      districtId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      submittedAt: new Date(),
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.verificationRequests.push(reviewRequest);
    this.auditLogs.push({
      id: randomUUID(),
      actorUserId: reviewPartner.id,
      action: 'verification_request.seeded',
      targetEntity: 'verification_request',
      targetId: reviewRequest.id,
      comment: 'Seeded pending request.',
      metadata: { status: 'submitted' },
      createdAt: new Date(),
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

    this.user.create = async ({ data, include }: any) => {
      const user: UserRecord = {
        id: randomUUID(),
        phone: data.phone,
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
          if (where.id && item.id !== where.id) {
            return false;
          }

          if (where.status && item.status !== where.status) {
            return false;
          }

          return true;
        }) ?? null;

      return profile ? this.withPlayerProfileIncludes(profile, include) : null;
    };

    this.playerProfile.findMany = async () =>
      this.playerProfiles.map((profile) => this.withPlayerProfileIncludes(profile, undefined));

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

    this.verificationRequest.findMany = async ({ where, include }: any) =>
      this.verificationRequests
        .filter((request) => {
          if (where?.status) {
            return request.status === where.status;
          }

          return true;
        })
        .sort((a, b) => {
          const aTime = a.submittedAt?.getTime() ?? a.createdAt.getTime();
          const bTime = b.submittedAt?.getTime() ?? b.createdAt.getTime();
          return bTime - aTime;
        })
        .map((request) => this.withVerificationRequestIncludes(request, include));

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
  }

  private createSeedUser(phone: string, roles: RoleKey[]) {
    const user: UserRecord = {
      id: randomUUID(),
      phone,
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
    };
  }

  private withPlayerProfileIncludes(profile: PlayerProfileRecord, include: any) {
    return {
      ...profile,
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
      ...(include?.city ? { city: null } : {}),
      ...(include?.district ? { district: null } : {}),
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
      ...(include?.documents ? { documents: [] } : {}),
    };
  }
}
