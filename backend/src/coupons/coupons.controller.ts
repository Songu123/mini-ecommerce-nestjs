import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CouponsService } from './coupons.service.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { ApplyCouponDto } from './dto/apply-coupon.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mã giảm giá mới (Chỉ dành cho ADMIN)' })
  @ApiResponse({ status: 201, description: 'Tạo mã thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ ADMIN mới có quyền' })
  create(@Body() createCouponDto: CreateCouponDto, @Req() req: any) {
    return this.couponsService.create(createCouponDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các mã giảm giá đang hoạt động (Public)' })
  findAllActive() {
    return this.couponsService.findAllActive();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách mã giảm giá (Chỉ dành cho ADMIN)' })
  findAll() {
    return this.couponsService.findAll();
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra mã giảm giá và tính toán số tiền được giảm' })
  @ApiResponse({ status: 200, description: 'Mã hợp lệ và thông tin chiết khấu' })
  @ApiResponse({ status: 400, description: 'Mã hết hạn, hết lượt dùng hoặc chưa đạt đơn tối thiểu' })
  apply(@Body() applyCouponDto: ApplyCouponDto) {
    return this.couponsService.validateAndCalculate(applyCouponDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa mã giảm giá theo ID (Chỉ dành cho ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }
}