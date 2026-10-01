'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { Activity, Search, Filter, ShieldAlert } from 'lucide-react';

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entityId: string | null;
  entityType: string;
  details: any;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
}

export default function AdminAuditLogsPage() {
  const { token } = useAuthStore();
  const { error } = useToast();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const url = filterType === 'ALL' 
        ? `${apiUrl}/audit-logs`
        : `${apiUrl}/audit-logs?entityType=${filterType}`;
        
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        error('Lỗi khi tải nhật ký hệ thống');
      }
    } catch (err) {
      error('Lỗi kết nối khi tải nhật ký');
    } finally {
      setLoading(false);
    }
  }, [token, error, filterType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (log.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.entityId || '').includes(searchTerm)
  );

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-700';
    if (action.includes('UPDATE')) return 'bg-blue-50 text-blue-700';
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-rose-50 text-rose-700';
    return 'bg-slate-50 text-slate-700';
  };

  const getEntityLabel = (type: string) => {
    const map: Record<string, string> = {
      'Product': 'Sản phẩm',
      'Order': 'Đơn hàng',
      'Coupon': 'Khuyến mãi',
      'User': 'Người dùng'
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-600" />
            Nhật ký hệ thống (Audit Log)
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Truy vết mọi hoạt động thay đổi dữ liệu của Quản trị viên.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white text-sm"
            >
              <option value="ALL">Tất cả đối tượng</option>
              <option value="Order">Đơn hàng</option>
              <option value="Product">Sản phẩm</option>
              <option value="Coupon">Khuyến mãi</option>
            </select>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm hành động, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[250px] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Quản trị viên</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Đối tượng</th>
                <th className="px-6 py-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    Không tìm thấy nhật ký hoạt động nào.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <p className="font-bold text-slate-900">{log.user.name || 'Admin'}</p>
                          <p className="text-xs text-slate-500">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Hệ thống (Cronjob)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700">{getEntityLabel(log.entityType)}</p>
                      {log.entityId && <p className="text-xs text-slate-400 font-mono">#{log.entityId}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs text-xs text-slate-600 truncate" title={JSON.stringify(log.details)}>
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
