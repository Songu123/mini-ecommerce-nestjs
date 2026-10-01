// src/components/OrderStatusBadge.tsx
import React from 'react';

type OrderStatus = 'AWAITING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface Props {
  status: OrderStatus;
}

const statusMap: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  AWAITING_PAYMENT: { label: 'Chờ Thanh Toán', bg: 'bg-amber-100', color: 'text-amber-800' },
  PENDING: { label: 'Chờ Xác Nhận', bg: 'bg-slate-100', color: 'text-slate-800' },
  CONFIRMED: { label: 'Đã Xác Nhận', bg: 'bg-blue-100', color: 'text-blue-800' },
  SHIPPED: { label: 'Đang Giao', bg: 'bg-purple-100', color: 'text-purple-800' },
  DELIVERED: { label: 'Đã Nhận', bg: 'bg-green-100', color: 'text-green-800' },
  CANCELLED: { label: 'Đã Hủy', bg: 'bg-rose-100', color: 'text-rose-800' },
};

export const OrderStatusBadge: React.FC<Props> = ({ status }) => {
  const { label, bg, color } = statusMap[status];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bg} ${color} shadow-sm`} aria-label={`Trạng thái đơn: ${label}`}>
      {label}
    </span>
  );
};

export default OrderStatusBadge;
