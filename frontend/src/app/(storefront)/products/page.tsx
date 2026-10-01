'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Product, Category } from '@/types';
import { ProductCard } from '@/components/storefront/ProductCard';
import { SlidersHorizontal, Search, RefreshCw, PackageX } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function ProductsCatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get('categoryId') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | number>(initialCategory);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  // Đồng bộ URL search query vào local state nếu URL thay đổi
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!router) return;
    
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    router.push(`/products?${params.toString()}`);
  };

  useEffect(() => {
    async function loadInitial() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const [prodRes, catRes] = await Promise.all([
          fetch(`${apiUrl}/products?limit=50`, { cache: 'no-store' }).then((res) => res.json()),
          fetch(`${apiUrl}/categories`, { cache: 'no-store' }).then((res) => res.json()),
        ]);

        const prodList = Array.isArray(prodRes) ? prodRes : (prodRes.data || []);
        const catList = Array.isArray(catRes) ? catRes : (catRes.data || []);

        setProducts(prodList);
        setCategories(catList);
      } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const filteredProducts = products
    .filter((p) => {
      const matchCat =
        selectedCat === 'all' ||
        String(p.categoryId) === String(selectedCat);
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Tiêu đề & thanh tìm kiếm */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Tất Cả Sản Phẩm
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Khám phá và lọc các sản phẩm công nghệ theo nhu cầu
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="h-10 w-full pl-10 pr-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              aria-label="Tìm kiếm sản phẩm"
            />
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 w-full sm:w-auto rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            aria-label="Sắp xếp sản phẩm"
          >
            <option value="newest">Mới nhất</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar categories */}
        <aside className="lg:col-span-1">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 font-semibold mb-4 text-sm text-slate-900">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Danh mục sản phẩm</span>
            </div>
            <nav className="space-y-1" aria-label="Danh mục">
              <button
                type="button"
                onClick={() => setSelectedCat('all')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCat === 'all'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                Tất cả ({products.length})
              </button>
              {categories.map((c) => {
                const count = products.filter(
                  (p) => String(p.categoryId) === String(c.id)
                ).length;
                const isSelected = String(selectedCat) === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCat(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${isSelected
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <span>{c.name}</span>
                    <span className={`text-xs ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4" aria-busy="true">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm">Đang tải sản phẩm...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              <PackageX className="w-12 h-12 text-slate-400 mb-3" />
              <h3 className="text-sm font-medium text-slate-900">Không tìm thấy sản phẩm</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
                Chúng tôi không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại của bạn. Vui lòng thử tìm kiếm với từ khóa khác.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCat('all');
                }}
                className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProductsCatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
      <ProductsCatalogContent />
    </Suspense>
  );
}
