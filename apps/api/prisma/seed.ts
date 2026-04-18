import { PartnerTypeKey, Prisma, PrismaClient, RoleKey } from '@prisma/client';

const prisma = new PrismaClient();

const roles: Array<{ key: RoleKey; name: string; description: string }> = [
  { key: 'player', name: 'Player', description: 'Tennis player using the platform.' },
  { key: 'partner', name: 'Partner', description: 'Verified business partner profile owner.' },
  { key: 'admin', name: 'Admin', description: 'Platform administrator for moderation workflows.' },
  { key: 'superadmin', name: 'Superadmin', description: 'Full platform administrator.' },
];

const partnerTypes: Array<{ key: PartnerTypeKey; name: string }> = [
  { key: 'club', name: 'Club' },
  { key: 'school', name: 'School' },
  { key: 'organizer', name: 'Organizer' },
  { key: 'store', name: 'Store' },
  { key: 'mixed', name: 'Mixed' },
];

const cities = [
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
    districts: ['Адмиралтейский район', 'Петроградский район', 'Приморский район'],
  },
] as const;

const demoUsers = {
  demoPlayer: {
    phone: '+79990000001',
    email: 'demo-player@tennis-spot.local',
    roles: ['player'] as RoleKey[],
  },
  demoPartner: {
    phone: '+79990000002',
    email: 'demo-partner@tennis-spot.local',
    roles: ['player', 'partner'] as RoleKey[],
  },
  demoAdmin: {
    phone: '+79990000003',
    email: 'demo-admin@tennis-spot.local',
    roles: ['admin'] as RoleKey[],
    adminDisplayName: 'Demo admin',
  },
  reviewPartner: {
    phone: '+79990000004',
    email: 'review-partner@tennis-spot.local',
    roles: ['player', 'partner'] as RoleKey[],
  },
} as const;

async function main() {
  const roleMap = await seedRoles();
  const partnerTypeMap = await seedPartnerTypes();
  const cityMap = await seedCities();

  const demoPlayer = await ensureUser({
    phone: demoUsers.demoPlayer.phone,
    email: demoUsers.demoPlayer.email,
    roles: demoUsers.demoPlayer.roles,
    roleMap,
  });
  const demoPartner = await ensureUser({
    phone: demoUsers.demoPartner.phone,
    email: demoUsers.demoPartner.email,
    roles: demoUsers.demoPartner.roles,
    roleMap,
  });
  const demoAdmin = await ensureUser({
    phone: demoUsers.demoAdmin.phone,
    email: demoUsers.demoAdmin.email,
    roles: demoUsers.demoAdmin.roles,
    roleMap,
  });
  const reviewPartnerUser = await ensureUser({
    phone: demoUsers.reviewPartner.phone,
    email: demoUsers.reviewPartner.email,
    roles: demoUsers.reviewPartner.roles,
    roleMap,
  });

  await prisma.adminProfile.upsert({
    where: { userId: demoAdmin.id },
    update: { displayName: demoUsers.demoAdmin.adminDisplayName },
    create: {
      userId: demoAdmin.id,
      displayName: demoUsers.demoAdmin.adminDisplayName,
    },
  });

  await ensureDefaultSettings(demoPlayer.id);
  await ensureDefaultSettings(demoPartner.id);
  await ensureDefaultSettings(demoAdmin.id);
  await ensureDefaultSettings(reviewPartnerUser.id);

  // Keep these demo accounts clean so smoke flows do not depend on historical DB drift.
  await resetPartnerState(demoPlayer.id);
  await resetPartnerState(demoPartner.id);
  await resetPartnerState(demoAdmin.id);

  await seedReviewablePartner({
    userId: reviewPartnerUser.id,
    cityId: cityMap.moscow.id,
    districtId: cityMap.moscow.districts[0].id,
    clubTypeId: partnerTypeMap.club.id,
  });
}

async function seedRoles() {
  const map = {} as Record<RoleKey, { id: string }>;

  for (const role of roles) {
    const savedRole = await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });

    map[role.key] = { id: savedRole.id };
  }

  return map;
}

async function seedPartnerTypes() {
  const map = {} as Record<PartnerTypeKey, { id: string }>;

  for (const partnerType of partnerTypes) {
    const savedType = await prisma.partnerType.upsert({
      where: { key: partnerType.key },
      update: {
        name: partnerType.name,
      },
      create: partnerType,
    });

    map[partnerType.key] = { id: savedType.id };
  }

  return map;
}

async function seedCities() {
  const map = {} as Record<
    string,
    {
      id: string;
      districts: Array<{ id: string; name: string }>;
    }
  >;

  for (const cityData of cities) {
    const city = await prisma.city.upsert({
      where: { slug: cityData.slug },
      update: { name: cityData.name },
      create: {
        slug: cityData.slug,
        name: cityData.name,
      },
    });

    const districts = [];

    for (const districtName of cityData.districts) {
      const district = await prisma.district.upsert({
        where: {
          cityId_name: {
            cityId: city.id,
            name: districtName,
          },
        },
        update: {
          slug: slugify(districtName),
        },
        create: {
          cityId: city.id,
          name: districtName,
          slug: slugify(districtName),
        },
      });

      districts.push({
        id: district.id,
        name: district.name,
      });
    }

    map[cityData.slug] = {
      id: city.id,
      districts,
    };
  }

  return map;
}

async function ensureUser(params: {
  phone: string;
  email?: string;
  roles: RoleKey[];
  roleMap: Record<RoleKey, { id: string }>;
}) {
  const user = await prisma.user.upsert({
    where: { phone: params.phone },
    update: {
      email: params.email,
      status: 'active',
    },
    create: {
      phone: params.phone,
      email: params.email,
      status: 'active',
    },
  });

  await ensureDefaultSettings(user.id);
  await ensureExactRoles(user.id, params.roles, params.roleMap);

  return user;
}

async function ensureExactRoles(
  userId: string,
  desiredRoles: RoleKey[],
  roleMap: Record<RoleKey, { id: string }>,
) {
  const desiredRoleIds = desiredRoles.map((roleKey) => roleMap[roleKey].id);

  await prisma.userRole.deleteMany({
    where: {
      userId,
      roleId: {
        notIn: desiredRoleIds,
      },
    },
  });

  for (const roleKey of desiredRoles) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: roleMap[roleKey].id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: roleMap[roleKey].id,
      },
    });
  }
}

async function ensureDefaultSettings(userId: string) {
  await prisma.userSetting.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
    },
  });
}

async function resetPartnerState(userId: string) {
  const partnerProfile = await prisma.partnerProfile.findUnique({
    where: { ownerUserId: userId },
    select: {
      id: true,
    },
  });

  if (!partnerProfile) {
    return;
  }

  const verificationRequests = await prisma.verificationRequest.findMany({
    where: {
      partnerProfileId: partnerProfile.id,
    },
    select: {
      id: true,
    },
  });

  if (verificationRequests.length) {
    await prisma.verificationDocument.deleteMany({
      where: {
        verificationRequestId: {
          in: verificationRequests.map((request) => request.id),
        },
      },
    });
  }

  await prisma.verificationRequest.deleteMany({
    where: {
      partnerProfileId: partnerProfile.id,
    },
  });

  await prisma.partnerProfileType.deleteMany({
    where: {
      partnerProfileId: partnerProfile.id,
    },
  });

  await prisma.partnerProfile.delete({
    where: {
      id: partnerProfile.id,
    },
  });
}

async function seedReviewablePartner(params: {
  userId: string;
  cityId: string;
  districtId: string;
  clubTypeId: string;
}) {
  await resetPartnerState(params.userId);

  const partnerProfile = await prisma.partnerProfile.create({
    data: {
      ownerUserId: params.userId,
      legalName: 'Review Club LLC',
      brandName: 'Review Club',
      description: 'Seeded partner profile for admin verification review.',
      contactPhone: '+79990000004',
      contactEmail: 'review@tennis-spot.local',
      taxId: '7701234567',
      legalAddress: 'Москва, Пресненская набережная, 12',
      actualAddress: 'Москва, Пресненская набережная, 12',
      cityId: params.cityId,
      districtId: params.districtId,
      verificationStatus: 'pending_verification',
    },
  });

  await prisma.partnerProfileType.create({
    data: {
      partnerProfileId: partnerProfile.id,
      partnerTypeId: params.clubTypeId,
    },
  });

  const file = await prisma.file.upsert({
    where: {
      storageKey: 'demo/review-partner/inn.pdf',
    },
    update: {
      originalName: 'inn.pdf',
      storageBucket: 'local-demo',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedByUserId: params.userId,
    },
    create: {
      originalName: 'inn.pdf',
      storageBucket: 'local-demo',
      storageKey: 'demo/review-partner/inn.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedByUserId: params.userId,
    },
  });

  const verificationRequest = await prisma.verificationRequest.create({
    data: {
      partnerProfileId: partnerProfile.id,
      status: 'submitted',
      submittedAt: new Date(),
    },
  });

  await prisma.verificationDocument.create({
    data: {
      verificationRequestId: verificationRequest.id,
      fileId: file.id,
      documentType: 'registration_certificate',
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: params.userId,
      action: 'verification_request.seeded',
      targetEntity: 'verification_request',
      targetId: verificationRequest.id,
      comment: 'Seeded review request for manual admin demo.',
      metadata: {
        status: 'submitted',
      } as Prisma.InputJsonValue,
    },
  });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
