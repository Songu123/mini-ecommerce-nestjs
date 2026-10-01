import { HeroBanner } from '@/components/storefront/HeroBanner';
import { CouponBanner } from '@/components/storefront/CouponBanner';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Product, Category } from '@/types';
import Link from 'next/link';
import { ArrowRight, Smartphone } from 'lucide-react';

async function getHomeData() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let products: Product[] = [];
  let categories: Category[] = [];
  try {
    const pRes = await fetch(apiUrl + '/products?limit=20', { cache: 'no-store' });
    if (pRes.ok) {
      const data = await pRes.json();
      products = Array.isArray(data) ? data : (data.data || []);
    }
  } catch (err) {}
  try {
    const cRes = await fetch(apiUrl + '/categories', { cache: 'no-store' });
    if (cRes.ok) categories = await cRes.json();
  } catch (err) {}
  return { products, categories };
}

export default async function Home() {
  const { products, categories } = await getHomeData();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <HeroBanner />
      
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Danh Mục Sản Phẩm</h2>
            <p className="text-sm text-slate-500 mt-1">Khám phá các thiết bị công nghệ hiện đại</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            Xem tất cả <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/products?categoryId=${cat.id}`} className="group p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 text-sm transition-colors">{cat.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 hidden sm:block">{cat.description || 'Sản phẩm chính hãng'}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CouponBanner />

      <section id="products-grid">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sản Phẩm Nổi Bật</h2>
            <p className="text-sm text-slate-500 mt-1">Công nghệ mới nhất dành cho bạn</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (<ProductCard key={p.id} product={p} />))}
        </div>
        
        <div className="mt-10 text-center">
          <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors">
            Xem toàn bộ kho hàng <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}