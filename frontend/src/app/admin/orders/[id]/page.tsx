'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/components/providers/SocketProvider';
import { formatVND, getFullImageUrl, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, ArrowRight, User, MapPin, Truck, Receipt, Clock, Ban } from 'lucide-react';
import OrderStatusBadge from '@/components/OrderStatusBadge';

interface AdminOrderDetail {
  id: number;
  totalAmount: number;
  status: 'AWAITING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  shippingAddress?: string;
  phone?: string;
  note?: string;
  cancelReason?: string;
  shippingProvider?: string;
  trackingNumber?: string;
  paymentMethod?: string;
  createdAt: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
  };
  items: {
    id: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
      images: { url: string; isPrimary: boolean }[];
    };
    productVariant?: {
      id: number;
      name: string;
    };
  }[];
  coupon?: {
    code: string;
    discountValue: number;
    discountType: 'PERCENTAGE' | 'FIXED';
  };
  history?: {
    id: number;
    oldStatus: string | null;
    newStatus: string;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
  }[];
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const { socket } = useSocket();
  const { error, success } = useToast();
  
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal Giao hàng
  const [shippingModal, setShippingModal] = useState(false);
  const [shippingData, setShippingData] = useState({ provider: '', tracking: '' });

  const fetchOrder = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        error('Không tìm thấy đơn hàng');
        router.push('/admin/orders');
      }
    } catch (err) {
      error('Lỗi kết nối khi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [token, orderId, error, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrder();
    }
  }, [isAuthenticated, fetchOrder]);

  // Real-time update listening
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdated = (updatedOrder: any) => {
      if (updatedOrder.id === Number(orderId)) {
        fetchOrder(); // Refetch to get new history
      }
    };
    socket.on('orderStatusUpdated', handleStatusUpdated);
    return () => {
      socket.off('orderStatusUpdated', handleStatusUpdated);
    };
  }, [socket, orderId, fetchOrder]);

  const handleUpdateStatus = async (nextStatus: string, extraData?: any) => {
    if (nextStatus === 'SHIPPED' && !extraData) {
      setShippingModal(true);
      return;
    }

    if (!token) return;
    setUpdating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const bodyData: any = { status: nextStatus };
      if (extraData) {
        if (extraData.provider) bodyData.shippingProvider = extraData.provider;
        if (extraData.tracking) bodyData.trackingNumber = extraData.tracking;
      }

      const res = await fetch(`${apiUrl}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        const err = await res.json();
        error(err.message || 'Cập nhật thất bại');
        return;
      }
      
      success(`Cập nhật đơn hàng thành công`);
      if (extraData) setShippingModal(false);
      fetchOrder();
    } catch (e) {
      error('Lỗi kết nối khi cập nhật đơn hàng');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn HỦY đơn hàng này không?')) return;
    
    if (!token) return;
    setUpdating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Admin hủy đơn hàng' })
      });

      if (res.ok) {
        success('Hủy đơn hàng thành công');
        fetchOrder();
      } else {
        const errData = await res.json();
        error(errData.message || 'Hủy đơn hàng thất bại');
      }
    } catch (err) {
      error('Lỗi kết nối khi hủy đơn hàng');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':
        return [{ value: 'CONFIRMED', label: 'Xác nhận đơn', color: 'bg-blue-600 hover:bg-blue-700 text-white' }];
      case 'CONFIRMED':
        return [{ value: 'SHIPPED', label: 'Tiến hành giao hàng', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' }];
      case 'SHIPPED':
        return [{ value: 'DELIVERED', label: 'Đã giao thành công', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/orders" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Đơn hàng #{order.id}
            <OrderStatusBadge status={order.status} />
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ngày đặt: {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CỘT TRÁI (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Danh sách sản phẩm */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Chi tiết sản phẩm</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items.map(item => {
                const primaryImage = item.product.images?.find(img => img.isPrimary)?.url || item.product.images?.[0]?.url;
                return (
                  <div key={item.id} className="p-5 flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <Image src={getFullImageUrl(primaryImage)} alt={item.product.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 line-clamp-1">{item.product.name}</h4>
                      {item.productVariant && (
                        <p className="text-xs text-slate-500 mt-0.5">Phân loại: {item.productVariant.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatVND(item.price)}</p>
                      <p className="text-xs text-slate-500 font-medium">x{item.quantity}</p>
                    </div>
                    <div className="w-24 text-right font-extrabold text-indigo-600">
                      {formatVND(item.price * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Tổng tiền */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-900">{formatVND(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Phí vận chuyển</span>
                <span className="font-medium text-slate-900">0đ</span>
              </div>
              {order.coupon && (
                <div className="flex justify-between text-sm text-emerald-600 font-medium">
                  <span>Mã giảm giá ({order.coupon.code})</span>
                  <span>Đã áp dụng</span>
                </div>
              )}
              <hr className="border-slate-200" />
              <div className="flex justify-between items-end">
                <span className="font-bold text-slate-900">Tổng cộng</span>
                <span className="text-2xl font-black text-indigo-600">{formatVND(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Lịch sử đơn hàng (Timeline) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Nhật ký hoạt động</h3>
            </div>
            <div className="p-6">
              {order.history && order.history.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                  {order.history.map((hist, idx) => (
                    <div key={hist.id} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{hist.note || 'Cập nhật trạng thái'}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {hist.oldStatus && <span className="line-through mr-2">{hist.oldStatus}</span>}
                            <span className="font-medium text-indigo-600">{hist.newStatus}</span>
                          </p>
                          {hist.createdBy && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mt-2">
                              Bởi: {hist.createdBy}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                          {formatDate(hist.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-4">Chưa có lịch sử cập nhật nào.</p>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (Sidebar Control) */}
        <div className="space-y-6">
          
          {/* Box Cập nhật Trạng thái */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              Bảng điều khiển
            </h3>
            
            <div className="space-y-3">
              {getNextStatusOptions(order.status).map(action => (
                <Button
                  key={action.value}
                  onClick={() => handleUpdateStatus(action.value)}
                  disabled={updating}
                  className={`w-full justify-between shadow-sm ${action.color} ${updating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {action.label}
                  <ArrowRight className="w-4 h-4 ml-2 opacity-70" />
                </Button>
              ))}
              
              {(order.status !== 'CANCELLED' && order.status !== 'DELIVERED') && (
                <Button
                  onClick={handleCancelOrder}
                  disabled={updating}
                  variant="outline"
                  className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Hủy đơn hàng
                </Button>
              )}

              {(order.status === 'CANCELLED' || order.status === 'DELIVERED') && (
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Đơn hàng đã đóng</p>
                  <p className="text-xs text-slate-400 mt-1">Không thể thay đổi trạng thái</p>
                </div>
              )}
            </div>

            {order.status === 'CANCELLED' && order.cancelReason && (
              <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-sm text-rose-800 font-bold mb-1">Lý do hủy:</p>
                <p className="text-sm text-rose-700">{order.cancelReason}</p>
              </div>
            )}
          </div>

          {/* Box Thông tin Khách hàng */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Khách hàng</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Họ tên</p>
                <p className="text-sm font-bold text-slate-900">{order.user?.name || 'Khách vãng lai'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Email</p>
                <p className="text-sm text-slate-700 break-all">{order.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Số điện thoại</p>
                <p className="text-sm font-medium text-slate-900">{order.phone || 'Chưa cập nhật'}</p>
              </div>
            </div>
          </div>

          {/* Box Giao hàng */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Giao hàng</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Địa chỉ nhận</p>
                <p className="text-sm text-slate-900 leading-relaxed">{order.shippingAddress || 'Nhận tại cửa hàng'}</p>
              </div>
              
              {order.note && (
                <div>
                  <p className="text-xs text-orange-600 font-medium uppercase mb-1">Ghi chú của khách</p>
                  <p className="text-sm text-orange-800 bg-orange-50 p-2 rounded border border-orange-100 italic">"{order.note}"</p>
                </div>
              )}

              <hr className="border-slate-100" />

              <div>
                <p className="text-xs text-slate-500 font-medium uppercase mb-2 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Thông tin vận chuyển
                </p>
                {(order.shippingProvider || order.trackingNumber) ? (
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <p className="text-sm text-slate-700 mb-1">Đơn vị: <span className="font-bold text-indigo-700">{order.shippingProvider || 'N/A'}</span></p>
                    <p className="text-sm text-slate-700">Mã vận đơn: <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xs">{order.trackingNumber || 'N/A'}</span></p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Chưa có thông tin</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cập nhật Vận chuyển */}
      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Thông tin vận chuyển</h3>
              <p className="text-sm text-slate-500 mb-6">Vui lòng cung cấp mã vận đơn để khách hàng theo dõi.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị vận chuyển</label>
                  <input
                    type="text"
                    value={shippingData.provider}
                    onChange={(e) => setShippingData({ ...shippingData, provider: e.target.value })}
                    placeholder="VD: Giao Hàng Nhanh, Viettel Post..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã vận đơn (Tracking)</label>
                  <input
                    type="text"
                    value={shippingData.tracking}
                    onChange={(e) => setShippingData({ ...shippingData, tracking: e.target.value })}
                    placeholder="VD: S22.123456789"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <Button
                  onClick={() => setShippingModal(false)}
                  variant="outline"
                  className="bg-white text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('SHIPPED', shippingData)}
                  disabled={updating}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Xác nhận Giao hàng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
