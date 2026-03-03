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

  // Map de socketId → JwtPayload para conocer quién es cada socket
  private readonly connectedClients = new Map<
    string,
    { sub: string; role: string; idTenant: string }
  >();

  // Map de driverId → socketId para encontrar al driver rápidamente
  private readonly driverSockets = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

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
        `Client connected: ${client.id} | user: ${payload.sub} | role: ${payload.role}`,
      );
    } catch (err) {
      this.logger.warn(`Rejected connection: ${client.id} | ${err}`);
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
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Cliente se une a la sala de un pedido ─────────────────────────────────
  // La sala 'order:{idOrder}' recibe todos los eventos de ese pedido

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

  // ─── Driver acepta la oferta ───────────────────────────────────────────────

  @SubscribeMessage(ClientEvent.DRIVER_ACCEPT)
  async handleDriverAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string },
  ) {
    const user = this.connectedClients.get(client.id);
    if (!user || user.role !== 'DRIVER') {
      throw new WsException('Only drivers can accept orders');
    }
    // Emitir al DispatchService (via evento interno)
    client.emit('order:accept_ack', { idOrder: data.idOrder });
    this.server
      .to(`order:${data.idOrder}`)
      .emit('order:driver_accepted', { idDriver: user.sub });
  }

  // ─── Driver rechaza la oferta ──────────────────────────────────────────────

  @SubscribeMessage(ClientEvent.DRIVER_REJECT)
  handleDriverReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string },
  ) {
    const user = this.connectedClients.get(client.id);
    if (!user || user.role !== 'DRIVER') {
      throw new WsException('Only drivers can reject orders');
    }
    this.server
      .to(`order:${data.idOrder}`)
      .emit('order:driver_rejected', { idDriver: user.sub });
  }

  // ─── Driver actualiza su ubicación ────────────────────────────────────────

  @SubscribeMessage(ClientEvent.UPDATE_LOCATION)
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { idOrder: string; lat: number; lng: number },
  ) {
    const user = this.connectedClients.get(client.id);
    if (!user || user.role !== 'DRIVER') return;

    // Emitir a todos los que están en la sala del pedido (el customer)
    this.server.to(`order:${data.idOrder}`).emit(ServerEvent.DRIVER_LOCATION, {
      idDriver: user.sub,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Métodos que otros servicios usan para emitir eventos ─────────────────

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
  ) {
    const socketId = this.driverSockets.get(idDriver);
    if (!socketId) {
      this.logger.warn(`Driver ${idDriver} is not connected via WebSocket`);
      return false; // El driver no está online en WS (puede recibir FCM en su lugar)
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
