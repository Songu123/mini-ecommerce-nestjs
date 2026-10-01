import React from 'react';
import { notFound } from 'next/navigation';
import { ProductGallery } from '@/components/product-detail/ProductGallery';
import { ProductInfo } from '@/components/product-detail/ProductInfo';
import { ProductReviews } from '@/components/product-detail/ProductReviews';
import { Product } from '@/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getProduct(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${apiUrl}/products/${id}`, { 
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Lỗi khi fetch sản phẩm:', error);
    return null;
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product: Product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb / Back */}
      <Link 
        href="/products" 
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại cửa hàng
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Gallery */}
        <div>
          <ProductGallery images={product.images || []} productName={product.name} />
        </div>

        {/* Info */}
        <div>
          <ProductInfo product={product} />
        </div>
      </div>

      {/* Reviews Section */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
