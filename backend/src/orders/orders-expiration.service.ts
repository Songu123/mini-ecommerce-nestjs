import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { OrdersGateway } from '../notifications/orders.gateway.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class OrdersExpirationService {
  private readonly logger = new Logger(OrdersExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    // Configurable timeouts (minutes)
    const timeoutOnlineMs = Number(process.env.ORDER_CANCEL_TIMEOUT_MINUTES || '15') * 60 * 1000;
    const timeoutCODMs = Number(process.env.ORDER_CANCEL_TIMEOUT_COD_MINUTES || '1440') * 60 * 1000; // default 24h
    const now = new Date();

    // ------- ONLINE orders (short timeout) -------
    const onlineExpired = await this.prisma.order.findMany({
      where: {
        AND: [
          { createdAt: { lte: new Date(now.getTime() - timeoutOnlineMs) } },
          { status: { in: [OrderStatus.AWAITING_PAYMENT, OrderStatus.PENDING] } },
          { paymentMethod: PaymentMethod.ONLINE },
        ],
      },
      include: { items: true },
    });

    // ------- COD orders (longer timeout) -------
    const codExpired = await this.prisma.order.findMany({
      where: {
        AND: [
          { createdAt: { lte: new Date(now.getTime() - timeoutCODMs) } },
          { status: OrderStatus.PENDING },
          { paymentMethod: PaymentMethod.COD },
        ],
      },
      include: { items: true },
    });

    const expiredOrders = [...onlineExpired, ...codExpired];

    if (expiredOrders.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredOrders.length} expired awaiting-payment order(s). Processing cancellation & restock...`);

    for (const order of expiredOrders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Mark order as CANCELLED
          await tx.order.update({
            where: { id: order.id },
            data: { 
              status: OrderStatus.CANCELLED,
              cancelReason: 'Hệ thống tự động hủy do quá hạn',
              history: {
                create: [
                  {
                    oldStatus: order.status,
                    newStatus: OrderStatus.CANCELLED,
                    note: 'Hệ thống tự động hủy do quá hạn',
                    createdBy: 'SYSTEM',
                  }
                ]
              }
            },
          });

          // 2. Restock products atomically
          for (const item of order.items) {
            if (item.productVariantId) {
              await tx.productVariant.update({
                where: { id: item.productVariantId },
                data: { stock: { increment: item.quantity } },
              });
            } else {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }

          // 3. Revert coupon usage if applied
          if (order.couponId) {
            await tx.coupon.update({
              where: { id: order.couponId },
              data: {
                usedCount: {
                  decrement: 1,
                },
              },
            });
          }
        });

        this.logger.log(`Order #${order.id} expired and cancelled. Inventory restocked successfully.`);
      } catch (err: any) {
        this.logger.error(`Failed to cancel expired order #${order.id}: ${err?.message || err}`, err?.stack);
      }
    }
  }
}
