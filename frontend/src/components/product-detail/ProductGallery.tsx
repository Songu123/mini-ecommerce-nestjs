'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/types';
import { getFullImageUrl, cn } from '@/lib/utils';
import { Image as ImageIcon } from 'lucide-react';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sortedImages = [...images].sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1));
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 border border-slate-200">
        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-sm font-medium">Chưa có hình ảnh</span>
      </div>
    );
  }

  const activeImage = sortedImages[activeImageIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
        <Image
          src={getFullImageUrl(activeImage?.url)}
          alt={`${productName} - Image ${activeImageIndex + 1}`}
          fill
          priority
          className="object-cover object-center transition-all duration-300"
        />
      </div>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {sortedImages.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveImageIndex(idx)}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
                activeImageIndex === idx
                  ? "border-indigo-600 opacity-100"
                  : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300"
              )}
              aria-label={`View image ${idx + 1}`}
              aria-current={activeImageIndex === idx}
            >
              <Image
                src={getFullImageUrl(img.url)}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
