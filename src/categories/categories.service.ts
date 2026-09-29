import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly CACHE_KEY_ALL = 'categories:all';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Danh muc \"' + dto.name + '\" da ton tai');
    }

    const created = await this.prisma.category.create({
      data: dto,
    });

    // Xóa cache danh mục
    await this.redis.del(this.CACHE_KEY_ALL);

    return created;
  }

  async findAll() {
    // 1. Kiểm tra trong Cache Redis
    const cached = await this.redis.get(this.CACHE_KEY_ALL);
    if (cached) {
      this.logger.log('⚡ Cache Hit: Lay danh muc tu Redis');
      return cached;
    }

    // 2. Cache Miss: Truy vấn DB
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Ghi cache với TTL 3600s (1 giờ)
    await this.redis.set(this.CACHE_KEY_ALL, categories, 3600);

    return categories;
  }

  async findOne(id: number) {
    const cacheKey = 'categories:' + id;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log('⚡ Cache Hit: Lay chi tiet danh muc tu Redis');
      return cached;
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          take: 10,
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Khong tim thay danh muc voi ID ' + id);
    }

    await this.redis.set(cacheKey, category, 1800);

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ten danh muc \"' + dto.name + '\" da duoc su dung');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
    });

    // Invalidate Cache
    await Promise.all([
      this.redis.del(this.CACHE_KEY_ALL),
      this.redis.del('categories:' + id),
    ]);

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deleted = await this.prisma.category.delete({
      where: { id },
    });

    // Invalidate Cache
    await Promise.all([
      this.redis.del(this.CACHE_KEY_ALL),
      this.redis.del('categories:' + id),
      this.redis.delByPattern('products:*'),
    ]);

    return deleted;
  }
}