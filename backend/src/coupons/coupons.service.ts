import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { ApplyCouponDto } from './dto/apply-coupon.dto.js';

@Injectable()
export class CouponsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  /**
   * Tạo mã giảm giá mới (Chỉ ADMIN)
   */
  async create(dto: CreateCouponDto, userId?: number) {
    const formattedCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.coupon.findUnique({
      where: { code: formattedCode },
    });

    if (existing) {
      throw new ConflictException('Ma giam gia \"' + formattedCode + '\" da ton tai');
    }

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Ngay bat dau phai truoc ngay ket thuc');
    }

    const newCoupon = await this.prisma.coupon.create({
      data: {
        ...dto,
        code: formattedCode,
      },
    });

    if (userId) {
      await this.auditService.logAction(
        userId,
        'CREATE_COUPON',
        'Coupon',
        newCoupon.id.toString(),
        { code: newCoupon.code, discount: newCoupon.discountValue }
      );
    }

    return newCoupon;
  }

  /**
   * Lấy danh sách các mã giảm giá đang còn hiệu lực
   */
  async findAllActive() {
    const now = new Date();
    return this.prisma.coupon.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy toàn bộ danh sách mã giảm giá (Chỉ ADMIN)
   */
  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Kiểm tra và tính toán số tiền giảm giá
   */
  async validateAndCalculate(dto: ApplyCouponDto) {
    const formattedCode = dto.code.trim().toUpperCase();
    const now = new Date();

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: formattedCode },
    });

    if (!coupon) {
      throw new NotFoundException('Ma giam gia \"' + formattedCode + '\" khong ton tai');
    }

    // 1. Kiểm tra ngày hiệu lực
    if (now < coupon.startDate) {
      throw new BadRequestException('Chuong trinh khuyen mai chua bat dau');
    }
    if (now > coupon.endDate) {
      throw new BadRequestException('Ma giam gia da het han su dung');
    }

    // 2. Kiểm tra số lượt dùng còn lại
    if (coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Ma giam gia da het luot su dung');
    }

    // 3. Kiểm tra giá trị đơn hàng tối thiểu
    if (coupon.minOrderValue && dto.orderTotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        'Don hang toi thieu phai tu ' + Number(coupon.minOrderValue).toLocaleString('vi-VN') + ' d de ap dung ma nay',
      );
    }

    // 4. Tính toán số tiền được giảm
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (dto.orderTotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
        discountAmount = Number(coupon.maxDiscount);
      }
    } else {
      discountAmount = Number(coupon.discountValue);
      if (discountAmount > dto.orderTotal) {
        discountAmount = dto.orderTotal;
      }
    }

    const finalTotal = Math.max(0, dto.orderTotal - discountAmount);

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      originalTotal: dto.orderTotal,
      finalTotal,
    };
  }

  /**
   * Xóa mã giảm giá (Chỉ ADMIN)
   */
  async remove(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Khong tim thay ma giam gia voi ID ' + id);
    }

    return this.prisma.coupon.delete({
      where: { id },
    });
  }
}