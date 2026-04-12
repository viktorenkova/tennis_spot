import {
  PartnerTypeKey,
  Prisma,
  PrismaClient,
  RoleKey,
  VerificationRequestStatus,
} from '@prisma/client';

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
    roles: ['player'] as RoleKey[],
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

  const demoPlayer = await ensureUser(
    demoUsers.demoPlayer.phone,
    demoUsers.demoPlayer.roles,
    demoUsers.demoPlayer.email,
  );
  const demoPartner = await ensureUser(
    demoUsers.demoPartner.phone,
    demoUsers.demoPartner.roles,
    demoUsers.demoPartner.email,
  );
  const demoAdmin = await ensureUser(
    demoUsers.demoAdmin.phone,
    demoUsers.demoAdmin.roles,
    demoUsers.demoAdmin.email,
  );
  const reviewPartnerUser = await ensureUser(
    demoUsers.reviewPartner.phone,
    demoUsers.reviewPartner.roles,
    demoUsers.reviewPartner.email,
  );

  await prisma.adminProfile.upsert({
    where: { userId: demoAdmin.id },
    update: { displayName: demoUsers.demoAdmin.adminDisplayName },
    create: {
      userId: demoAdmin.id,
      displayName: demoUsers.demoAdmin.adminDisplayName,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: demoAdmin.id,
        roleId: roleMap.admin.id,
      },
    },
    update: {},
    create: {
      userId: demoAdmin.id,
      roleId: roleMap.admin.id,
    },
  });

  await ensureDefaultSettings(demoPlayer.id);
  await ensureDefaultSettings(demoPartner.id);
  await ensureDefaultSettings(demoAdmin.id);
  await ensureDefaultSettings(reviewPartnerUser.id);

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
        update: {},
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

async function ensureUser(phone: string, roleKeys: RoleKey[], email?: string) {
  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      email,
      status: 'active',
    },
    create: {
      phone,
      email,
      status: 'active',
    },
  });

  await ensureDefaultSettings(user.id);

  for (const roleKey of roleKeys) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { key: roleKey },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
  }

  return user;
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

async function seedReviewablePartner(params: {
  userId: string;
  cityId: string;
  districtId: string;
  clubTypeId: string;
}) {
  const partnerProfile = await prisma.partnerProfile.upsert({
    where: { ownerUserId: params.userId },
    update: {
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
    create: {
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

  await prisma.partnerProfileType.deleteMany({
    where: {
      partnerProfileId: partnerProfile.id,
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

  const verificationRequest = await upsertVerificationRequest({
    partnerProfileId: partnerProfile.id,
    status: 'submitted',
  });

  const existingDoc = await prisma.verificationDocument.findFirst({
    where: {
      verificationRequestId: verificationRequest.id,
      fileId: file.id,
    },
  });

  if (!existingDoc) {
    await prisma.verificationDocument.create({
      data: {
        verificationRequestId: verificationRequest.id,
        fileId: file.id,
        documentType: 'registration_certificate',
      },
    });
  }

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

async function upsertVerificationRequest(params: {
  partnerProfileId: string;
  status: VerificationRequestStatus;
}) {
  const existing = await prisma.verificationRequest.findFirst({
    where: {
      partnerProfileId: params.partnerProfileId,
      status: {
        in: ['submitted', 'in_review', 'draft', 'needs_correction'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (existing) {
    return prisma.verificationRequest.update({
      where: { id: existing.id },
      data: {
        status: params.status,
        submittedAt: params.status === 'submitted' ? new Date() : existing.submittedAt,
      },
    });
  }

  return prisma.verificationRequest.create({
    data: {
      partnerProfileId: params.partnerProfileId,
      status: params.status,
      submittedAt: params.status === 'submitted' ? new Date() : null,
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
