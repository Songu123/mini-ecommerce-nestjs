import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ShieldCheck, Zap, RotateCcw, Headphones } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-sm mt-20 border-t border-slate-800">
      <div className="border-b border-slate-800/80 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white">Giao hàng hỏa tốc</p>
              <p className="text-xs text-slate-400">Nhận hàng trong 2h tại TP.HCM & Hà Nội</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white">Chính hãng 100%</p>
              <p className="text-xs text-slate-400">Cam kết nguồn gốc xuất xứ rõ ràng</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white">Đổi trả 30 ngày</p>
              <p className="text-xs text-slate-400">Bảo hành 1 đổi 1 nhanh chóng</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white">Hỗ trợ 24/7</p>
              <p className="text-xs text-slate-400">Tư vấn kỹ thuật chuyên sâu</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-base">TechStore E-Commerce</span>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Được xây dựng với kiến trúc NestJS 12, Next.js 16, PostgreSQL, Prisma, Redis, Docker & Socket.io.
        </p>

        <div className="flex gap-6 text-xs">
          <Link href="/products" className="hover:text-white transition-colors">Sản phẩm</Link>
          <Link href="/cart" className="hover:text-white transition-colors">Giỏ hàng</Link>
          <Link href="/orders" className="hover:text-white transition-colors">Đơn mua</Link>
        </div>
      </div>
    </footer>
  );
}
