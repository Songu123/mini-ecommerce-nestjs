import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Khong tim thay danh muc voi ID ' + dto.categoryId);
    }

    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Invalidate Cache danh sách sản phẩm
    await this.redis.delByPattern('products:*');

    return created;
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Tạo cache key độc nhất từ toàn bộ query filter
    const cacheKey = 'products:list:' + JSON.stringify(query);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log('⚡ Cache Hit: Lay danh sach san pham tu Redis');
      return cached;
    }

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
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

    // Cache kết quả tìm kiếm/phân trang trong 300s (5 phút)
    await this.redis.set(cacheKey, result, 300);

    return result;
  }

  async findOne(id: number) {
    const cacheKey = 'products:item:' + id;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log('⚡ Cache Hit: Lay chi tiet san pham tu Redis (' + id + ')');
      return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Khong tim thay san pham voi ID ' + id);
    }

    // Cache chi tiết sản phẩm trong 1800s (30 phút)
    await this.redis.set(cacheKey, product, 1800);

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Khong tim thay danh muc voi ID ' + dto.categoryId);
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Xóa cache chi tiết và danh sách sản phẩm
    await Promise.all([
      this.redis.del('products:item:' + id),
      this.redis.delByPattern('products:list:*'),
    ]);

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deleted = await this.prisma.product.delete({
      where: { id },
    });

    // Invalidate Cache
    await Promise.all([
      this.redis.del('products:item:' + id),
      this.redis.delByPattern('products:*'),
    ]);

    return deleted;
  }
}