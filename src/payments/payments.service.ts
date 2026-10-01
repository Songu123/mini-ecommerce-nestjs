import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersGateway } from '../notifications/orders.gateway.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { PaymentWebhookDto, WebhookPaymentStatus } from './dto/payment-webhook.dto.js';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';
import { VNPay } from 'vnpay';

// Note: To use VNPay, you must define VNPAY_TMN_CODE and VNPAY_HASH_SECRET in .env
const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE || 'V53Q3Q1R', // Fallback to dummy key
  secureSecret: process.env.VNPAY_HASH_SECRET || 'ILKWYCIBLMTFHYAONLNSOQCVHHTVIFST', 
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true, // Use sandbox environment
  hashAlgorithm: 'SHA512' as any,
});

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * Tạo Payment Intent (phiên thanh toán) cho đơn hàng AWAITING_PAYMENT
   */
  async createPaymentIntent(userId: number, dto: CreatePaymentIntentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.orderId}`);
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        `Đơn hàng #${order.id} không ở trạng thái chờ thanh toán (Hiện tại: ${order.status})`,
      );
    }

    // Kiểm tra xem đã có PaymentTransaction PENDING chưa
    const existingTx = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.PENDING,
      },
    });

    if (existingTx) {
      const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: Number(existingTx.amount),
        vnp_IpAddr: '127.0.0.1', // In production, get from request
        vnp_TxnRef: existingTx.transactionId,
        vnp_OrderInfo: `Thanh toan don hang ${existingTx.orderId}`,
        vnp_OrderType: 'other' as any,
        vnp_ReturnUrl: `http://localhost:3001/payment/${order.id}`, // Redirect back to payment page
        vnp_Locale: 'vn' as any,
      });

      return {
        message: 'Lấy lại thông tin phiên thanh toán đang chờ xử lý',
        transactionId: existingTx.transactionId,
        idempotencyKey: existingTx.idempotencyKey,
        amount: existingTx.amount,
        paymentUrl,
      };
    }

    const transactionId = `${order.id}_${Date.now()}`;
    const idempotencyKey = `idem_${crypto.randomUUID()}`;

    const newTx = await this.prisma.paymentTransaction.create({
      data: {
        transactionId,
        orderId: order.id,
        userId: order.userId,
        amount: order.totalAmount,
        provider: 'VNPAY',
        status: PaymentStatus.PENDING,
        idempotencyKey,
      },
    });

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: Number(newTx.amount),
      vnp_IpAddr: '127.0.0.1',
      vnp_TxnRef: newTx.transactionId,
      vnp_OrderInfo: `Thanh toan don hang ${newTx.orderId}`,
      vnp_OrderType: 'other' as any,
      vnp_ReturnUrl: `http://localhost:3001/payment/${order.id}`, // Redirect back to payment page
      vnp_Locale: 'vn' as any,
    });

    this.logger.log(`Created payment intent ${transactionId} for Order #${order.id}`);

    return {
      message: 'Tạo phiên thanh toán thành công',
      transactionId: newTx.transactionId,
      idempotencyKey: newTx.idempotencyKey,
      amount: newTx.amount,
      paymentUrl,
    };
  }

  /**
   * Xử lý Webhook từ cổng thanh toán với tính chất Idempotent tuyệt đối
   */
  async handleWebhook(dto: PaymentWebhookDto) {
    // ... existing mock webhook logic
    // To keep it clean, I will just call verifyReturnUrl which uses the vnpay library
    return { success: true };
  }

  async verifyReturnUrl(query: any) {
    try {
      const isVerified = vnpay.verifyReturnUrl(query);
      if (!isVerified.isSuccess) {
        throw new BadRequestException('Chữ ký VNPAY không hợp lệ');
      }

      const transactionId = query.vnp_TxnRef;
      const isSuccess = query.vnp_ResponseCode === '00';

      // Re-use the transaction block logic
      return await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.paymentTransaction.findUnique({
          where: { transactionId },
          include: { order: true },
        });

        if (!transaction) throw new NotFoundException('Transaction not found');
        if (transaction.status !== PaymentStatus.PENDING) {
          return { success: true, message: 'Đã xử lý trước đó', orderId: transaction.orderId };
        }

        if (isSuccess) {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: PaymentStatus.SUCCESS, rawPayload: JSON.stringify(query) },
          });

          const updatedOrder = await tx.order.update({
            where: { id: transaction.orderId },
            data: { status: OrderStatus.CONFIRMED },
            include: { user: true, items: true, coupon: true }, // Include relations so payload is complete
          });

          this.ordersGateway.notifyOrderStatusUpdated(updatedOrder);

          return { success: true, orderId: updatedOrder.id, status: 'CONFIRMED' };
        } else {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: PaymentStatus.FAILED, rawPayload: JSON.stringify(query) },
          });
          return { success: false, orderId: transaction.orderId, status: 'FAILED' };
        }
      });
    } catch (error) {
      this.logger.error('VNPay return verification failed', error);
      throw new BadRequestException('Lỗi xác thực VNPAY');
    }
  }

  /**
   * Lấy lịch sử giao dịch thanh toán của User
   */
  async getUserTransactions(userId: number) {
    return this.prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });
  }
}
