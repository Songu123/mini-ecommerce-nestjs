import { Controller, Get, Post, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service.js';
import { CalculateFeeDto } from './dto/calculate-fee.dto.js';

@ApiTags('Shipping (GHN)')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách Tỉnh/Thành phố' })
  getProvinces() {
    return this.shippingService.getProvinces();
  }

  @Get('districts')
  @ApiOperation({ summary: 'Lấy danh sách Quận/Huyện theo Tỉnh/Thành phố' })
  getDistricts(@Query('province_id', ParseIntPipe) provinceId: number) {
    return this.shippingService.getDistricts(provinceId);
  }

  @Get('wards')
  @ApiOperation({ summary: 'Lấy danh sách Phường/Xã theo Quận/Huyện' })
  getWards(@Query('district_id', ParseIntPipe) districtId: number) {
    return this.shippingService.getWards(districtId);
  }

  @Post('fee')
  @ApiOperation({ summary: 'Tính phí giao hàng (GHN)' })
  calculateFee(@Body() dto: CalculateFeeDto) {
    return this.shippingService.calculateFee(dto);
  }
}
