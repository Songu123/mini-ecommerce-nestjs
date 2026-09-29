import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 1, description: 'ID của đơn hàng cần thanh toán' })
  @IsInt()
  @IsNotEmpty()
  orderId: number;
}
