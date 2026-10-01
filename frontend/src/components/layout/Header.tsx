'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ShoppingCart, LogOut, Package, Shield, Menu, X, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export function Header({ initialUser }: { initialUser?: import('@/types').User | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: storeUser, isAuthenticated: storeAuth, logout, initializeSession } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const user = storeUser || initialUser;
  const isAuthenticated = storeAuth || !!initialUser;
  const { success } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    setSearchQuery(searchParams?.get('search') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push('/products?search=' + encodeURIComponent(searchQuery.trim()));
    } else {
      router.push('/products');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    success('Đã đăng xuất thành công');
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Tech<span className="text-indigo-600">Store</span></span>
            <span className="hidden sm:block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">NestJS & Next.js</span>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tìm kiếm thiết bị công nghệ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title="Giỏ hàng"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="sr-only">Giỏ hàng</span>
            {mounted && getTotalItems() > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-white">
                {getTotalItems()}
              </span>
            )}
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && (
                <Link href="/admin/products">
                  <Button variant="secondary" size="sm" className="gap-1.5 hidden sm:inline-flex">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    Admin
                  </Button>
                </Link>
              )}

              <Link href="/orders">
                <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  Đơn mua
                </Button>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Đăng nhập</Button>
              </Link>
              <Link href="/register" className="hidden sm:inline-block">
                <Button size="sm">Đăng ký</Button>
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl border border-slate-200 text-slate-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 p-4 bg-white space-y-3">
          <form onSubmit={handleSearch}>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </form>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/products" className="text-sm font-medium text-slate-700 py-2 border-b border-slate-100">
              Tất cả sản phẩm
            </Link>
            <Link href="/orders" className="text-sm font-medium text-slate-700 py-2 border-b border-slate-100">
              Lịch sử đơn hàng
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/admin/products" className="text-sm font-medium text-indigo-600 py-2">
                Quản lý hệ thống (Admin)
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
