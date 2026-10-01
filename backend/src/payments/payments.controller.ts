import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { PaymentWebhookDto } from './dto/payment-webhook.dto.js';

@ApiTags('Payments (Cổng Thanh Toán)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo phiên/link thanh toán cho đơn hàng (Stripe/VNPay sandbox)' })
  @ApiResponse({ status: 201, description: 'Tạo phiên thanh toán thành công' })
  @ApiResponse({ status: 400, description: 'Đơn hàng không ở trạng thái AWAITING_PAYMENT' })
  async createPaymentIntent(@CurrentUser() user: any, @Body() dto: CreatePaymentIntentDto) {
    const userId = user.id ?? user.userId;
    return this.paymentsService.createPaymentIntent(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook nhận thông báo kết quả thanh toán với tính chất Idempotent' })
  @ApiResponse({ status: 200, description: 'Xử lý webhook thành công (hoặc trả kết quả idempotent nếu gọi trùng lặp)' })
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }

  @Get('vnpay-return')
  @ApiOperation({ summary: 'Xử lý Return URL từ VNPAY redirect về' })
  async vnpayReturn(@Req() req: any) {
    return this.paymentsService.verifyReturnUrl(req.query);
  }

  @Get('my-transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử các giao dịch thanh toán của tài khoản đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch thanh toán' })
  async getMyTransactions(@CurrentUser() user: any) {
    const userId = user.id ?? user.userId;
    return this.paymentsService.getUserTransactions(userId);
  }
}
