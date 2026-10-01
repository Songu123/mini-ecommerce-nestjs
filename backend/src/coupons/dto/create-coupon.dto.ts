import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'SALE50K', description: 'Mã giảm giá (viết hoa, duy nhất)' })
  @IsString({ message: 'Mã coupon phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã coupon không được để trống' })
  code: string;

  @ApiPropertyOptional({ example: 'Giảm 50.000đ cho đơn hàng từ 300.000đ', description: 'Mô tả chương trình' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.FIXED_AMOUNT, description: 'Loại giảm giá (PERCENTAGE hoặc FIXED_AMOUNT)' })
  @IsEnum(DiscountType, { message: 'Loại giảm giá không hợp lệ' })
  discountType: DiscountType;

  @ApiProperty({ example: 50000, description: 'Giá trị giảm (ví dụ: 50000 hoặc 10%)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  discountValue: number;

  @ApiPropertyOptional({ example: 300000, description: 'Giá trị đơn hàng tối thiểu để áp dụng mã' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Số tiền giảm tối đa (khi áp dụng theo %)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ example: 100, description: 'Số lượt sử dụng tối đa của mã' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usageLimit: number;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z', description: 'Ngày bắt đầu có hiệu lực' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z', description: 'Ngày hết hạn của mã' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;
}