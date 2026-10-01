'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { formatVND } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, CheckCircle2, XCircle, Minus, Plus, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const { addItem } = useCartStore();
  const { success, error } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants && product.variants.length > 0 ? product.variants[0].id : null
  );

  const currentVariant = product.variants?.find(v => v.id === selectedVariantId);
  const currentStock = currentVariant ? currentVariant.stock : product.stock;
  const currentPrice = currentVariant?.price ? currentVariant.price : product.price;
  const isOutOfStock = currentStock <= 0;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  const handleIncrease = () => {
    if (quantity < currentStock) setQuantity(q => q + 1);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      error('Sản phẩm đã hết hàng!');
      return;
    }
    if (quantity > currentStock) {
      error(`Chỉ còn ${currentStock} sản phẩm trong kho`);
      return;
    }
    
    addItem(product, quantity, currentVariant);
    success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
  };

  return (
    <div className="flex flex-col">
      {/* Category & Title */}
      <div className="mb-6">
        {product.category && (
          <Link 
            href={`/products?categoryId=${product.categoryId}`}
            className="inline-block px-2.5 py-1 mb-3 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            {product.category.name}
          </Link>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
          {product.name}
        </h1>
        
        {/* Basic status */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          {isOutOfStock ? (
            <div className="flex items-center gap-1.5 text-rose-600 font-medium">
              <XCircle className="w-4 h-4" />
              <span>Hết hàng</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Còn {currentStock} sản phẩm</span>
            </div>
          )}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Price */}
      <div className="py-6">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-extrabold text-slate-900">
            {formatVND(currentPrice)}
          </span>
          {/* Optional: Add fake original price for marketing if needed, but let's keep it real for now */}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Variants */}
      {product.variants && product.variants.length > 0 && (
        <div className="py-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Tùy chọn</h3>
          <div className="flex flex-wrap gap-2">
            {product.variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  setQuantity(1); // Reset quantity when changing variant
                }}
                className={`px-4 py-2 text-sm font-medium border rounded-xl transition-all ${
                  selectedVariantId === variant.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20' 
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                } ${variant.stock <= 0 ? 'opacity-50 cursor-not-allowed border-dashed' : ''}`}
              >
                {variant.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.variants && product.variants.length > 0 && <hr className="border-slate-200" />}

      {/* Description */}
      <div className="py-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Mô tả sản phẩm</h3>
        {product.description ? (
          <div 
            className="text-sm text-slate-600 leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-2 [&_a]:text-indigo-600 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: product.description }} 
          />
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed">Chưa có mô tả chi tiết cho sản phẩm này.</p>
        )}
      </div>

      <hr className="border-slate-200" />

      {/* Add to Cart Actions */}
      <div className="py-6 space-y-5">
        <div>
          <label htmlFor="quantity-selector" className="block text-sm font-semibold text-slate-900 mb-3">
            Số lượng
          </label>
          <div className="flex items-center h-11 w-32 border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={handleDecrease}
              disabled={quantity <= 1 || isOutOfStock}
              className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 inset-ring"
              aria-label="Giảm số lượng"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <input
              id="quantity-selector"
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              readOnly
              className="w-12 h-full text-center text-sm font-semibold text-slate-900 border-x border-slate-200 focus:outline-none"
              aria-label="Số lượng mua"
            />
            
            <button
              type="button"
              onClick={handleIncrease}
              disabled={quantity >= product.stock || isOutOfStock}
              className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 inset-ring"
              aria-label="Tăng số lượng"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            size="lg"
            className="flex-1 text-base font-semibold gap-2"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="w-5 h-5" />
            {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
          </Button>
        </div>
      </div>

      {/* Features/Guarantees */}
      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Bảo hành chính hãng</p>
            <p className="text-xs text-slate-500 mt-0.5">Cam kết 100% chính hãng, bảo hành 12 tháng</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Giao hàng siêu tốc</p>
            <p className="text-xs text-slate-500 mt-0.5">Nhận hàng trong 2H tại nội thành</p>
          </div>
        </div>
      </div>
    </div>
  );
}
