import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({ example: 'SALE50K', description: 'Mã giảm giá muốn áp dụng' })
  @IsString()
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  code: string;

  @ApiProperty({ example: 500000, description: 'Tổng tiền đơn hàng hiện tại để kiểm tra điều kiện' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  orderTotal: number;
}