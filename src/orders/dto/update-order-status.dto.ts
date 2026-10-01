import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
    description: 'Trạng thái mới của đơn hàng',
  })
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'GHTK', description: 'Đơn vị vận chuyển (Bắt buộc khi SHIPPED)' })
  @IsOptional()
  shippingProvider?: string;

  @ApiPropertyOptional({ example: 'S222.123456789', description: 'Mã vận đơn (Bắt buộc khi SHIPPED)' })
  @IsOptional()
  trackingNumber?: string;
}

export class QueryOrderDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Lọc theo trạng thái đơn hàng',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
