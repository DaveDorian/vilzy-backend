import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(WsJwtGuard)
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        this.logger.error('No token provided on connection');
        client.disconnect();
        return;
      }

      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'fallback_secret_key',
      });

      const user = await this.prisma.user.findFirst({
        where: {
          idUser: payload.sub,
          idTenant: payload.tenantId,
          isActive: true,
        },
        include: { tenant: true },
      });

      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      const userId = user.idUser;
      const roomName = `${user.role.toLowerCase()}_${userId}`;

      // Si ya hay sockets en la sala, notificarles que la sesión fue reemplazada
      // y desconectarlos antes de que este nuevo socket se una
      const existingSockets = await this.server.in(roomName).fetchSockets();
      if (existingSockets.length > 0) {
        this.server.to(roomName).emit('session_replaced', {
          message: 'Se ha iniciado sesión en otro dispositivo',
        });
        this.server.in(roomName).disconnectSockets(true);
      }

      // Guardar el payload en el socket para usarlo en eventos y en handleDisconnect
      (client as any).user = payload;

      await client.join(roomName);
      this.logger.log(`Client connected: ${client.id} in room ${roomName}`);

      // ── Re-entregar órdenes pendientes para conductores ─────────────────────
      // Si el driver se reconectó y hay una orden ofrecida sin respuesta,
      // volver a enviarla para que no pierda la notificación.
      /*if (user.role === 'DRIVER') {
        const pendingOffers = await this.prisma.orderOffer.findMany({
          where: {
            idDriver: userId,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
          include: {
            order: {
              include: {
                restaurant: {
                  select: {
                    name: true,
                    address: true,
                    lat: true,
                    lng: true,
                    idTenant: true,
                  },
                },
              },
            },
          },
        });

        for (const offer of pendingOffers) {
          const { order } = offer;
          const notificationData = {
            idOrder: order.idOrder,
            restaurantName: order.restaurant.name,
            address: order.restaurant.address,
            deliveryAddress: order.deliveryAddress,
            total: order.total,
            lat: order.restaurant.lat,
            lng: order.restaurant.lng,
          };
          client.emit('new_order_available', notificationData);
          this.logger.log(
            `Re-entregando orden pendiente ${order.idOrder} al conductor ${userId} (reconexión)`,
          );
        }
      }*/
    } catch (error) {
      this.logger.error('Connection unauthorized');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user as JwtPayload | undefined;
    if (user) {
      this.logger.log(
        `Client disconnected: ${client.id} (user: ${user.sub}, role: ${user.role})`,
      );
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @ConnectedSocket() client: any,
    @MessageBody()
    data: { lat: number; lng: number; heading?: number; speed?: number; idOrder?: string },
  ) {
    console.log(data);
    
    const user = client.user;

    if (!user || user.role !== 'DRIVER') {
      return { status: 'error', message: 'Unauthorized role for this action' };
    }

    try {
      // Upsert usando Raw SQL para manejar el campo de Geometría (PostGIS)
      await this.prisma.$executeRaw`
        INSERT INTO "DriverLocation" ("idDriverLocation", "idDriver", "lat", "lng", "heading", "speed", "location", "updatedAt")
        VALUES (
          gen_random_uuid(), 
          ${user.sub}, 
          ${data.lat}, 
          ${data.lng}, 
          ${data.heading || null}, 
          ${data.speed || null}, 
          ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326), 
          NOW()
        )
        ON CONFLICT ("idDriver")
        DO UPDATE SET
          "lat" = ${data.lat},
          "lng" = ${data.lng},
          "heading" = ${data.heading || null},
          "speed" = ${data.speed || null},
          "location" = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326),
          "updatedAt" = NOW();
      `;

      // Si el Driver está asignado a una orden, emitir a la sala de esa orden
      if (data.idOrder) {
        this.server.to(`order_${data.idOrder}`).emit('driver_location_updated', {
          idDriver: user.sub,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
        });
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error updating driver location: ${error}`);
      return { status: 'error', message: 'Failed to update location' };
    }
  }

  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @ConnectedSocket() client: any,
    @MessageBody() data: { idOrder: string },
  ) {
    const user = client.user;
    if (!user) {
      return { status: 'error', message: 'Unauthorized' };
    }

    // Verificar si la orden existe y si el usuario tiene permiso de verla
    const order = await this.prisma.order.findUnique({
      where: { idOrder: data.idOrder },
    });

    if (!order) {
      return { status: 'error', message: 'Order not found' };
    }

    // Un cliente solo puede ver su propia orden,
    // Un Restaurante o TenantAdmin puede ver las de su Tenant
    const isCustomer = user.role === 'CUSTOMER' && order.idCustomer === user.sub;
    const isRestaurant = user.role === 'RESTAURANT_ADMIN' && order.idRestaurant === user.restaurantId;
    const isDriver = user.role === 'DRIVER' && order.idDriver === user.sub;
    const isTenantAdmin = user.role === 'TENANT_ADMIN' && order.idTenant === user.tenantId;

    if (isCustomer || isRestaurant || isDriver || isTenantAdmin) {
      const roomName = `order_${data.idOrder}`;
      client.join(roomName);
      this.logger.log(`User ${user.sub} joined room: ${roomName}`);
      return { status: 'success', room: roomName };
    } else {
      return { status: 'error', message: 'No permission to join this order tracking' };
    }
  }

  // --- EVENTS LISTENER ---
  @OnEvent('order.status_changed', { async: true })
  handleOrderStatusChanged(payload: { idOrder: string; status: string; driver?: any }) {
    this.logger.log(`Broadcasting status change for order ${payload.idOrder} to ${payload.status}`);
    this.server.to(`order_${payload.idOrder}`).emit('order_status_updated', payload);
  }

  @OnEvent('order.offered', { async: true })
  async handleOrderOffered(payload: { order: any; drivers: any[] }) {
    const { order, drivers } = payload;

    const notificationData = {
      idOrder: order.idOrder,
      restaurantName: order.restaurant.name,
      address: order.restaurant.address,
      deliveryAddress: order.deliveryAddress,
      total: order.total,
      lat: order.restaurant.lat,
      lng: order.restaurant.lng,
    };

    for (const driver of drivers) {
      // Verificar que la oferta sigue vigente y en estado PENDING antes de notificar
      /*const offer = await this.prisma.orderOffer.findFirst({
        where: {
          idOrder: order.idOrder,
          idDriver: driver.idDriver,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      });

      if (!offer) {
        this.logger.warn(
          `Oferta para conductor ${driver.idDriver} no encontrada, expirada o ya respondida – se omite`,
        );
        continue;
      }*/

      const roomName = `driver_${driver.idDriver}`;
      const connectedSockets = await this.server.in(roomName).fetchSockets();

      if (connectedSockets.length > 0) {
        this.server.to(roomName).emit('new_order_available', notificationData);
        this.logger.log(
          `Orden ${order.idOrder} enviada al conductor ${driver.idDriver} (${connectedSockets.length} sockets activos)`,
        );
      } else {
        this.logger.warn(
          `El conductor ${driver.idDriver} tiene el perfil activo pero no tiene sockets conectados a la sala ${roomName}`,
        );
        // TODO: disparar Push Notification (FCM) como fallback
        // this.fcmService.sendNotification(driver.fcmToken, '¡Nueva orden cerca!', notificationData);
      }
    }
  }
}
