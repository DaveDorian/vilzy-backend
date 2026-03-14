import { PrismaClient, Role, TenantType, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function clearDB() {
  console.log('🧹 Limpiando base de datos...');
  await prisma.orderItem.deleteMany();
  await prisma.orderOffer.deleteMany();
  await prisma.order.deleteMany();
  await prisma.driverLocation.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurantStaff.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

async function main() {
  await clearDB();

  const adminEmail = 'admin@vilzy.com';
  const adminPassword = 'AdminPassword123!';

  console.log('🌱 Iniciando el proceso de Seeding con Faker.js...');

  // 1. Crear el Tenant Principal (Marketplace)
  const mainTenant = await prisma.tenant.create({
    data: {
      name: 'Vilzy Global',
      type: TenantType.MARKETPLACE,
      isActive: true,
      commissionRate: 0.1,
      slug: 'vilzy-global',
    },
  });

  console.log(`✅ Tenant creado: ${mainTenant.name}`);

  // 2. Crear el Usuario Administrador
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Vilzy',
      surname: 'Admin',
      ci: '12345678',
      role: Role.SUPER_ADMIN,
      idTenant: mainTenant.idTenant,
      isActive: true,
    },
  });
  console.log(`✅ Usuario Admin creado: ${adminUser.email}`);

  // 3. Crear Clientes Falsos
  console.log('👥 Creando Clientes...');
  const customers = await Promise.all(
    Array.from({ length: 15 }).map(async () => {
      return prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: hashedPassword,
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          ci: `${faker.number.int({ min: 10000000, max: 99999999 })}`,
          role: Role.CUSTOMER,
          idTenant: mainTenant.idTenant,
          isActive: true,
        },
      });
    }),
  );

  // 4. Crear Restaurantes (En zona Cochabamba approx)
  console.log('🍔 Creando Restaurantes y Menús...');
  const cochaCenter = { lat: -17.3895, lng: -66.1568 };
  
  const restaurants = await Promise.all(
    Array.from({ length: 5 }).map(async () => {
      const lat = cochaCenter.lat + faker.number.float({ min: -0.05, max: 0.05 });
      const lng = cochaCenter.lng + faker.number.float({ min: -0.05, max: 0.05 });
      
      const rest = await prisma.restaurant.create({
        data: {
          name: faker.company.name() + ' Restaurant',
          address: faker.location.streetAddress(),
          lat,
          lng,
          idTenant: mainTenant.idTenant,
          isActive: true,
        },
      });

      // Añadir la locación en PostGIS
      await prisma.$executeRaw`
        UPDATE "Restaurant"
        SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        WHERE "idRestaurant" = ${rest.idRestaurant}
      `;

      // Crear Dueño
      const owner = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: hashedPassword,
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          ci: `${faker.number.int({ min: 10000000, max: 99999999 })}`,
          role: Role.RESTAURANT_ADMIN,
          idTenant: mainTenant.idTenant,
          isActive: true,
        },
      });

      await prisma.restaurantStaff.create({
        data: {
          idUser: owner.idUser,
          idRestaurant: rest.idRestaurant,
          canEditMenu: true,
          canViewReports: true,
        },
      });
      
      // Update restaurant with owner
      await prisma.restaurant.update({
         where: { idRestaurant: rest.idRestaurant },
         data: { idOwner: owner.idUser }
      });

      // Crear Categorías
      const categories = await Promise.all(
        ['Platos Principales', 'Bebidas', 'Postres'].map((catName) =>
          prisma.category.create({
            data: {
              name: catName,
              idRestaurant: rest.idRestaurant,
            },
          }),
        ),
      );

      // Crear Productos
      await Promise.all(
        categories.map(async (category) => {
          await Promise.all(
            Array.from({ length: 4 }).map(() =>
              prisma.product.create({
                data: {
                  name: faker.commerce.productName(),
                  description: faker.commerce.productDescription(),
                  price: parseFloat(faker.commerce.price({ min: 15, max: 100 })),
                  stock: faker.number.int({ min: 10, max: 100 }),
                  idCategory: category.idCategory,
                  idRestaurant: rest.idRestaurant,
                },
              }),
            ),
          );
        }),
      );

      return rest;
    }),
  );

  // 5. Crear Drivers en Cochabamba
  console.log('🏍️ Creando Conductores (Drivers)...');
  const drivers = await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: hashedPassword,
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          ci: `${faker.number.int({ min: 10000000, max: 99999999 })}`,
          role: Role.DRIVER,
          idTenant: mainTenant.idTenant,
          isActive: true,
        },
      });

      await prisma.driverProfile.create({
        data: {
          idDriver: user.idUser,
          isOnline: true,
          vehiclePlate: faker.vehicle.vrm(),
          vehicleType: 'MOTORCYCLE',
        },
      });

      const lat = cochaCenter.lat + faker.number.float({ min: -0.05, max: 0.05 });
      const lng = cochaCenter.lng + faker.number.float({ min: -0.05, max: 0.05 });

      await prisma.$executeRaw`
        INSERT INTO "DriverLocation" ("idDriverLocation", "idDriver", "lat", "lng", "location", "updatedAt")
        VALUES (
          gen_random_uuid(), 
          ${user.idUser}, 
          ${lat}, 
          ${lng}, 
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 
          NOW()
        )
      `;

      return user;
    }),
  );

  // 6. Crear Algunas Órdenes Ficticias
  console.log('📦 Generando Órdenes de prueba...');
  const orderStatuses = [
    OrderStatus.PENDING,
    OrderStatus.READY,
    OrderStatus.ASSIGNED,
    OrderStatus.DELIVERED,
  ];

  for (let i = 0; i < 15; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const restaurant = faker.helpers.arrayElement(restaurants);
    const status = faker.helpers.arrayElement(orderStatuses);
    
    // Conseguir productos aleatorios del restaurant
    const products = await prisma.product.findMany({
       where: { idRestaurant: restaurant.idRestaurant },
       take: 2,
    });
    
    if(products.length === 0) continue;

    const subtotal = products.reduce((sum, p) => sum + p.price, 0);
    const total = subtotal + (subtotal * 0.1) + 15; // + delivery

    const driver = (status === OrderStatus.ASSIGNED || status === OrderStatus.DELIVERED) 
       ? faker.helpers.arrayElement(drivers) 
       : null;

    const order = await prisma.order.create({
      data: {
        idTenant: mainTenant.idTenant,
        idCustomer: customer.idUser,
        idRestaurant: restaurant.idRestaurant,
        status,
        subtotal,
        total,
        deliveryFee: 15,
        deliveryLat: cochaCenter.lat + faker.number.float({ min: -0.04, max: 0.04 }),
        deliveryLng: cochaCenter.lng + faker.number.float({ min: -0.04, max: 0.04 }),
        deliveryAddress: faker.location.streetAddress(),
        idDriver: driver?.idUser || null,
      },
    });

    await prisma.orderItem.create({
       data: {
          idOrder: order.idOrder,
          idProduct: products[0].idProduct,
          quantity: 1,
          priceAtPurchase: products[0].price,
          nameAtPurchase: products[0].name
       }
    })
  }

  console.log('🚀 Seed con datos de muestra completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

