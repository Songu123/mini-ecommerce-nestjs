import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'test@gmail.com',
        pass: process.env.EMAIL_PASS || 'fake-password',
      },
    });
  }

  async sendOrderConfirmation(email: string, orderId: number, totalAmount: number) {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-w-md; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5; text-align: center;">Cảm ơn bạn đã đặt hàng!</h2>
        <p>Xin chào,</p>
        <p>Đơn hàng <strong>#${orderId}</strong> của bạn đã được hệ thống ghi nhận thành công.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #4b5563;">Tổng thanh toán:</p>
          <h3 style="margin: 5px 0 0 0; color: #111827; font-size: 24px;">${formatCurrency(totalAmount)}</h3>
        </div>
        <p>Chúng tôi sẽ sớm liên hệ để giao hàng cho bạn.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Mini E-Commerce Store</p>
      </div>
    `;

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await this.transporter.sendMail({
          from: `"Mini E-Commerce" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `Xác nhận đơn hàng #${orderId}`,
          html: htmlContent,
        });
        this.logger.log(`Email xác nhận đã gửi đến ${email} cho đơn hàng #${orderId}`);
      } else {
        this.logger.warn(`EMAIL_USER hoặc EMAIL_PASS chưa được cấu hình. Bỏ qua việc gửi email thực tế cho ${email}.`);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi gửi email xác nhận cho ${email}:`, error);
    }
  }
}
