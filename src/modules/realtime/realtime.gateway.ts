import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { REALTIME_EVENTS, ROOMS } from './realtime.events';

interface AuthedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

/**
 * Realtime gateway for order dispatch, live tracking and status updates.
 *
 * Authentication: clients pass their JWT access token via the Socket.IO
 * handshake `auth.token` (the mobile client already does this in
 * android-mobile/src/services/websocket.service.ts). On connect we verify the
 * token and join the socket to its identity rooms.
 *
 * Rooms:
 *  - user:<id>   every authenticated user (customers receive order updates here)
 *  - driver:<id> drivers (receive order offers here)
 *  - order:<id>  per-order room (joined on demand for live tracking)
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth && (client.handshake.auth as any).token) ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Socket ${client.id} rejected: no token`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      client.join(ROOMS.user(payload.sub));
      if (payload.role === 'DRIVER') {
        client.join(ROOMS.driver(payload.sub));
      }

      this.logger.log(`Socket ${client.id} connected as ${payload.role} ${payload.sub}`);
    } catch (error) {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`Socket ${client.id} disconnected (${client.userId ?? 'unknown'})`);
  }

  // ==================== Client -> Server ====================

  /** A client (customer or driver) subscribes to live updates for an order. */
  @SubscribeMessage('order:subscribe')
  onOrderSubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      client.join(ROOMS.order(data.orderId));
    }
    return { success: true };
  }

  @SubscribeMessage('order:unsubscribe')
  onOrderUnsubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      client.leave(ROOMS.order(data.orderId));
    }
    return { success: true };
  }

  /** Driver streams its live location; relay to the order room (customer). */
  @SubscribeMessage(REALTIME_EVENTS.DRIVER_LOCATION_UPDATE)
  onDriverLocation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    data: { orderId?: string; latitude: number; longitude: number; heading?: number },
  ) {
    if (!client.userId || data?.latitude == null || data?.longitude == null) {
      return { success: false };
    }
    const payload = {
      driverId: client.userId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      timestamp: new Date().toISOString(),
    };
    if (data.orderId) {
      // Relay to everyone tracking this order (the customer).
      this.server
        .to(ROOMS.order(data.orderId))
        .emit(REALTIME_EVENTS.DRIVER_LOCATION_UPDATE, payload);
    }
    return { success: true };
  }

  // ==================== Server -> Client emit helpers ====================

  emitToUser(userId: string, event: string, payload: any) {
    this.server?.to(ROOMS.user(userId)).emit(event, payload);
  }

  emitToDriver(driverId: string, event: string, payload: any) {
    this.server?.to(ROOMS.driver(driverId)).emit(event, payload);
  }

  emitToOrder(orderId: string, event: string, payload: any) {
    this.server?.to(ROOMS.order(orderId)).emit(event, payload);
  }
}
