'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import { formatVND } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, Edit, Trash2, Package, Image as ImageIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, Category } from '@/types';

interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function AdminProductsPage() {
  const { token } = useAuthStore();
  const { error, success } = useToast();
  
  const [productsData, setProductsData] = useState<PaginatedProducts | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch Categories once
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const url = new URL(`${apiUrl}/products`);
      url.searchParams.append('limit', '10');
      url.searchParams.append('page', page.toString());
      
      if (search) url.searchParams.append('search', search);
      if (categoryId) url.searchParams.append('categoryId', categoryId);
      if (sortBy) url.searchParams.append('sortBy', sortBy);
      if (sortOrder) url.searchParams.append('sortOrder', sortOrder);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProductsData(data);
    } catch (err) {
      error('Lỗi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [search, page, categoryId, sortBy, sortOrder, error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 500); // Debounce for search and filter changes
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryId, sortBy, sortOrder]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không? Tất cả dữ liệu liên quan sẽ bị mất.')) return;
    
    setDeletingId(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Xóa thất bại');
      }
      
      success('Đã xóa sản phẩm thành công');
      fetchProducts();
    } catch (err: any) {
      error(err.message || 'Lỗi khi xóa sản phẩm');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý sản phẩm</h1>
          <p className="text-slate-500 mt-1">Quản lý kho hàng, giá cả và hình ảnh sản phẩm</p>
        </div>

        <Link 
          href="/admin/products/new" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Thêm sản phẩm mới
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 focus:outline-none border-none py-0.5 pl-1 pr-6 cursor-pointer"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                <select 
                  value={`${sortBy}-${sortOrder}`} 
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by);
                    setSortOrder(order);
                  }}
                  className="bg-transparent text-sm text-slate-700 focus:outline-none border-none py-0.5 pl-1 pr-6 cursor-pointer"
                >
                  <option value="createdAt-desc">Mới nhất</option>
                  <option value="createdAt-asc">Cũ nhất</option>
                  <option value="price-asc">Giá tăng dần</option>
                  <option value="price-desc">Giá giảm dần</option>
                  <option value="name-asc">Tên (A-Z)</option>
                  <option value="name-desc">Tên (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4 text-right">Giá bán</th>
                <th className="px-6 py-4 text-center">Tồn kho</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex justify-center mb-4">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : productsData?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-700">Không tìm thấy sản phẩm nào</p>
                    <p className="text-sm mt-1 text-slate-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </td>
                </tr>
              ) : (
                productsData?.data.map((product) => {
                  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
                  const isLowStock = product.stock > 0 && product.stock <= 5;
                  
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                            {primaryImage ? (
                              <Image 
                                src={primaryImage.url} 
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{product.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">ID: {product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {product.category?.name || 'Không có'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatVND(product.price)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.stock === 0 ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md text-xs">Hết hàng</span>
                        ) : isLowStock ? (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md text-xs">Còn {product.stock}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">{product.stock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hiển thị
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Đã ẩn
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {productsData && productsData.meta.totalPages > 1 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500 text-center sm:text-left">
              Đang hiển thị <span className="font-semibold text-slate-900">{productsData.data.length}</span> sản phẩm trên trang {productsData.meta.page} (Tổng số {productsData.meta.total} sản phẩm)
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!productsData.meta.hasPrevPage}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: productsData.meta.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === productsData.meta.page 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(productsData.meta.totalPages, p + 1))}
                disabled={!productsData.meta.hasNextPage}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
