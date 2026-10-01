import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin giỏ hàng của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Chi tiết giỏ hàng và danh sách sản phẩm' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getOrCreateCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng (Tự động cộng dồn số lượng)' })
  @ApiResponse({ status: 201, description: 'Thêm vào giỏ thành công' })
  @ApiResponse({ status: 400, description: 'Vượt quá số lượng tồn kho' })
  addToCart(@CurrentUser() user: any, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(user.id, addToCartDto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Cập nhật số lượng của một mặt hàng trong giỏ (Truyền 0 để xóa)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  updateItem(
    @CurrentUser() user: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.id, productId, updateDto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Xóa một sản phẩm ra khỏi giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  removeItem(
    @CurrentUser() user: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('variantId') variantId?: string,
  ) {
    return this.cartService.removeCartItem(user.id, productId, variantId ? parseInt(variantId) : undefined);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dọn sạch toàn bộ giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Giỏ hàng đã được làm trống' })
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }
}