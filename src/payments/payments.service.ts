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
      return {
        message: 'Lấy lại thông tin phiên thanh toán đang chờ xử lý',
        transactionId: existingTx.transactionId,
        idempotencyKey: existingTx.idempotencyKey,
        amount: existingTx.amount,
        paymentUrl: `https://sandbox.vnpay.vn/payment/pay?txn=${existingTx.transactionId}&amount=${existingTx.amount}`,
      };
    }

    const transactionId = `TXN_${Date.now()}_${order.id}_${crypto.randomBytes(4).toString('hex')}`;
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

    this.logger.log(`Created payment intent ${transactionId} for Order #${order.id}`);

    return {
      message: 'Tạo phiên thanh toán thành công',
      transactionId: newTx.transactionId,
      idempotencyKey: newTx.idempotencyKey,
      amount: newTx.amount,
      paymentUrl: `https://sandbox.vnpay.vn/payment/pay?txn=${newTx.transactionId}&amount=${newTx.amount}`,
    };
  }

  /**
   * Xử lý Webhook từ cổng thanh toán với tính chất Idempotent tuyệt đối
   */
  async handleWebhook(dto: PaymentWebhookDto) {
    this.logger.log(`Received webhook for transactionId: ${dto.transactionId}, idempotencyKey: ${dto.idempotencyKey}`);

    // 1. Kiểm tra Idempotency: nếu giao dịch đã hoàn tất (SUCCESS/FAILED) thì trả về kết quả cũ ngay lập tức
    const existingTx = await this.prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { idempotencyKey: dto.idempotencyKey },
          { transactionId: dto.transactionId },
        ],
      },
    });

    if (existingTx && existingTx.status !== PaymentStatus.PENDING) {
      this.logger.warn(
        `Idempotent Webhook detected: Transaction ${existingTx.transactionId} already processed with status ${existingTx.status}. Skipping duplicate execution.`,
      );
      return {
        success: true,
        idempotent: true,
        message: `Giao dịch đã được xử lý trước đó với trạng thái: ${existingTx.status}`,
        transactionId: existingTx.transactionId,
        status: existingTx.status,
      };
    }

    // 2. Thực hiện transaction ACID để cập nhật PaymentTransaction và Order Status
    return await this.prisma.$transaction(async (tx) => {
      // Tìm lại transaction cần cập nhật
      const transaction = await tx.paymentTransaction.findUnique({
        where: { transactionId: dto.transactionId },
        include: { order: { include: { items: true } } },
      });

      if (!transaction) {
        throw new NotFoundException(`Không tìm thấy giao dịch thanh toán ${dto.transactionId}`);
      }

      if (transaction.status !== PaymentStatus.PENDING) {
        return {
          success: true,
          idempotent: true,
          message: `Giao dịch đã được xử lý trước đó`,
          status: transaction.status,
        };
      }

      if (dto.status === WebhookPaymentStatus.SUCCESS) {
        // Cập nhật PaymentTransaction thành SUCCESS
        const updatedTx = await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentStatus.SUCCESS,
            rawPayload: JSON.stringify(dto),
          },
        });

        // Cập nhật Order sang CONFIRMED
        const updatedOrder = await tx.order.update({
          where: { id: transaction.orderId },
          data: { status: OrderStatus.CONFIRMED },
        });

        this.logger.log(`Order #${updatedOrder.id} successfully paid and marked as CONFIRMED.`);

        // Bắn Socket.io thông báo
        this.ordersGateway.notifyOrderCreated({
          orderId: updatedOrder.id,
          userId: updatedOrder.userId,
          status: updatedOrder.status,
          message: `Đơn hàng #${updatedOrder.id} đã được thanh toán thành công qua cổng thanh toán!`,
        });

        return {
          success: true,
          idempotent: false,
          message: 'Thanh toán đơn hàng thành công',
          orderId: updatedOrder.id,
          orderStatus: updatedOrder.status,
          transactionStatus: updatedTx.status,
        };
      } else {
        // Thanh toán thất bại -> Cập nhật PaymentTransaction thành FAILED
        const updatedTx = await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentStatus.FAILED,
            rawPayload: JSON.stringify(dto),
          },
        });

        this.logger.warn(`Payment failed for Order #${transaction.orderId}. Order remains AWAITING_PAYMENT until retry or TTL expiration.`);

        return {
          success: false,
          idempotent: false,
          message: 'Giao dịch thanh toán thất bại',
          orderId: transaction.orderId,
          transactionStatus: updatedTx.status,
        };
      }
    });
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
