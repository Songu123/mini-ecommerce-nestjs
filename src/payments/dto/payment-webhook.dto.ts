import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum WebhookPaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class PaymentWebhookDto {
  @ApiProperty({ example: 'TXN_1727600000000_1', description: 'Mã giao dịch từ Payment Gateway' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ example: 'idem_key_order_1_1727600000000', description: 'Idempotency key chống trùng lặp request' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ example: 1, description: 'ID của đơn hàng' })
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({ example: 250000, description: 'Số tiền thanh toán' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: WebhookPaymentStatus, example: WebhookPaymentStatus.SUCCESS, description: 'Trạng thái thanh toán từ gateway' })
  @IsEnum(WebhookPaymentStatus)
  @IsNotEmpty()
  status: WebhookPaymentStatus;

  @ApiPropertyOptional({ example: 'Thanh toán thành công qua thẻ ATM', description: 'Ghi chú hoặc dữ liệu bổ sung' })
  @IsString()
  @IsOptional()
  message?: string;
}
