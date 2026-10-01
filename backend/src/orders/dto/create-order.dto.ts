import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  Matches,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ example: 1, description: 'ID của sản phẩm cần đặt mua' })
  @Type(() => Number)
  @IsInt({ message: 'ID sản phẩm phải là số nguyên' })
  @IsPositive({ message: 'ID sản phẩm không hợp lệ' })
  productId: number;

  @ApiProperty({ example: 2, description: 'Số lượng mua (lớn hơn 0)' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @IsPositive({ message: 'Số lượng mua phải lớn hơn 0' })
  quantity: number;

  @ApiPropertyOptional({ example: 3, description: 'ID phân loại sản phẩm (nếu có)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productVariantId?: number;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [OrderItemDto],
    description: 'Danh sách các mặt hàng trong đơn hàng',
  })
  @IsArray({ message: 'Danh sách mặt hàng phải là mảng' })
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ example: 'SALE50K', description: 'Mã giảm giá áp dụng (nếu có)' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: '123 Đường Nguyễn Huệ, Quận 1', description: 'Địa chỉ nhận hàng' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'COD', description: 'Phương thức thanh toán' })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại liên hệ' })
  @IsOptional()
  @IsString()
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Giao giờ hành chính', description: 'Ghi chú đơn hàng' })
  @IsOptional()
  @IsString()
  note?: string;
}