import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
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

  /**
   * Tạo đơn hàng với Transaction đảm bảo trừ tồn kho và tính tiền an toàn (ACID)
   */
  async create(userId: number, dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);

    // Kiểm tra danh sách trùng lặp productId trong cùng 1 request
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) {
      throw new BadRequestException('Danh sách mặt hàng có sản phẩm bị lặp lại');
    }

    // Thực hiện trong Prisma Transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin các sản phẩm trong database
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Một hoặc nhiều sản phẩm không tồn tại trên hệ thống');
      }

      // Tạo map để tra cứu nhanh thông tin sản phẩm
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const orderItemsData: Array<{
        productId: number;
        quantity: number;
        price: number;
      }> = [];

      // 2. Kiểm tra tồn kho và khấu trừ số lượng nguyên tử (Atomic Check-and-Decrement)
      // Chống Race Condition tuyệt đối khi nhiều người đặt cùng lúc
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;

        // Cập nhật nguyên tử trực tiếp ở tầng Database:
        // Chỉ trừ kho NẾU VÀ CHỈ NẾU stock >= item.quantity tại đúng thời điểm thực thi
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        // Nếu updateResult.count === 0, nghĩa là sản phẩm đã bị người khác mua mất trong tích tắc
        if (updateResult.count === 0) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" không đủ hàng trong kho hoặc vừa có người khác mua trước!`,
          );
        }

        const itemPrice = Number(product.price);
        totalAmount += itemPrice * item.quantity;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: itemPrice,
        });
      }

      // 3. Tạo bản ghi đơn hàng Order kèm chi tiết OrderItem
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return order;
    });

    // 4. Phát thông báo Real-time sau khi Transaction đã commit thành công
    this.ordersGateway.notifyOrderCreated(createdOrder);

    return createdOrder;
  }

  /**
   * Lấy danh sách đơn hàng
   * - CUSTOMER: Chỉ xem đơn của chính mình
   * - ADMIN: Xem toàn bộ đơn hàng
   */
  async findAll(user: { id: number; role: Role }, query: QueryOrderDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (user.role !== Role.ADMIN) {
      where.userId = user.id;
    }

    if (status) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Lấy chi tiết đơn hàng
   */
  async findOne(id: number, user: { id: number; role: Role }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${id}`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }

    return order;
  }

  /**
   * Cập nhật trạng thái đơn hàng (Chỉ ADMIN)
   * Nếu trạng thái chuyển thành CANCELLED -> Tự động hoàn kho (Restock)
   */
  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${id}`);
    }

    // Nếu đơn hàng đã bị hủy trước đó thì không cho sửa nữa
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng này đã bị hủy trước đó');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Nếu hủy đơn hàng, hoàn trả lại số lượng tồn kho cho các sản phẩm
      if (dto.status === OrderStatus.CANCELLED) {
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
      }

      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
    });

    // Phát thông báo Real-time cập nhật trạng thái đơn
    this.ordersGateway.notifyOrderStatusUpdated(updatedOrder);

    return updatedOrder;
  }
}
