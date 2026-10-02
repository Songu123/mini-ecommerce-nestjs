import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy các chỉ số thống kê cho Admin Dashboard' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lấy danh sách người dùng và tổng chi tiêu (CRM)' })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/ban')
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản khách hàng' })
  toggleBanUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.adminService.toggleBanUser(id, req.user.id);
  }

  @Get('export/orders')
  @ApiOperation({ summary: 'Xuất danh sách đơn hàng ra file Excel' })
  async exportOrders(@Res() res: Response) {
    const buffer = await this.adminService.exportOrdersToExcel();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'orders-report.xlsx');
    
    return res.send(buffer);
  }
}
