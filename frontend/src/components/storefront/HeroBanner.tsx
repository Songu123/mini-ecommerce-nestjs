'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ArrowRight, ShieldCheck, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-slate-50 rounded-xl border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/50 text-slate-700 text-xs font-semibold mb-6 w-fit">
            <span>Sản phẩm mới ra mắt</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Công nghệ tối tân <br className="hidden md:block" />
            <span className="text-indigo-600">trong tầm tay</span>
          </h1>

          <p className="mt-6 text-base text-slate-600 max-w-lg leading-relaxed">
            Khám phá những thiết bị điện tử, smartphone, laptop và phụ kiện cao cấp chính hãng với bảo hành 12 tháng.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/products">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="w-5 h-5" />
                Mua sắm ngay
              </Button>
            </Link>
            <Link href="#vouchers">
              <Button size="lg" variant="outline" className="gap-2">
                Xem khuyến mãi
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span className="font-medium">Giao hàng 2H</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-medium">Chính hãng 100%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              <span className="font-medium">Đổi trả 30 ngày</span>
            </div>
          </div>
        </div>

        <div className="relative hidden md:block bg-slate-200 min-h-[400px]">
           <Image
            src="https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&auto=format&fit=crop&q=80"
            alt="Đồ công nghệ hiện đại"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
      </div>
    </section>
  );
}
