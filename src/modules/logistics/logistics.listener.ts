import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { DriversLogicService } from '../drivers/drivers-logic.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';

@Injectable()
export class LogisticsListener {
  private readonly logger = new Logger(LogisticsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driversLogic: DriversLogicService,
    private readonly pushService: PushNotificationsService,
  ) {}

  @OnEvent('order.ready', { async: true })
  async handleOrderReady(order: any) {
    const { idOrder, idTenant, restaurant } = order;

    try {
      // 1. Cambiar estado a SEARCHING_DRIVER
      await this.prisma.order.update({
        where: { idOrder },
        data: { status: 'SEARCHING_DRIVER' },
      });

      // 2. Buscar conductores en un radio de 5km (Cochabamba)
      const nearbyDrivers = await this.driversLogic.findNearbyDrivers(
        restaurant.lat,
        restaurant.lng,
        5,
        idTenant,
      );

      if (nearbyDrivers.length === 0) {
        this.logger.warn(`No hay conductores para la orden ${idOrder}`);
        return;
      }

      // 3. Crear ofertas y enviar Push
      const pushPromises = nearbyDrivers.map(async (driver) => {
        // Crear registro de oferta para que el driver pueda aceptarla luego
        await this.prisma.orderOffer.create({
          data: {
            idOrder,
            idDriver: driver.idDriver,
            expiresAt: new Date(Date.now() + 2 * 60000), // 2 min para expirar
          },
        });
      });

      await Promise.all(pushPromises);

      const tokens = nearbyDrivers.map((d) => d.fcmToken).filter((t) => !!t);

      if (tokens.length > 0) {
        await this.pushService.sendMulticast(
          tokens,
          '¡Nueva orden disponible! 🍕',
          `El restaurante ${restaurant.name} tiene un pedido listo.`,
          {
            orderId: idOrder,
            type: 'NEW_ORDER_AVAILABLE',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        );
      }
    } catch (error: any) {
      this.logger.error(`Error en logística: ${error.message}`);
    }
  }
}
