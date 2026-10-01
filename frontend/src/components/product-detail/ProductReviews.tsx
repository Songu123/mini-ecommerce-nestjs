'use client';

import React, { useEffect, useState } from 'react';
import { ProductReviewsResponse, Review } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductReviewsProps {
  productId: number;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { isAuthenticated, token } = useAuthStore();
  const { success, error } = useToast();
  
  const [data, setData] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/reviews/product/${productId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Lỗi tải đánh giá:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      error('Vui lòng đăng nhập để đánh giá');
      return;
    }
    
    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ productId, rating, comment }),
      });
      
      const json = await res.json().catch(() => ({}));
      
      if (res.ok) {
        success('Cảm ơn bạn đã đánh giá sản phẩm!');
        setComment('');
        setRating(5);
        fetchReviews(); // Refresh reviews
      } else {
        error(json.message || 'Không thể gửi đánh giá. Bạn đã mua sản phẩm này chưa?');
      }
    } catch (err) {
      error('Đã xảy ra lỗi khi gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500 animate-pulse">Đang tải đánh giá...</div>;
  }

  // If backend returns reviews directly as array instead of ProductReviewsResponse
  const reviewsList = Array.isArray(data) ? data : data?.reviews || [];
  const summary = data && !Array.isArray(data) && data.summary ? data.summary : null;

  return (
    <div className="mt-16 border-t border-slate-200 pt-10">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">Đánh Giá Sản Phẩm</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Left: Summary & Form */}
        <div className="md:col-span-4 space-y-8">
          {/* Summary */}
          {summary ? (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
              <div className="text-5xl font-extrabold text-slate-900 mb-2">
                {Number(summary.averageRating).toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={cn(
                      "w-5 h-5",
                      star <= Math.round(summary.averageRating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                    )}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-500 font-medium">{summary.totalReviews} bài đánh giá</p>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 font-medium">Chưa có đánh giá nào</p>
              <p className="text-xs text-slate-500 mt-1">Hãy là người đầu tiên đánh giá sản phẩm này!</p>
            </div>
          )}

          {/* Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Viết đánh giá của bạn</h3>
            {isAuthenticated ? (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chất lượng sản phẩm</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                      >
                        <Star 
                          className={cn(
                            "w-8 h-8 transition-colors",
                            star <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200 hover:fill-amber-200"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-1">Cảm nhận chi tiết</label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Sản phẩm này thế nào? Mọi thứ có như mong đợi không?"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
                  />
                </div>
                
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-600 mb-3">Vui lòng đăng nhập để có thể đánh giá sản phẩm đã mua.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>
                  Đăng nhập ngay
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Reviews List */}
        <div className="md:col-span-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Tất cả đánh giá</h3>
          
          {reviewsList.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center">
              <p className="text-slate-500 text-sm">Chưa có bài đánh giá nào cho sản phẩm này.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewsList.map((review: Review) => (
                <div key={review.id} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{review.user?.name || 'Người dùng ẩn danh'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(review.createdAt).toLocaleDateString('vi-VN', { 
                          year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={cn(
                            "w-4 h-4",
                            star <= review.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-700 leading-relaxed mt-2">{review.comment}</p>
                  )}
                  {/* Verified purchase badge (optional, based on your backend) */}
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider">
                    Đã mua hàng
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
