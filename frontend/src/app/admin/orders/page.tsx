'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/components/providers/SocketProvider';
import { formatVND, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Clock, Package, Truck, CheckCircle2, XCircle, Search, Eye, Filter, ArrowRight } from 'lucide-react';
import OrderStatusBadge from '@/components/OrderStatusBadge';

interface AdminOrder {
  id: number;
  totalAmount: number;
  status: 'AWAITING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
}

const statusOptions = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'AWAITING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SHIPPED', label: 'Đang giao hàng' },
  { value: 'DELIVERED', label: 'Thành công' },
  { value: 'CANCELLED', label: 'Đã hủy' }
];

export default function AdminOrdersPage() {
  const { token, isAuthenticated } = useAuthStore();
  const { socket } = useSocket();
  const { error, success } = useToast();
  
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Modal Giao hàng
  const [shippingModal, setShippingModal] = useState<{ isOpen: boolean; orderId: number | null }>({ isOpen: false, orderId: null });
  const [shippingData, setShippingData] = useState({ provider: '', tracking: '' });

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const url = new URL(`${apiUrl}/orders`);
      if (statusFilter !== 'ALL') {
        url.searchParams.append('status', statusFilter);
      }
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.data); // data is { data: [...], meta: {...} }
    } catch (err) {
      error('Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, error]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  // Real-time updates for admin
  useEffect(() => {
    if (!socket) return;
    
    const handleOrderCreated = () => {
      success('Có đơn hàng mới!');
      fetchOrders();
    };

    const handleStatusUpdated = () => {
      fetchOrders();
    };

    socket.on('orderCreated', handleOrderCreated);
    socket.on('orderStatusUpdated', handleStatusUpdated);

    return () => {
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderStatusUpdated', handleStatusUpdated);
    };
  }, [socket, fetchOrders, success]);

  const handleUpdateStatus = async (orderId: number, nextStatus: string, extraData?: any) => {
    if (nextStatus === 'SHIPPED' && !extraData) {
      // Mở modal nhập thông tin vận chuyển thay vì gọi API ngay
      setShippingModal({ isOpen: true, orderId });
      setShippingData({ provider: '', tracking: '' });
      return;
    }

    if (!token) return;
    setUpdatingId(orderId);
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
        error(err.message || 'Cập nhật trạng thái thất bại');
        return;
      }
      
      success(`Cập nhật đơn #${orderId} thành công`);
      // Update local state directly for faster UI response
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus as any } : o));
    } catch (e) {
      error('Lỗi kết nối khi cập nhật đơn hàng');
    } finally {
      setUpdatingId(null);
    }
  };

  // Determine the next logical status
  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':
        return [{ value: 'CONFIRMED', label: 'Xác nhận đơn', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' }];
      case 'CONFIRMED':
        return [{ value: 'SHIPPED', label: 'Giao hàng', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' }];
      case 'SHIPPED':
        return [{ value: 'DELIVERED', label: 'Đã giao', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' }];
      default:
        return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-slate-500 mt-1">Xem và xử lý tất cả đơn hàng trong hệ thống</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Mã đơn</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4 text-right">Tổng tiền</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex justify-center mb-4">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <p>Không tìm thấy đơn hàng nào.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{order.user.name || 'Khách'}</div>
                      <div className="text-xs text-slate-500">{order.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {formatVND(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick Action Buttons */}
                        {getNextStatusOptions(order.status).map(action => (
                          <button
                            key={action.value}
                            onClick={() => handleUpdateStatus(order.id, action.value)}
                            disabled={updatingId === order.id}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${action.color} ${updatingId === order.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {updatingId === order.id ? 'Đang XL...' : action.label}
                            {updatingId !== order.id && <ArrowRight className="w-3 h-3" />}
                          </button>
                        ))}
                        
                        {(order.status !== 'CANCELLED' && order.status !== 'DELIVERED') && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            Hủy
                          </button>
                        )}
                        
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cập nhật Vận chuyển */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Thông tin vận chuyển</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị vận chuyển</label>
                  <input
                    type="text"
                    value={shippingData.provider}
                    onChange={(e) => setShippingData({ ...shippingData, provider: e.target.value })}
                    placeholder="VD: GHTK, Viettel Post..."
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
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShippingModal({ isOpen: false, orderId: null })}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    if (shippingModal.orderId) {
                      handleUpdateStatus(shippingModal.orderId, 'SHIPPED', shippingData);
                    }
                    setShippingModal({ isOpen: false, orderId: null });
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                >
                  Xác nhận Giao hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
