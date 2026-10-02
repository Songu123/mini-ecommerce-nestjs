import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OrderStatus } from '@prisma/client';
import ExcelJS from 'exceljs';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Promise.all to fetch everything concurrently
    const [
      ordersToday,
      revenueToday,
      lowStockProducts,
      stuckOrders,
    ] = await Promise.all([
      // Fetch all orders created today
      this.prisma.order.findMany({
        where: { createdAt: { gte: today } },
        select: { status: true, totalAmount: true },
      }),
      // Sum of revenue for delivered orders today (or confirmed/shipped/delivered)
      // Usually, revenue is counted if order is not cancelled, but let's count all non-cancelled.
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: today },
          status: { notIn: [OrderStatus.CANCELLED] },
        },
        _sum: { totalAmount: true },
      }),
      // Low stock products
      this.prisma.product.findMany({
        where: { stock: { lt: 10 } },
        select: { id: true, name: true, stock: true },
        take: 10,
        orderBy: { stock: 'asc' },
      }),
      // Stuck orders (PENDING for more than 24 hours)
      this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const totalOrdersToday = ordersToday.length;
    const deliveredToday = ordersToday.filter(o => o.status === OrderStatus.DELIVERED).length;
    const cancelledToday = ordersToday.filter(o => o.status === OrderStatus.CANCELLED).length;

    return {
      overview: {
        revenueToday: Number(revenueToday._sum.totalAmount || 0),
        totalOrdersToday,
        deliveredToday,
        cancelledToday,
        cancelRate: totalOrdersToday > 0 ? (cancelledToday / totalOrdersToday) * 100 : 0,
      },
      alerts: {
        lowStockProducts,
        stuckOrders,
      },
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { orders: true }
        },
        orders: {
          where: { status: 'DELIVERED' },
          select: { totalAmount: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(u => {
      const totalSpent = u.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
        totalOrders: u._count.orders,
        totalSpent
      };
    });
  }

  async toggleBanUser(userId: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy khách hàng');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive }
    });

    await this.auditService.logAction(
      adminId,
      updatedUser.isActive ? 'UNBAN_USER' : 'BAN_USER',
      'User',
      updatedUser.id.toString(),
      { email: updatedUser.email, wasActive: user.isActive, nowActive: updatedUser.isActive }
    );

    return { success: true, isActive: updatedUser.isActive };
  }

  async exportOrdersToExcel(): Promise<Buffer> {
    const orders = await this.prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { product: { select: { name: true } }, quantity: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh Sách Đơn Hàng');

    worksheet.columns = [
      { header: 'Mã ĐH', key: 'id', width: 10 },
      { header: 'Ngày Tạo', key: 'createdAt', width: 20 },
      { header: 'Khách Hàng', key: 'customer', width: 25 },
      { header: 'Số Điện Thoại', key: 'phone', width: 15 },
      { header: 'Địa Chỉ', key: 'address', width: 40 },
      { header: 'Trạng Thái', key: 'status', width: 15 },
      { header: 'Tổng Tiền', key: 'totalAmount', width: 15 },
      { header: 'Phí Ship', key: 'shippingFee', width: 15 },
      { header: 'Chi Tiết SP', key: 'items', width: 50 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    orders.forEach(order => {
      const itemsStr = order.items.map(i => `${i.product.name} (SL: ${i.quantity})`).join(', ');
      
      worksheet.addRow({
        id: order.id,
        createdAt: order.createdAt.toLocaleString('vi-VN'),
        customer: order.user.name || order.user.email,
        phone: order.phone || '',
        address: order.shippingAddress || '',
        status: order.status,
        totalAmount: Number(order.totalAmount),
        shippingFee: Number(order.shippingFee),
        items: itemsStr,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
