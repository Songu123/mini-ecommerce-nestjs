import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { QueryReviewDto } from './dto/query-review.dto.js';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Tạo hoặc cập nhật đánh giá sản phẩm (Chỉ áp dụng với Verified Purchase)
   */
  async upsertReview(userId: number, dto: CreateReviewDto) {
    // 1. Kiểm tra sản phẩm có tồn tại không
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${dto.productId}`);
    }

    // 2. Verified Purchase: Kiểm tra user có đơn hàng DELIVERED chứa sản phẩm này không
    const deliveredOrderWithProduct = await this.prisma.order.findFirst({
      where: {
        userId,
        status: OrderStatus.DELIVERED,
        items: {
          some: {
            productId: dto.productId,
          },
        },
      },
    });

    if (!deliveredOrderWithProduct) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và đơn hàng được giao thành công (DELIVERED)',
      );
    }

    // 3. Upsert Review: Tạo mới hoặc cập nhật nếu đã từng đánh giá
    const review = await this.prisma.review.upsert({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
      create: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 4. Invalidate cache Redis cho sản phẩm
    await this.redisService.del(`product:${dto.productId}`);
    await this.redisService.delByPattern('products:list:*');

    return {
      message: 'Gửi đánh giá sản phẩm thành công',
      review,
    };
  }

  /**
   * Lấy danh sách review của sản phẩm kèm phân trang và thống kê số sao
   */
  async getProductReviews(productId: number, query: QueryReviewDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    const [total, reviews, aggregate] = await Promise.all([
      this.prisma.review.count({ where: { productId } }),
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // Thống kê phân bố theo từng sao (1-5 sao)
    const starCounts = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: { rating: true },
    });

    const starDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of starCounts) {
      starDistribution[item.rating] = item._count.rating;
    }

    const averageRating = aggregate._avg.rating
      ? Number(aggregate._avg.rating.toFixed(1))
      : 0;

    return {
      productId,
      summary: {
        averageRating,
        totalReviews: total,
        starDistribution,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      reviews,
    };
  }

  /**
   * Xóa review của chính mình
   */
  async deleteReview(userId: number, productId: number) {
    const existing = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy đánh giá của bạn cho sản phẩm này');
    }

    await this.prisma.review.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    // Invalidate cache
    await this.redisService.del(`product:${productId}`);
    await this.redisService.delByPattern('products:list:*');

    return {
      message: 'Xóa đánh giá thành công',
    };
  }
}
