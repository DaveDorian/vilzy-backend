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

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Opcional: El WsJwtGuard protegerá los mensajes, 
    // pero si queremos validar conexión inicial necesitamos extraer el token aquí, 
    // o confiar en que @UseGuards corta los eventos. NestJS 10+ aplica WsGuard 
    // a handleConnection si se configura o a nivel global, pero usualmente 
    // se aplica a @SubscribeMessage. Lo dejaremos simple.
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Podríamos marcar al DriverOffline aquí si supiéramos quién es
  }

  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @ConnectedSocket() client: any,
    @MessageBody()
    data: { lat: number; lng: number; heading?: number; speed?: number; idOrder?: string },
  ) {
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
}
