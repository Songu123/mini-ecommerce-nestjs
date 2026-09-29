import { Module } from '@nestjs/common';
import { OrdersGateway } from './orders.gateway.js';

@Module({
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class NotificationsModule {}
