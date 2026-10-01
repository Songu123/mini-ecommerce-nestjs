import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client kết nối: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ngắt kết nối: ${client.id}`);
  }

  /**
   * Client tham gia phòng để nhận thông báo
   * - Admin tham gia: 'admin_room'
   * - User tham gia: 'user_{userId}'
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { role?: string; userId?: number },
  ) {
    if (data.role === 'ADMIN') {
      client.join('admin_room');
      this.logger.log(`Client ${client.id} đã vào phòng: admin_room`);
      return { status: 'joined', room: 'admin_room' };
    }

    if (data.userId) {
      const room = `user_${data.userId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} đã vào phòng: ${room}`);
      return { status: 'joined', room };
    }

    return { status: 'error', message: 'Thiếu thông tin role hoặc userId' };
  }

  /**
   * Phát thông báo khi đơn hàng mới được tạo thành công
   */
  notifyOrderCreated(order: any) {
    const payload = {
      event: 'orderCreated',
      message: `Đơn hàng mới #${order.id} vừa được tạo với tổng tiền ${Number(
        order.totalAmount,
      ).toLocaleString('vi-VN')} đ`,
      order,
      timestamp: new Date().toISOString(),
    };

    // 1. Gửi cho toàn bộ Admin đang online
    this.server.to('admin_room').emit('orderCreated', payload);

    // 2. Gửi riêng cho chính khách hàng vừa đặt đơn
    this.server.to(`user_${order.userId}`).emit('orderCreated', {
      ...payload,
      message: `Bạn đã đặt thành công đơn hàng #${order.id}!`,
    });

    this.logger.log(`📢 Đã phát thông báo đơn hàng #${order.id} được tạo`);
  }

  /**
   * Phát thông báo khi trạng thái đơn hàng thay đổi
   */
  notifyOrderStatusUpdated(order: any) {
    const payload = {
      event: 'orderStatusUpdated',
      message: `Đơn hàng #${order.id} đã chuyển trạng thái thành: ${order.status}`,
      order,
      timestamp: new Date().toISOString(),
    };

    // Bắn thông báo cho khách hàng sở hữu đơn và admin
    this.server.to(`user_${order.userId}`).emit('orderStatusUpdated', payload);
    this.server.to('admin_room').emit('orderStatusUpdated', payload);

    this.logger.log(`📢 Đã phát thông báo đơn hàng #${order.id} cập nhật trạng thái -> ${order.status}`);
  }
}
