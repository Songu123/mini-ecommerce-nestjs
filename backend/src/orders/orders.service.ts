import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, Role, DiscountType, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersGateway } from '../notifications/orders.gateway.js';
import { RedisService } from '../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrderDto, UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
    private redis: RedisService,
    private mailService: MailService,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    const itemKeys = dto.items.map((item) => `${item.productId}-${item.productVariantId || 'none'}`);
    const uniqueItemKeys = new Set(itemKeys);
    if (uniqueItemKeys.size !== itemKeys.length) {
      throw new BadRequestException('Danh sach mat hang co san pham bi lap lai');
    }
    const productIds = dto.items.map(i => i.productId);

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Mot hoac nhieu san pham khong ton tai');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      let totalAmount = 0;
      const orderItemsData: Array<{ productId: number; productVariantId?: number; variantName?: string; quantity: number; price: number }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        
        let itemPrice = Number(product.price);
        let variantName: string | undefined = undefined;

        if (item.productVariantId) {
          const variant = product.variants.find(v => v.id === item.productVariantId);
          if (!variant) throw new BadRequestException('Khong tim thay phan loai cho san pham ' + product.name);
          
          const updateResult = await tx.productVariant.updateMany({
            where: { id: variant.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } }
          });
          if (updateResult.count === 0) throw new BadRequestException('Phan loai ' + variant.name + ' khong du hang hoac vua co nguoi mua!');
          
          if (variant.price) itemPrice = Number(variant.price);
          variantName = variant.name;
        } else {
          const updateResult = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updateResult.count === 0) throw new BadRequestException('San pham ' + product.name + ' khong du hang hoac vua co nguoi mua!');
        }

        totalAmount += itemPrice * item.quantity;
        orderItemsData.push({
          productId: product.id,
          productVariantId: item.productVariantId,
          variantName: variantName,
          quantity: item.quantity,
          price: itemPrice,
        });
      }

      let discountAmount = 0;
      let couponId: number | null = null;

      if (dto.couponCode) {
        const code = dto.couponCode.trim().toUpperCase();
        const now = new Date();
        const coupon = await tx.coupon.findUnique({ where: { code } });

        if (!coupon) {
          throw new NotFoundException('Ma giam gia ' + code + ' khong ton tai');
        }
        if (now < coupon.startDate || now > coupon.endDate) {
          throw new BadRequestException('Ma giam gia khong trong thoi gian hieu luc');
        }
        if (coupon.minOrderValue && totalAmount < Number(coupon.minOrderValue)) {
          throw new BadRequestException('Don hang chua dat gia tri toi thieu de ap dung ma nay');
        }

        const couponUpdateResult = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            usedCount: { lt: coupon.usageLimit },
          },
          data: {
            usedCount: { increment: 1 },
          },
        });

        if (couponUpdateResult.count === 0) {
          throw new BadRequestException('Ma giam gia da het luot su dung!');
        }

        couponId = coupon.id;
        if (coupon.discountType === DiscountType.PERCENTAGE) {
          discountAmount = (totalAmount * Number(coupon.discountValue)) / 100;
          if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
            discountAmount = Number(coupon.maxDiscount);
          }
        } else {
          discountAmount = Number(coupon.discountValue);
          if (discountAmount > totalAmount) {
            discountAmount = totalAmount;
          }
        }
      }

      const finalAmount = Math.max(0, totalAmount - discountAmount);

      const orderStatus = dto.paymentMethod === PaymentMethod.COD ? OrderStatus.PENDING : OrderStatus.AWAITING_PAYMENT;

      const order = await tx.order.create({
        data: {
          userId,
          totalAmount: finalAmount,
          discountAmount,
          couponId,
          status: orderStatus,
          shippingAddress: dto.shippingAddress,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
          phone: dto.phone,
          note: dto.note,
          items: {
            create: orderItemsData,
          },
          history: {
            create: [
              {
                newStatus: orderStatus,
                note: 'Đơn hàng được tạo mới',
                createdBy: 'CUSTOMER',
              }
            ]
          }
        },
        include: {
          coupon: true,
          items: {
            include: {
              product: { select: { id: true, name: true, images: { select: { url: true, isPrimary: true } } } },
              productVariant: { select: { id: true, name: true } },
            },
          },
        },
      });

      return order;
    });

    // Invalidate product cache for affected products
    await Promise.all([
      ...productIds.map(id => this.redis.del('products:item:' + id)),
      this.redis.delByPattern('products:list:*'),
    ]);

    this.ordersGateway.notifyOrderCreated(createdOrder);

    // Send order confirmation email asynchronously
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      this.mailService.sendOrderConfirmation(user.email, createdOrder.id, createdOrder.totalAmount.toNumber()).catch(e => {
        console.error('Lỗi khi gửi email chạy ngầm:', e);
      });
    }

    return createdOrder;
  }

  async findAll(user: { id: number; role: Role }, query: QueryOrderDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (user.role !== Role.ADMIN) where.userId = user.id;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          coupon: true,
          history: { orderBy: { createdAt: 'desc' } },
          items: {
            include: {
              product: { select: { id: true, name: true, images: { select: { url: true, isPrimary: true } } } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
  }

  async findOne(id: number, user: { id: number; role: Role }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        coupon: true,
        history: { orderBy: { createdAt: 'desc' } },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true, images: { select: { url: true, isPrimary: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Khong tim thay don hang');
    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('Khong co quyen xem don hang nay');
    }
    return order;
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Khong tim thay don hang');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Don hang da bi huy truoc do');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (dto.status === OrderStatus.CANCELLED) {
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
      }

      return tx.order.update({
        where: { id },
        data: { 
          status: dto.status,
          ...(dto.shippingProvider && { shippingProvider: dto.shippingProvider }),
          ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
          history: {
            create: [
              {
                oldStatus: order.status,
                newStatus: dto.status,
                createdBy: 'ADMIN',
              }
            ]
          }
        },
        include: {
          coupon: true,
          items: {
            include: {
              product: { select: { id: true, name: true, images: { select: { url: true, isPrimary: true } } } },
            },
          },
        },
      });
    });

    // Invalidate product cache after status change (e.g., cancellation)
    const affectedProductIds = order.items.map(item => item.productId);
    await Promise.all([
      ...affectedProductIds.map(id => this.redis.del('products:item:' + id)),
      this.redis.delByPattern('products:list:*'),
    ]);

    this.ordersGateway.notifyOrderStatusUpdated(updatedOrder);
    return updatedOrder;

  }

  // User‑initiated cancellation
  async cancelOrder(userId: number, orderId: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Khong tim thay don hang');
    if (order.userId !== userId) {
      throw new ForbiddenException('Khong co quyen huy don hang nay');
    }

    // Only allow cancellation in specific statuses
    const cancellable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException('Don hang khong the huy trong trạng thái hiện tại');
    }

    // Perform cancellation transaction (restock and update status)
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Restock each product or variant
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
      // Update order status to CANCELLED
      return tx.order.update({
        where: { id: orderId },
        data: { 
          status: OrderStatus.CANCELLED,
          cancelReason: reason || null,
          history: {
            create: [
              {
                oldStatus: order.status,
                newStatus: OrderStatus.CANCELLED,
                note: reason || 'Khách hàng tự hủy đơn',
                createdBy: 'CUSTOMER',
              }
            ]
          }
        },
        include: {
          coupon: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: { select: { url: true, isPrimary: true } },
                },
              },
            },
          },
        },
      });
    });

    // Invalidate product cache for affected items
    const affectedProductIds = order.items.map((i) => i.productId);
    await Promise.all([
      ...affectedProductIds.map((id) => this.redis.del('products:item:' + id)),
      this.redis.delByPattern('products:list:*'),
    ]);

    // Notify front‑end via gateway
    this.ordersGateway.notifyOrderStatusUpdated(updatedOrder);
    return updatedOrder;
  }
}
