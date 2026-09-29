import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  category: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    let subtotal = 0;
    let totalItems = 0;

    const formattedItems = cart.items.map((item) => {
      const itemPrice = Number(item.product.price);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;

      return {
        id: item.id,
        quantity: item.quantity,
        itemTotal,
        product: {
          ...item.product,
          price: itemPrice,
          isAvailable: item.product.stock >= item.quantity,
        },
      };
    });

    return {
      cartId: cart.id,
      userId: cart.userId,
      items: formattedItems,
      totalItems,
      subtotal,
      updatedAt: cart.updatedAt,
    };
  }

  async addToCart(userId: number, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Khong tim thay san pham voi ID ' + dto.productId);
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException('So luong yeu cau vuot qua ton kho hien tai (' + product.stock + ')');
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException('Tong so luong trong gio (' + newQuantity + ') vuot qua ton kho (' + product.stock + ')');
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateCartItem(userId: number, itemId: number, dto: UpdateCartItemDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Khong tim thay gio hang cua nguoi dung');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Khong tim thay san pham trong gio hang cua ban');
    }

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      if (item.product.stock < dto.quantity) {
        throw new BadRequestException('So luong cap nhat (' + dto.quantity + ') vuot qua ton kho (' + item.product.stock + ')');
      }

      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async removeCartItem(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Khong tim thay gio hang cua nguoi dung');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Khong tim thay san pham nay trong gio hang');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return { message: 'Da don sach gio hang thanh cong' };
  }
}