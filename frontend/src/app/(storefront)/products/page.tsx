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
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  // Sync URL query params with state
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedCat(searchParams.get('categoryId') || 'all');
    
    // Convert url sortBy back to local state
    const urlSortBy = searchParams.get('sortBy');
    const urlSortOrder = searchParams.get('sortOrder');
    if (urlSortBy === 'price' && urlSortOrder === 'asc') setSortBy('price-asc');
    else if (urlSortBy === 'price' && urlSortOrder === 'desc') setSortBy('price-desc');
    else setSortBy('newest');

    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  // Push new state to URL
  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/products?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search: searchQuery });
  };

  const handleApplyPriceFilter = () => {
    updateUrl({ minPrice, maxPrice });
  };

  // Fetch products when searchParams change
  useEffect(() => {
    async function fetchFiltered() {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        
        // 1. Fetch categories (only needed once, but fine here)
        if (categories.length === 0) {
          const catRes = await fetch(`${apiUrl}/categories`).then(r => r.json());
          setCategories(Array.isArray(catRes) ? catRes : (catRes.data || []));
        }

        // 2. Build backend query
        let query = `${apiUrl}/products?limit=50`;
        const search = searchParams.get('search');
        const catId = searchParams.get('categoryId');
        const minP = searchParams.get('minPrice');
        const maxP = searchParams.get('maxPrice');
        const sBy = searchParams.get('sortBy');
        const sOrder = searchParams.get('sortOrder');

        if (search) query += `&search=${encodeURIComponent(search)}`;
        if (catId && catId !== 'all') query += `&categoryId=${catId}`;
        if (minP) query += `&minPrice=${minP}`;
        if (maxP) query += `&maxPrice=${maxP}`;
        if (sBy) query += `&sortBy=${sBy}&sortOrder=${sOrder || 'desc'}`;
        else query += `&sortBy=createdAt&sortOrder=desc`;

        const prodRes = await fetch(query).then(r => r.json());
        setProducts(Array.isArray(prodRes) ? prodRes : (prodRes.data || []));
      } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFiltered();
  }, [searchParams]);

  const filteredProducts = products;

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
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'price-asc') updateUrl({ sortBy: 'price', sortOrder: 'asc' });
              else if (val === 'price-desc') updateUrl({ sortBy: 'price', sortOrder: 'desc' });
              else updateUrl({ sortBy: 'createdAt', sortOrder: 'desc' });
            }}
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
                onClick={() => updateUrl({ categoryId: null })}
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
                    onClick={() => updateUrl({ categoryId: String(c.id) })}
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

          {/* Price Range Filter */}
          <div className="p-4 mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 font-semibold mb-4 text-sm text-slate-900">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Khoảng giá (VNĐ)</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Từ</label>
                <input 
                  type="number" 
                  value={minPrice} 
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Đến</label>
                <input 
                  type="number" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="100000000" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button 
                onClick={handleApplyPriceFilter}
                className="w-full bg-indigo-600 text-white font-medium text-sm py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Áp dụng
              </button>
            </div>
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
                  setMinPrice('');
                  setMaxPrice('');
                  router.push('/products');
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
