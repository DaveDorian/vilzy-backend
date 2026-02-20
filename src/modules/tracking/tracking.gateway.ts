import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { calculateETA, haversineDistance } from 'src/common/util/geo.util';
import { WsJwtGuard } from 'src/modules/auth/guards/ws-jwt.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: true,
})
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private prisma: PrismaService,
    private readonly trackingService: TrackingService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      //await client.join(`tenant:${payload.tenantId}`);
      await client.join(`driver:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @MessageBody() payload: UpdateLocationDto,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    const result = await this.trackingService.handleLocationUpdate({
      orderId: payload.orderId,
      driverId: user.sub,
      tenantId: user.tenantId,
      lat: payload.lat,
      lng: payload.lng,
    });

    this.server.to(`order:${payload.orderId}`).emit('order:tracking', result);

    return result;
  }

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

    await this.prisma.$executeRaw`
    INSERT INTO "DriverLocation" ("idDriver", lat, lng, "isOnline", location)
    VALUES (${driverId}, ${lat}, ${lng}, true, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
    ON CONFLICT ("idDriver") 
    DO UPDATE SET 
      lat = EXCLUDED.lat, 
      lng = EXCLUDED.lng, 
      location = EXCLUDED.location,
      "isOnline" = true;
  `;

    /*await this.prisma.driverLocation.upsert({
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
    });*/

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
  @SubscribeMessage('order:accept')
  async acceptOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    const order = await this.dispatchService.acceptedOrder({
      orderId,
      driverId: user.sub,
    });

    return order;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('order:reject')
  async rejectOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    await this.dispatchService.rejectOrder({
      orderId,
      driverId: user.sub,
    });

    return { rejected: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('order:join')
  async handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`order:${orderId}`);
    return { joined: orderId };
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
