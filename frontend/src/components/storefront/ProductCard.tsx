'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { formatVND, getFullImageUrl } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore();
  const { success } = useToast();

  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';

  const isOutOfStock = product.stock <= 0;

  const hasVariants = product.variants && product.variants.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    
    if (hasVariants) {
      window.location.href = `/products/${product.id}`;
      return;
    }
    
    addItem(product, 1);
    success('Đã thêm sản phẩm vào giỏ hàng!');
  };

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:border-indigo-300 hover:shadow-md transition-all duration-200">
      <Link href={`/products/${product.id}`} className="relative aspect-square w-full bg-slate-50 overflow-hidden block">
        <Image
          src={getFullImageUrl(primaryImage)}
          alt={product.name}
          fill
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1 rounded bg-rose-600 text-white font-bold text-xs uppercase shadow-sm">
              Hết hàng
            </span>
          </div>
        ) : (
          product.category && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-sm text-xs">
                {product.category.name}
              </Badge>
            </div>
          )
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors text-sm sm:text-base">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {formatVND(product.price)}
            </p>
          </div>

          <Button
            size="icon"
            variant={isOutOfStock ? 'outline' : 'default'}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="h-10 w-10 shrink-0 rounded-lg"
            aria-label={hasVariants ? 'Chọn tùy chọn' : 'Thêm vào giỏ hàng'}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}