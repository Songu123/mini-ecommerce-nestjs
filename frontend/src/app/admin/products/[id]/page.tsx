'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Upload, X, Star, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Product, Category, ProductImage } from '@/types';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-40 bg-slate-50 border border-slate-200 rounded-xl animate-pulse"></div>
});

export default function AdminProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const { error, success } = useToast();
  
  const isNew = params.id === 'new';
  const productId = isNew ? null : Number(params.id);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    isActive: true
  });
  
  // Variants State
  const [variants, setVariants] = useState<{ id?: number, name: string, stock: number, price?: number | null }[]>([]);

  // Images State
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    // Fetch categories
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => error('Lỗi tải danh mục'));

    // Fetch product if not new
    if (!isNew && productId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/products/${productId}`)
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data: Product) => {
          setFormData({
            name: data.name,
            description: data.description || '',
            price: data.price.toString(),
            stock: data.stock.toString(),
            categoryId: data.categoryId?.toString() || '',
            isActive: data.isActive
          });
          setVariants(data.variants || []);
          setImages(data.images || []);
        })
        .catch(() => {
          error('Không tìm thấy sản phẩm');
          router.push('/admin/products');
        })
        .finally(() => setLoading(false));
    }
  }, [isNew, productId, error, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (!formData.name || !formData.price || !formData.stock || !formData.categoryId) {
      error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const payload: any = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        stock: Number(formData.stock),
        categoryId: Number(formData.categoryId),
        isActive: formData.isActive
      };
      if (variants.length > 0) {
        payload.variants = variants;
      }

      const url = isNew ? `${apiUrl}/products` : `${apiUrl}/products/${productId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Lưu thất bại');
      
      const savedProduct = await res.json();
      success(isNew ? 'Đã tạo sản phẩm thành công!' : 'Đã cập nhật sản phẩm!');
      
      if (isNew) {
        router.push(`/admin/products/${savedProduct.id}`);
      }
    } catch (err: any) {
      error(err.message || 'Có lỗi xảy ra khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !productId || !token) return;

    if (files.length + images.length > 5) {
      error('Tối đa 5 ảnh cho mỗi sản phẩm');
      return;
    }

    setUploadingImages(true);
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/products/${productId}/images`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload ảnh thất bại');
      
      const newImages = await res.json();
      setImages(prev => [...prev, ...newImages]);
      success('Đã tải ảnh lên thành công');
    } catch (err) {
      error('Lỗi khi tải ảnh lên');
    } finally {
      setUploadingImages(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!token || !productId) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      
      setImages(prev => prev.filter(img => img.id !== imageId));
      success('Đã xóa ảnh');
    } catch (err) {
      error('Lỗi khi xóa ảnh');
    }
  };

  const handleSetPrimaryImage = async (imageId: number) => {
    if (!token || !productId) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/products/${productId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isPrimary: true })
      });
      if (!res.ok) throw new Error();
      
      setImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === imageId })));
      success('Đã đặt làm ảnh đại diện');
    } catch (err) {
      error('Lỗi khi cập nhật ảnh');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Đang tải thông tin...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNew ? 'Thêm sản phẩm mới' : `Chỉnh sửa: ${formData.name}`}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Info */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Thông tin cơ bản</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                  placeholder="Ví dụ: iPhone 15 Pro Max 256GB"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tồn kho *</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục *</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow bg-white"
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tùy chọn (Size/Màu)</label>
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Tên (VD: Đỏ / XL)"
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...variants];
                          newVariants[index].name = e.target.value;
                          setVariants(newVariants);
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Tồn kho"
                        value={variant.stock}
                        onChange={(e) => {
                          const newVariants = [...variants];
                          newVariants[index].stock = Number(e.target.value);
                          setVariants(newVariants);
                        }}
                        className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Giá (Tùy chọn)"
                        value={variant.price || ''}
                        onChange={(e) => {
                          const newVariants = [...variants];
                          newVariants[index].price = e.target.value ? Number(e.target.value) : undefined;
                          setVariants(newVariants);
                        }}
                        className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newVariants = [...variants];
                          newVariants.splice(index, 1);
                          setVariants(newVariants);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setVariants([...variants, { name: '', stock: 0 }])}
                    className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    + Thêm tùy chọn
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả sản phẩm</label>
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px]">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                    placeholder="Viết mô tả chi tiết cho sản phẩm..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="font-medium text-slate-700 cursor-pointer">
                  Hiển thị sản phẩm này trên cửa hàng
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isNew ? 'Lưu sản phẩm' : 'Cập nhật'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Images (Only show if editing) */}
        <div className="space-y-6">
          <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-200 ${isNew ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              Hình ảnh ({images.length}/5)
              {isNew && <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">Lưu SP trước</span>}
            </h2>

            {/* Upload Box */}
            <div className="mb-6 relative group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImages || isNew || images.length >= 5}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${uploadingImages ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 group-hover:border-indigo-400 group-hover:bg-indigo-50/50'}`}>
                {uploadingImages ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    <p className="text-sm text-indigo-600 font-medium">Đang tải lên...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Kéo thả hoặc click để tải ảnh</p>
                    <p className="text-xs text-slate-500 mt-1">Hỗ trợ JPG, PNG (Max 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Images Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {images.map(img => (
                  <div key={img.id} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden group">
                    <Image src={img.url} alt="Product image" fill className="object-cover" />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                      {!img.isPrimary && (
                        <button 
                          onClick={() => handleSetPrimaryImage(img.id)}
                          className="bg-white/20 hover:bg-white/40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-md"
                        >
                          Đặt làm ảnh chính
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteImage(img.id)}
                        className="bg-rose-500/80 hover:bg-rose-600 text-white p-2 rounded-lg transition-colors backdrop-blur-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Primary Badge */}
                    {img.isPrimary && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white p-1 rounded-md shadow-md">
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có hình ảnh nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
