import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const adminPhone = '+79990000003';
const adminEmail = 'demo-admin@tennis-spot.local';

async function main() {
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { key: 'admin' },
  });

  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      email: adminEmail,
      status: 'active',
    },
    create: {
      phone: adminPhone,
      email: adminEmail,
      status: 'active',
    },
  });

  await prisma.userSetting.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  await prisma.adminProfile.upsert({
    where: {
      userId: adminUser.id,
    },
    update: {
      displayName: 'Demo admin',
    },
    create: {
      userId: adminUser.id,
      displayName: 'Demo admin',
    },
  });

  console.log(`Admin user ensured: ${adminPhone}`);
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
