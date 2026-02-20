import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { calculateETA, haversineDistance } from 'src/common/util/geo.util';
import { WsJwtGuard } from 'src/modules/auth/guards/ws-jwt.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private prisma: PrismaService) {}

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @MessageBody()
    data: {
      driverId: string;
      orderId: string;
      lat: number;
      lng: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (user.role !== 'DRIVER')
      return { ok: false, message: 'Only drivers can send location' };

    const { driverId, orderId, lat, lng } = data;

    const order = await this.prisma.order.findUnique({
      where: { idOrder: orderId },
    });

    if (!order || !order.deliveryLat || !order.deliveryLng)
      return { ok: false };

    const distanceKm = haversineDistance(
      lat,
      lng,
      order.deliveryLat,
      order.deliveryLng,
    );

    const etaMinutes = calculateETA(distanceKm);

    await this.prisma.user.update({
      where: { idUser: driverId },
      data: {},
    });

    await this.prisma.driverLocation.upsert({
      where: { idDriver: driverId },
      update: {
        lat,
        lng,
        isOnline: true,
      },
      create: {
        idDriver: driverId,
        lat,
        lng,
        isOnline: true,
      },
    });

    this.server.to(`order-${orderId}`).emit('order:tracking', {
      driverId,
      lat,
      lng,
      etaMinutes,
      distanceKm,
      timestamp: new Date(),
    });

    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('driver:join')
  handleDriverJoin(@ConnectedSocket() client: Socket) {
    const user = client.data.user;

    if (user.role !== 'DRIVER') return { ok: false };

    client.join(`driver-${user.sub}`);

    return { joined: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('order:join')
  handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order-${data.orderId}`);
    return { joined: true };
  }

  @SubscribeMessage('order:leave')
  handleLeaveOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order-${data.orderId}`);
    return { left: true };
  }
}
