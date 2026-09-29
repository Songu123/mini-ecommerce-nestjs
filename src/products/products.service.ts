import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import fs from 'fs';
import path from 'path';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Không tìm thấy danh mục với ID ' + dto.categoryId);
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
        images: true,
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
    const cached = await this.redis.get<any>(cacheKey);
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
          images: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
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
    const cached = await this.redis.get<any>(cacheKey);
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
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm với ID ' + id);
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
        throw new BadRequestException('Không tìm thấy danh mục với ID ' + dto.categoryId);
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: {
          select: { id: true, name: true },
        },
        images: true,
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
    const product = await this.findOne(id);

    // Xóa tất cả file ảnh vật lý hoặc trên Cloudinary
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.url.startsWith('http')) {
          // Trích xuất publicId Cloudinary nếu là link cloudinary
          const parts = img.url.split('/');
          const filenameWithExt = parts.slice(-2).join('/'); // folder/name.ext
          const publicId = filenameWithExt.substring(0, filenameWithExt.lastIndexOf('.'));
          await this.cloudinary.deleteFile(publicId);
        } else {
          try {
            const filePath = path.join(process.cwd(), img.url.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (err: any) {
            this.logger.warn(`Failed to delete local image file: ${err?.message || err}`);
          }
        }
      }
    }

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

  /**
   * Thêm danh sách ảnh mới cho sản phẩm (Hỗ trợ cả Cloudinary và Local Storage)
   */
  async addProductImages(productId: number, files: Express.Multer.File[]) {
    await this.findOne(productId);

    // Kiểm tra xem sản phẩm đã có ảnh primary nào chưa
    const existingPrimary = await this.prisma.productImage.findFirst({
      where: { productId, isPrimary: true },
    });

    const createdImages = [];
    let hasPrimary = !!existingPrimary;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let imageUrl: string;

      if (this.cloudinary.isEnabled && file.buffer) {
        // Upload lên Cloudinary
        const uploadRes = await this.cloudinary.uploadFile(file);
        imageUrl = uploadRes.url;
      } else {
        // Lưu cục bộ local storage
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `product-${productId}-${uniqueSuffix}${ext}`;
        const uploadDir = path.join(process.cwd(), 'uploads/products');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
        imageUrl = `/uploads/products/${filename}`;
      }

      const isPrimary = !hasPrimary && i === 0;
      if (isPrimary) hasPrimary = true;

      const img = await this.prisma.productImage.create({
        data: {
          productId,
          url: imageUrl,
          isPrimary,
        },
      });
      createdImages.push(img);
    }

    // Xóa cache Redis
    await Promise.all([
      this.redis.del('products:item:' + productId),
      this.redis.delByPattern('products:list:*'),
    ]);

    return {
      message: `Đã tải lên thành công ${files.length} hình ảnh cho sản phẩm #${productId}`,
      storage: this.cloudinary.isEnabled ? 'Cloudinary (Cloud Storage)' : 'Local Storage (/uploads/products)',
      images: createdImages,
    };
  }

  /**
   * Đặt 1 ảnh làm ảnh đại diện chính (Primary image)
   */
  async setPrimaryImage(productId: number, imageId: number) {
    await this.findOne(productId);

    const targetImage = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!targetImage || targetImage.productId !== productId) {
      throw new NotFoundException(`Không tìm thấy hình ảnh #${imageId} thuộc sản phẩm #${productId}`);
    }

    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    // Xóa cache
    await Promise.all([
      this.redis.del('products:item:' + productId),
      this.redis.delByPattern('products:list:*'),
    ]);

    return {
      message: `Đã đặt hình ảnh #${imageId} làm ảnh đại diện chính của sản phẩm #${productId}`,
    };
  }

  /**
   * Xóa 1 ảnh cụ thể khỏi sản phẩm
   */
  async deleteProductImage(productId: number, imageId: number) {
    await this.findOne(productId);

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== productId) {
      throw new NotFoundException(`Không tìm thấy hình ảnh #${imageId} thuộc sản phẩm #${productId}`);
    }

    // Xóa file vật lý hoặc Cloudinary
    if (image.url.startsWith('http')) {
      const parts = image.url.split('/');
      const filenameWithExt = parts.slice(-2).join('/');
      const publicId = filenameWithExt.substring(0, filenameWithExt.lastIndexOf('.'));
      await this.cloudinary.deleteFile(publicId);
    } else {
      try {
        const filePath = path.join(process.cwd(), image.url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to delete local image file: ${err?.message || err}`);
      }
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    // Nếu ảnh vừa xóa là ảnh primary, tự động chuyển ảnh đầu tiên còn lại thành primary
    if (image.isPrimary) {
      const nextImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { createdAt: 'asc' },
      });
      if (nextImage) {
        await this.prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    // Xóa cache
    await Promise.all([
      this.redis.del('products:item:' + productId),
      this.redis.delByPattern('products:list:*'),
    ]);

    return {
      message: `Đã xóa hình ảnh #${imageId} thành công`,
    };
  }
}
