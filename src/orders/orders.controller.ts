import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrderDto, UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Giới hạn tối đa 10 lần đặt hàng trong 1 phút để chống spam tạo đơn rác
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({
    summary: 'Đặt hàng mới (Trừ tồn kho tự động qua ACID Transaction - Giới hạn 10 đơn/phút)',
  })
  @ApiResponse({ status: 201, description: 'Đặt hàng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Sản phẩm không đủ tồn kho hoặc không tồn tại',
  })
  @ApiResponse({
    status: 429,
    description: 'Quá nhiều yêu cầu tạo đơn liên tiếp (Throttled)',
  })
  create(@CurrentUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách đơn hàng (Customer xem đơn của mình, Admin xem toàn bộ đơn hệ thống)',
  })
  findAll(@CurrentUser() user: any, @Query() query: QueryOrderDto) {
    return this.ordersService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết đơn hàng theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập đơn hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Cập nhật trạng thái đơn hàng (Chỉ dành cho ADMIN - Tự động hoàn kho nếu chuyển sang CANCELLED)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ ADMIN mới có quyền thực hiện' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }
}
