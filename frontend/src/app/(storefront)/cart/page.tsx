'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatVND, getFullImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getSubtotal, getTotalPrice, applyCoupon, appliedCoupon, toggleSelectItem, toggleSelectAll, getSelectedItemsCount } = useCartStore();
  const { isAuthenticated, token } = useAuthStore();
  const { success, error } = useToast();

  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '');
  const [applying, setApplying] = useState(false);

  const subtotal = getSubtotal();
  const total = getTotalPrice();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    if (!isAuthenticated) {
      error('Vui lòng đăng nhập để sử dụng mã giảm giá');
      router.push('/login?redirect=/cart');
      return;
    }

    setApplying(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: couponCode, orderTotal: subtotal }),
      });

      const data = await res.json();

      if (res.ok) {
        applyCoupon({ code: data.code, discountAmount: data.discountAmount });
        success(`Áp dụng mã giảm giá thành công! Giảm ${formatVND(data.discountAmount)}`);
      } else {
        error(data.message || 'Mã giảm giá không hợp lệ');
        applyCoupon(null);
      }
    } catch (err) {
      error('Lỗi khi áp dụng mã giảm giá');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    applyCoupon(null);
    setCouponCode('');
    success('Đã hủy mã giảm giá');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Giỏ hàng của bạn đang trống</h1>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          Chưa có sản phẩm nào trong giỏ hàng. Hãy tham quan cửa hàng và chọn cho mình những món đồ ưng ý nhé!
        </p>
        <Link href="/products">
          <Button size="lg" className="rounded-full px-8">
            Tiếp tục mua sắm
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">Giỏ Hàng</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 border-b border-slate-200 text-sm font-semibold text-slate-500 uppercase tracking-wider items-center">
            <div className="col-span-6 flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={items.length > 0 && items.every(i => i.selected)}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
              />
              Sản phẩm
            </div>
            <div className="col-span-3 text-center">Số lượng</div>
            <div className="col-span-3 text-right">Tạm tính</div>
          </div>

          <div className="space-y-6 sm:space-y-0 sm:divide-y sm:divide-slate-100">
            {items.map((item) => {
              const p = item.product;
              const v = item.variant;
              const price = v?.price || p.price;
              const primaryImage = p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url;
              const targetId = `${p.id}-${v?.id || 'none'}`;

              return (
                <div key={targetId} className={`pt-4 sm:py-4 flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:items-center transition-opacity ${item.selected ? 'opacity-100' : 'opacity-60 grayscale-[0.2]'}`}>
                  {/* Product Info */}
                  <div className="sm:col-span-6 flex items-start gap-4">
                    <div className="flex items-center h-full pt-6 sm:pt-0">
                      <input 
                        type="checkbox" 
                        checked={item.selected}
                        onChange={() => toggleSelectItem(p.id, v?.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0">
                      <Image
                        src={getFullImageUrl(primaryImage)}
                        alt={p.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <Link href={`/products/${p.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2">
                        {p.name}
                      </Link>
                      {v && <span className="text-xs font-medium px-2 py-0.5 mt-1 bg-slate-100 text-slate-700 rounded w-fit">{v.name}</span>}
                      <span className="text-sm text-slate-500 mt-1 font-medium">{formatVND(price)}</span>
                      <button
                        onClick={() => removeItem(p.id, v?.id)}
                        className="text-sm text-rose-500 hover:text-rose-700 font-medium text-left mt-2 flex items-center gap-1 w-fit"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </div>
                  </div>

                  {/* Quantity Control */}
                  <div className="sm:col-span-3 flex sm:justify-center items-center mt-2 sm:mt-0">
                    <div className="flex items-center h-9 w-28 border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, item.quantity - 1, v?.id)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        readOnly
                        value={item.quantity}
                        className="w-12 h-full text-center text-sm font-semibold text-slate-900 border-x border-slate-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, item.quantity + 1, v?.id)}
                        disabled={item.quantity >= (v ? v.stock : p.stock)}
                        className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="sm:col-span-3 text-right hidden sm:block font-bold text-slate-900">
                    {formatVND(Number(price) * item.quantity)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 sticky top-28">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Tóm tắt đơn hàng</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Tạm tính ({getSelectedItemsCount()} sản phẩm)</span>
                <span className="font-medium text-slate-900">{formatVND(subtotal)}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between items-start text-sm text-emerald-600 font-medium">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Mã giảm giá ({appliedCoupon.code})
                    </span>
                    <button 
                      onClick={handleRemoveCoupon}
                      className="text-xs text-rose-500 hover:underline mt-0.5 text-left"
                    >
                      Xóa mã
                    </button>
                  </div>
                  <span>-{formatVND(appliedCoupon.discountAmount)}</span>
                </div>
              )}
            </div>

            <hr className="border-slate-200 mb-6" />

            <div className="flex justify-between items-end mb-8">
              <span className="text-base font-semibold text-slate-900">Tổng cộng</span>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-indigo-600 block leading-none">
                  {formatVND(total)}
                </span>
                <span className="text-xs text-slate-500 mt-1 block">Đã bao gồm VAT (nếu có)</span>
              </div>
            </div>

            {/* Coupon Form */}
            <form onSubmit={handleApplyCoupon} className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Mã giảm giá</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã (VD: SALE50K)"
                  disabled={!!appliedCoupon}
                  className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 uppercase"
                />
                <Button 
                  type="submit" 
                  disabled={!couponCode.trim() || applying || !!appliedCoupon}
                  variant="outline"
                >
                  {applying ? 'Đang áp dụng...' : 'Áp dụng'}
                </Button>
              </div>
            </form>

            <Link href={getSelectedItemsCount() > 0 ? "/checkout" : "#"} className="block w-full" onClick={(e) => getSelectedItemsCount() === 0 && e.preventDefault()}>
              <Button size="lg" disabled={getSelectedItemsCount() === 0} className="w-full text-base font-semibold group rounded-xl">
                Tiến hành thanh toán
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
