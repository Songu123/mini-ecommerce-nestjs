import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service.js';
import { ShippingController } from './shipping.controller.js';

@Module({
  providers: [ShippingService],
  controllers: [ShippingController]
})
export class ShippingModule {}
