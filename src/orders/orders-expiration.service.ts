import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersExpirationService {
  private readonly logger = new Logger(OrdersExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    const expirationThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.AWAITING_PAYMENT,
        createdAt: { lte: expirationThreshold },
      },
      include: {
        items: true,
      },
    });

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
            data: { status: OrderStatus.CANCELLED },
          });

          // 2. Restock products atomically
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
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
