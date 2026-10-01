'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/components/providers/SocketProvider';
import { formatVND } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { DollarSign, ShoppingBag, Truck, XCircle, AlertTriangle, ArrowRight, PackageX, Package, CheckCircle2 } from 'lucide-react';

interface DashboardStats {
  overview: {
    revenueToday: number;
    totalOrdersToday: number;
    deliveredToday: number;
    cancelledToday: number;
    cancelRate: number;
  };
  alerts: {
    lowStockProducts: { id: number; name: string; stock: number }[];
    stuckOrders: { id: number; createdAt: string }[];
  };
}

export default function AdminDashboardPage() {
  const { token, isAuthenticated } = useAuthStore();
  const { socket } = useSocket();
  const { error } = useToast();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      error('Lỗi tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  }, [token, error]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, fetchStats]);

  // Real-time updates for dashboard
  useEffect(() => {
    if (!socket) return;
    
    // Refresh stats when any order changes
    socket.on('orderCreated', fetchStats);
    socket.on('orderStatusUpdated', fetchStats);

    return () => {
      socket.off('orderCreated', fetchStats);
      socket.off('orderStatusUpdated', fetchStats);
    };
  }, [socket, fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Đang tải dữ liệu tổng quan...</p>
        </div>
      </div>
    );
  }

  const { overview, alerts } = stats;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <DollarSign className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Xin chào, Admin! 👋</h1>
          <p className="text-indigo-200 text-lg">Dưới đây là tổng quan tình hình kinh doanh của ngày {new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Doanh thu hôm nay</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatVND(overview.revenueToday)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Đơn hàng mới</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{overview.totalOrdersToday} <span className="text-sm font-normal text-slate-400">đơn</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Giao thành công</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{overview.deliveredToday} <span className="text-sm font-normal text-slate-400">đơn</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            {overview.cancelRate > 20 && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Cao
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tỷ lệ hủy đơn</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{overview.cancelRate.toFixed(1)}% <span className="text-sm font-normal text-slate-400">({overview.cancelledToday})</span></h3>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stuck Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Đơn hàng cần xử lý</h3>
            </div>
            <span className="bg-slate-100 text-slate-600 py-1 px-3 rounded-full text-sm font-medium">
              {alerts.stuckOrders.length} đơn kẹt (&gt;24h)
            </span>
          </div>
          <div className="p-0 flex-1 bg-slate-50/50">
            {alerts.stuckOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-medium text-slate-900 mb-1">Tuyệt vời!</p>
                <p className="text-sm">Không có đơn hàng nào bị tồn đọng.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.stuckOrders.map(order => (
                  <div key={order.id} className="p-5 hover:bg-white flex justify-between items-center transition-colors group">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        Đơn #{order.id}
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Pending</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                        Tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <Link href={`/admin/orders?status=PENDING`} className="text-indigo-600 hover:text-indigo-700 font-medium text-sm px-4 py-2 hover:bg-indigo-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                      Xử lý ngay
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <PackageX className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Cảnh báo tồn kho</h3>
            </div>
            <span className="bg-slate-100 text-slate-600 py-1 px-3 rounded-full text-sm font-medium">
              {alerts.lowStockProducts.length} sản phẩm
            </span>
          </div>
          <div className="p-0 flex-1 bg-slate-50/50">
            {alerts.lowStockProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-medium text-slate-900 mb-1">Kho hàng ổn định</p>
                <p className="text-sm">Không có sản phẩm nào sắp hết hàng.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.lowStockProducts.map(product => (
                  <div key={product.id} className="p-5 hover:bg-white flex justify-between items-center transition-colors group">
                    <div>
                      <div className="font-semibold text-slate-900 line-clamp-1">{product.name}</div>
                      <div className="text-sm font-medium text-rose-600 mt-1 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        Chỉ còn {product.stock} sản phẩm
                      </div>
                    </div>
                    <Link href={`/admin/products/${product.id}`} className="text-indigo-600 hover:text-indigo-700 font-medium text-sm px-4 py-2 hover:bg-indigo-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      Nhập thêm
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
