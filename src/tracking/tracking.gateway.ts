import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
    const { driverId, orderId, lat, lng } = data;

    await this.prisma.user.update({
      where: { idUser: driverId },
      data: {},
    });

    this.server.to(`order-${orderId}`).emit('order:tracking', {
      driverId,
      lat,
      lng,
      timestamp: new Date(),
    });

    return { ok: true };
  }

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
