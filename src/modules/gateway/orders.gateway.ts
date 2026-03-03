import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DriverResponseService } from '../driver-response/driver-response.service';

// ─── Eventos que el SERVER emite al cliente ───────────────────────────────────

export enum ServerEvent {
  ORDER_STATUS_UPDATED = 'order:status_updated', // → customer
  DRIVER_OFFER = 'order:driver_offer', // → driver (oferta de pedido)
  DRIVER_OFFER_EXPIRED = 'order:offer_expired', // → driver (timeout)
  DRIVER_LOCATION = 'driver:location_updated', // → customer
  ERROR = 'error',
}

// ─── Eventos que el CLIENTE envía al servidor ─────────────────────────────────

export enum ClientEvent {
  JOIN_ORDER_ROOM = 'order:join', // customer/driver se une a sala del pedido
  LEAVE_ORDER_ROOM = 'order:leave',
  DRIVER_ACCEPT = 'order:driver_accept', // driver acepta la oferta
  DRIVER_REJECT = 'order:driver_reject', // driver rechaza la oferta
  UPDATE_LOCATION = 'driver:update_location', // driver envía su ubicación
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private readonly connectedClients = new Map<
    string,
    { sub: string; role: string; idTenant: string }
  >();
  private readonly driverSockets = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly driverResponseService: DriverResponseService,
  ) {}

  // ─── Conexión: validar JWT ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      this.connectedClients.set(client.id, {
        sub: payload.sub,
        role: payload.role,
        idTenant: payload.idTenant,
      });

      if (payload.role === 'DRIVER') {
        this.driverSockets.set(payload.sub, client.id);
      }

      this.logger.log(
        `Connected: ${client.id} | user: ${payload.sub} | role: ${payload.role}`,
      );
    } catch (err) {
      this.logger.warn(`Rejected: ${client.id} | ${err}`);
      client.emit(ServerEvent.ERROR, { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedClients.get(client.id);
    if (user?.role === 'DRIVER') {
      this.driverSockets.delete(user.sub);
    }
    this.connectedClients.delete(client.id);
    this.logger.log(`Disconnected: ${client.id}`);
  }

  // ─── Unirse a sala del pedido ──────────────────────────────────────────────

  @SubscribeMessage(ClientEvent.JOIN_ORDER_ROOM)
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string },
  ) {
    client.join(`order:${data.idOrder}`);
    this.logger.log(`Socket ${client.id} joined room order:${data.idOrder}`);
    return { event: 'joined', room: `order:${data.idOrder}` };
  }

  @SubscribeMessage(ClientEvent.LEAVE_ORDER_ROOM)
  handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string },
  ) {
    client.leave(`order:${data.idOrder}`);
  }

  // ─── Driver acepta oferta via WS ───────────────────────────────────────────
  // Delega a DriverResponseService — misma lógica que el endpoint HTTP

  @SubscribeMessage(ClientEvent.DRIVER_ACCEPT)
  async handleDriverAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string },
  ) {
    const user = this.connectedClients.get(client.id);
    if (!user || user.role !== 'DRIVER') {
      throw new WsException('Only drivers can accept orders');
    }

    try {
      const result = await this.driverResponseService.acceptOffer(
        data.idOrder,
        {
          idUser: user.sub,
          role: user.role,
          tenantId: user.idTenant,
          deviceId: '',
        },
      );
      client.emit('order:accept_ack', result);
    } catch (err) {
      client.emit(ServerEvent.ERROR, { message: err });
    }
  }

  // ─── Driver rechaza oferta via WS ──────────────────────────────────────────

  @SubscribeMessage(ClientEvent.DRIVER_REJECT)
  async handleDriverReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string; reason?: string },
  ) {
    const user = this.connectedClients.get(client.id);
    if (!user || user.role !== 'DRIVER') {
      throw new WsException('Only drivers can reject orders');
    }

    try {
      const result = await this.driverResponseService.rejectOffer(
        data.idOrder,
        { reason: data.reason },
        {
          idUser: user.sub,
          role: user.role,
          tenantId: user.idTenant,
          deviceId: '',
        },
      );
      client.emit('order:reject_ack', result);
    } catch (err) {
      client.emit(ServerEvent.ERROR, { message: err });
    }
  }

  // ─── Driver actualiza ubicación ────────────────────────────────────────────

  @SubscribeMessage(ClientEvent.UPDATE_LOCATION)
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string; lat: number; lng: number },
  ) {
    const user = this.connectedClients.get(client.id);
    if (!user || user.role !== 'DRIVER') return;

    this.server.to(`order:${data.idOrder}`).emit(ServerEvent.DRIVER_LOCATION, {
      idDriver: user.sub,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Métodos de emisión usados por otros servicios ─────────────────────────

  emitOrderStatusUpdate(idOrder: string, status: string, extra?: object) {
    this.server.to(`order:${idOrder}`).emit(ServerEvent.ORDER_STATUS_UPDATED, {
      idOrder,
      status,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }

  emitDriverOffer(
    idDriver: string,
    offerData: {
      idOrder: string;
      restaurantName: string;
      deliveryAddress: string;
      pickupLat: number;
      pickupLng: number;
      deliveryLat: number;
      deliveryLng: number;
      total: number;
      expiresAt: Date;
    },
  ): boolean {
    const socketId = this.driverSockets.get(idDriver);
    if (!socketId) {
      this.logger.warn(`Driver ${idDriver} not connected on WS`);
      return false;
    }
    this.server.to(socketId).emit(ServerEvent.DRIVER_OFFER, offerData);
    return true;
  }

  emitOfferExpired(idDriver: string, idOrder: string) {
    const socketId = this.driverSockets.get(idDriver);
    if (socketId) {
      this.server
        .to(socketId)
        .emit(ServerEvent.DRIVER_OFFER_EXPIRED, { idOrder });
    }
  }

  isDriverOnline(idDriver: string): boolean {
    return this.driverSockets.has(idDriver);
  }
}
