import { PartnerTypeKey, PrismaClient, RoleKey } from '@prisma/client';

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
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });
  }

  for (const partnerType of partnerTypes) {
    await prisma.partnerType.upsert({
      where: { key: partnerType.key },
      update: {
        name: partnerType.name,
      },
      create: partnerType,
    });
  }

  for (const cityData of cities) {
    const city = await prisma.city.upsert({
      where: { slug: cityData.slug },
      update: { name: cityData.name },
      create: {
        slug: cityData.slug,
        name: cityData.name,
      },
    });

    for (const districtName of cityData.districts) {
      await prisma.district.upsert({
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
          slug: districtName
            .toLowerCase()
            .replace(/[^a-zа-я0-9]+/gi, '-')
            .replace(/^-+|-+$/g, ''),
        },
      });
    }
  }
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
