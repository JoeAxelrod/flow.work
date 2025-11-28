import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/workflow-instances',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private instanceRooms = new Map<string, Set<string>>(); // instanceId -> Set of socketIds

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove client from all instance rooms
    this.instanceRooms.forEach((socketIds, instanceId) => {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.instanceRooms.delete(instanceId);
        }
      }
    });
  }

  @SubscribeMessage('join-instance')
  handleJoinInstance(client: Socket, instanceId: string) {
    client.join(`instance:${instanceId}`);
    
    // Track room membership
    if (!this.instanceRooms.has(instanceId)) {
      this.instanceRooms.set(instanceId, new Set());
    }
    this.instanceRooms.get(instanceId)!.add(client.id);
    
    this.logger.log(`Client ${client.id} joined instance room: ${instanceId}`);
    client.emit('joined-instance', { instanceId });
  }

  @SubscribeMessage('leave-instance')
  handleLeaveInstance(client: Socket, instanceId: string) {
    client.leave(`instance:${instanceId}`);
    
    // Remove from tracking
    const socketIds = this.instanceRooms.get(instanceId);
    if (socketIds) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.instanceRooms.delete(instanceId);
      }
    }
    
    this.logger.log(`Client ${client.id} left instance room: ${instanceId}`);
  }

  emitActivityUpdate(instanceId: string, activityData: any) {
    this.server.to(`instance:${instanceId}`).emit('activity-update', activityData);
    this.logger.log(`Emitted activity update for instance: ${instanceId}`);
  }

  emitInstanceStatusUpdate(instanceId: string, statusData: any) {
    this.server.to(`instance:${instanceId}`).emit('instance-status-update', statusData);
    this.logger.log(`Emitted instance status update for instance: ${instanceId}`);
  }
}

