import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, Role, DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersGateway } from '../notifications/orders.gateway.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrderDto, UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) {
      throw new BadRequestException('Danh sach mat hang co san pham bi lap lai');
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Mot hoac nhieu san pham khong ton tai');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      let totalAmount = 0;
      const orderItemsData: Array<{ productId: number; quantity: number; price: number }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException('San pham ' + product.name + ' khong du hang hoac vua co nguoi mua truoc!');
        }

        const itemPrice = Number(product.price);
        totalAmount += itemPrice * item.quantity;
        orderItemsData.push({
          productId: product.id,
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

      const order = await tx.order.create({
        data: {
          userId,
          totalAmount: finalAmount,
          discountAmount,
          couponId,
          status: OrderStatus.PENDING,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          coupon: true,
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      return order;
    });

    this.ordersGateway.notifyOrderCreated(createdOrder);
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
          items: {
            include: {
              product: { select: { id: true, name: true } },
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
        items: {
          include: {
            product: { select: { id: true, name: true, price: true } },
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
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: {
          coupon: true,
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    this.ordersGateway.notifyOrderStatusUpdated(updatedOrder);
    return updatedOrder;
  }
}