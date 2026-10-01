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
import { ArrowLeft, Clock, Package, Truck, CheckCircle2, XCircle, MapPin, CreditCard, Receipt } from 'lucide-react';

interface OrderDetail {
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
    name: string;
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
    }
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

const statusSteps = [
  { status: 'AWAITING_PAYMENT', label: 'Chờ thanh toán', icon: CreditCard },
  { status: 'PENDING', label: 'Chờ xác nhận', icon: Clock },
  { status: 'CONFIRMED', label: 'Đã xác nhận', icon: Package },
  { status: 'SHIPPED', label: 'Đang giao', icon: Truck },
  { status: 'DELIVERED', label: 'Thành công', icon: CheckCircle2 },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const { isAuthenticated, token, isLoading: authLoading } = useAuthStore();
  const { socket } = useSocket();
  const { error, success } = useToast();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const cancelReasons = [
    'Muốn thay đổi địa chỉ giao hàng',
    'Muốn thay đổi sản phẩm/số lượng',
    'Tìm thấy giá rẻ hơn ở nơi khác',
    'Đổi ý, không muốn mua nữa',
    'Lý do khác'
  ];

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
        router.push('/orders');
      }
    } catch (err) {
      error('Lỗi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [token, orderId, error, router]);

  // Cancel order handler
  const handleCancel = async () => {
    const finalReason = cancelReason === 'Lý do khác' ? otherReason : cancelReason;
    if (!token || !finalReason.trim()) {
      error('Vui lòng chọn hoặc nhập lý do hủy đơn');
      return;
    }
    setCancelLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: finalReason })
      });
      if (!res.ok) {
        const err = await res.json();
        error(err.message || 'Hủy đơn thất bại');
        return;
      }
      const data = await res.json();
      setOrder(data);
      success('Đơn hàng đã được hủy');
      setIsCancelModalOpen(false);
      setCancelReason('');
      setOtherReason('');
    } catch (e) {
      error('Lỗi khi hủy đơn hàng');
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders');
    } else if (isAuthenticated) {
      fetchOrder();
    }
  }, [authLoading, isAuthenticated, router, fetchOrder]);

  // Real-time updates
  useEffect(() => {
    if (!socket || !order) return;
    
    const handleStatusUpdate = (payload: { order: OrderDetail }) => {
      if (payload.order.id === order.id) {
        setOrder(prev => prev ? { ...prev, status: payload.order.status } : null);
      }
    };

    socket.on('orderStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('orderStatusUpdated', handleStatusUpdate);
    };
  }, [socket, order?.id]);

  if (authLoading || loading) {
    return <div className="py-24 text-center text-slate-500">Đang tải thông tin đơn hàng...</div>;
  }

  if (!order) return null;

  const getStepIndex = (status: string) => {
    if (status === 'CANCELLED') return -1;
    return statusSteps.findIndex(s => s.status === status);
  };

  const currentStep = getStepIndex(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Quay lại lịch sử
      </Link>

      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Đơn hàng #{order.id}</h1>
          <p className="text-sm text-slate-500">Đặt ngày {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {order.status === 'CANCELLED' && (
            <div className="px-4 py-3 bg-rose-50 text-rose-700 rounded-lg flex flex-col gap-1 border border-rose-200">
              <div className="font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5" /> ĐƠN HÀNG ĐÃ HỦY
              </div>
              {order.cancelReason && (
                <div className="text-sm opacity-90 ml-7">
                  <span className="font-medium">Lý do:</span> {order.cancelReason}
                </div>
              )}
            </div>
          )}

          {/* Cancel button for cancellable orders */}
          {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
            <Button
              onClick={() => setIsCancelModalOpen(true)}
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-white"
            >
              Hủy đơn hàng
            </Button>
          )}

          {order.status === 'AWAITING_PAYMENT' && (
            <Button onClick={() => router.push(`/payment/${order.id}`)} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 animate-pulse">
              <CreditCard className="w-4 h-4 mr-2" />
              Tiến hành thanh toán
            </Button>
          )}
        </div>
      </div>

      {order.status !== 'CANCELLED' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="relative max-w-2xl mx-auto">
            {/* Progress Line */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-slate-100 rounded-full hidden sm:block" />
            <div 
              className="absolute top-6 left-6 h-1 bg-indigo-600 rounded-full transition-all duration-500 hidden sm:block"
              style={{ width: `${Math.max(0, (currentStep / (statusSteps.length - 1)) * 100)}%` }}
            />
            
            <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0 relative z-10">
              {statusSteps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStep >= idx;
                const isCurrent = currentStep === idx;
                
                return (
                  <div key={step.status} className="flex sm:flex-col items-center sm:w-24 gap-4 sm:gap-3 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${isActive ? 'bg-indigo-600 border-indigo-100 text-white shadow-md shadow-indigo-600/20' : 'bg-white border-slate-100 text-slate-300'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${isCurrent ? 'text-indigo-600' : isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-400" /> Địa chỉ nhận hàng
          </h3>
          <p className="text-sm text-slate-600 font-medium mb-1">{order.user?.name || 'Khách hàng'}</p>
          <p className="text-sm text-slate-500">{order.shippingAddress || 'Nhận tại cửa hàng'}</p>
          <p className="text-sm text-slate-500 mt-1">SĐT: {order.phone || '(Chưa cập nhật)'}</p>
          {order.note && <p className="text-sm text-orange-600 mt-2 bg-orange-50 p-2 rounded border border-orange-100">Ghi chú: {order.note}</p>}
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-slate-400" /> Thanh toán
          </h3>
          <p className="text-sm text-slate-600 font-medium">{order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod}</p>
          <p className={`text-sm mt-1 font-bold ${
            (order.paymentMethod === 'COD' ? order.status === 'DELIVERED' : (order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED')) 
            ? 'text-emerald-600' : 'text-orange-600'
          }`}>
            {(order.paymentMethod === 'COD' ? order.status === 'DELIVERED' : (order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED')) 
              ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-slate-400" /> Vận chuyển
          </h3>
          {(order.shippingProvider || order.trackingNumber) ? (
            <>
              <p className="text-sm text-slate-600 font-medium mb-1">Đơn vị: <span className="font-bold text-indigo-600">{order.shippingProvider || 'N/A'}</span></p>
              <p className="text-sm text-slate-500">Mã vận đơn: <span className="font-mono bg-slate-100 px-1 rounded">{order.trackingNumber || 'N/A'}</span></p>
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">Chưa có thông tin vận chuyển</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Sản phẩm đã mua
          </h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {order.items.map(item => {
            const primaryImage = item.product.images?.find(img => img.isPrimary)?.url || item.product.images?.[0]?.url;
            return (
              <div key={item.id} className="p-5 md:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="relative w-20 h-20 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                  <Image src={getFullImageUrl(primaryImage)} alt={item.product.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <Link href={`/products/${item.product.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2 mb-1">
                    {item.product.name}
                  </Link>
                  <div className="text-sm text-slate-500">Đơn giá: {formatVND(item.price)}</div>
                </div>
                <div className="flex justify-between sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <div className="text-sm font-medium text-slate-500">Số lượng: x{item.quantity}</div>
                  <div className="font-extrabold text-slate-900">{formatVND(item.price * item.quantity)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 md:p-6 bg-slate-50">
          <div className="flex justify-between text-sm mb-3 text-slate-600">
            <span>Tạm tính</span>
            <span className="font-medium text-slate-900">{formatVND(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm mb-3 text-slate-600">
            <span>Phí vận chuyển</span>
            <span className="font-medium text-slate-900">0đ</span>
          </div>
          {order.coupon && (
            <div className="flex justify-between text-sm mb-4 font-medium text-emerald-600">
              <span>Mã giảm giá ({order.coupon.code})</span>
              <span>Đã áp dụng</span>
            </div>
          )}
          <hr className="border-slate-200 mb-4" />
          <div className="flex justify-between items-end">
            <span className="font-bold text-slate-900">Tổng cộng</span>
            <span className="text-2xl font-extrabold text-indigo-600">{formatVND(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {order.history && order.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-8">
          <div className="p-5 md:p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Nhật ký đơn hàng
            </h3>
          </div>
          <div className="p-5 md:p-6">
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              {order.history.map((hist, idx) => (
                <div key={hist.id} className="relative pl-6">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${idx === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                      <p className="font-bold text-slate-900">{hist.note || 'Cập nhật trạng thái'}</p>
                      <p className="text-sm text-slate-500">
                        {hist.oldStatus && <span className="line-through mr-2">{hist.oldStatus}</span>}
                        <span className="font-medium text-indigo-600">{hist.newStatus}</span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      {formatDate(hist.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hủy đơn hàng</h3>
            <p className="text-slate-500 text-sm mb-4">Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này.</p>
            
            <div className="flex flex-col gap-3 mb-6">
              {cancelReasons.map((reason) => (
                <label key={reason} className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <input 
                    type="radio" 
                    name="cancelReason" 
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" 
                  />
                  <span className="text-sm font-medium text-slate-700">{reason}</span>
                </label>
              ))}

              {cancelReason === 'Lý do khác' && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Nhập lý do của bạn..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-24 resize-none"
                />
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setIsCancelModalOpen(false)} 
                variant="outline" 
                className="text-slate-600"
                disabled={cancelLoading}
              >
                Đóng
              </Button>
              <Button 
                onClick={handleCancel} 
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                disabled={cancelLoading || !cancelReason}
              >
                {cancelLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
