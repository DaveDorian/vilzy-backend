// prisma/seed.ts
import { PrismaClient, Role, TenantType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
} as any);

async function main() {
  const adminEmail = 'admin@vilzy.com';
  const adminPassword = 'AdminPassword123!'; // Cambia esto inmediatamente después

  console.log('🌱 Iniciando el proceso de Seeding...');

  // 1. Crear el Tenant Principal (Marketplace)
  const mainTenant = await prisma.tenant.upsert({
    where: { idTenant: 'main-tenant-id', name: 'Vilzy Global' },
    update: {},
    create: {
      name: 'Vilzy Global',
      type: TenantType.MARKETPLACE,
      isActive: true,
      commissionRate: 0.1,
    },
  });

  console.log(`✅ Tenant creado: ${mainTenant.name}`);

  // 2. Crear el Usuario Administrador
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Super Admin',
      surname: 'Vilzy',
      ci: '12345678',
      role: Role.SUPER_ADMIN, // Asegúrate que este sea el nombre en tu enum
      idTenant: mainTenant.idTenant,
      isActive: true,
    },
  });

  console.log(`✅ Usuario Admin creado: ${adminUser.email}`);
  console.log('🚀 Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
