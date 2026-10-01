'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/components/providers/SocketProvider';
import { formatVND } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Package, Clock, CheckCircle2, XCircle, Truck, ChevronRight } from 'lucide-react';

interface Order {
  id: number;
  totalAmount: number;
  status: 'AWAITING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  items: {
    id: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
      images: { url: string; isPrimary: boolean }[];
    }
  }[];
}

const statusConfig = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
  PENDING: { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package },
  SHIPPED: { label: 'Đang giao hàng', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Truck },
  DELIVERED: { label: 'Đã giao thành công', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, token, isLoading: authLoading } = useAuthStore();
  const { socket } = useSocket();
  const { error } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/orders?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(data.data || []);
      }
    } catch (err) {
      error('Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [token, error]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders');
    } else if (isAuthenticated) {
      fetchOrders();
    }
  }, [authLoading, isAuthenticated, router, fetchOrders]);

  // Lắng nghe sự kiện realtime cập nhật trạng thái đơn hàng
  useEffect(() => {
    if (!socket) return;
    
    const handleStatusUpdate = (payload: { order: Order }) => {
      setOrders(prev => prev.map(order => 
        order.id === payload.order.id ? { ...order, status: payload.order.status } : order
      ));
    };

    socket.on('orderStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('orderStatusUpdated', handleStatusUpdate);
    };
  }, [socket]);

  if (authLoading || loading) {
    return <div className="py-24 text-center text-slate-500">Đang tải lịch sử đơn hàng...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Chưa có đơn hàng nào</h1>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          Bạn chưa thực hiện giao dịch nào. Khám phá các sản phẩm công nghệ ngay nhé!
        </p>
        <Link href="/products">
          <Button size="lg" className="rounded-full px-8">Mua sắm ngay</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">Lịch sử đơn hàng</h1>

      <div className="space-y-6">
        {orders.map(order => {
          const StatusIcon = statusConfig[order.status]?.icon || Clock;
          const statusColors = statusConfig[order.status]?.color || 'bg-slate-100 text-slate-700 border-slate-200';
          
          return (
            <Link key={order.id} href={`/orders/${order.id}`} className="block group">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5 pb-5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-slate-900 text-lg">Đơn hàng #{order.id}</span>
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border flex items-center gap-1.5 uppercase tracking-wide ${statusColors}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[order.status]?.label || order.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Đặt lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm text-slate-500 mb-1">Tổng tiền</div>
                    <div className="font-extrabold text-indigo-600 text-xl">{formatVND(order.totalAmount)}</div>
                  </div>
                </div>

                {/* Items preview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {order.items.slice(0, 3).map(item => (
                      <div key={item.id} className="relative w-14 h-14 bg-slate-50 rounded-xl border border-slate-200 shrink-0 overflow-visible">
                        {item.product?.images?.[0]?.url ? (
                          <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">No Image</div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[11px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10">
                          {item.quantity}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-sm font-medium text-slate-500 shrink-0">
                        +{order.items.length - 3}
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-600 hidden sm:inline-block ml-2">
                      Gồm {order.items.reduce((acc, curr) => acc + curr.quantity, 0)} sản phẩm
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    Xem chi tiết <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
                
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
