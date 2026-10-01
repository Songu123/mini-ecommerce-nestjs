'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/Button';
import { formatVND } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, Loader2, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '@/components/ui/Toast';

export default function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = React.use(params);
  const orderId = resolvedParams.orderId;
  const router = useRouter();
  const { isAuthenticated, token, isLoading } = useAuthStore();
  const { socket } = useSocket();
  const { success, error } = useToast();
  
  const [order, setOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'LOADING'>('LOADING');
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/payment/' + orderId);
      return;
    }

    const fetchOrder = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        
        // Handle VNPay Return URL
        if (window.location.search.includes('vnp_ResponseCode')) {
          try {
            await fetch(`${apiUrl}/payments/vnpay-return${window.location.search}`);
            // The backend verifyReturnUrl will emit Socket.io if successful!
            // Clear URL query parameters for clean UI
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (e) {
            console.error('Error verifying VNPay return', e);
          }
        }

        const res = await fetch(`${apiUrl}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
          setPaymentStatus(data.status);
          
          if (data.status === 'AWAITING_PAYMENT') {
            const createdAt = new Date(data.createdAt).getTime();
            const expiresAt = createdAt + 15 * 60 * 1000;
            const now = Date.now();
            const remaining = Math.floor((expiresAt - now) / 1000);
            
            if (remaining > 0) {
              setTimeLeft(remaining);
            } else {
              setTimeLeft(0);
              setPaymentStatus('CANCELLED');
              // Optionally call backend to cancel
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchOrder();
  }, [orderId, isAuthenticated, isLoading, token, router]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || paymentStatus !== 'AWAITING_PAYMENT') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          setPaymentStatus('CANCELLED');
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, paymentStatus]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (data: any) => {
      // The socket sends payload: { event: 'orderStatusUpdated', order: { id, status... } }
      const incomingOrder = data.order || data;
      if (incomingOrder.id === Number(orderId) && incomingOrder.status === 'CONFIRMED') {
        setPaymentStatus('CONFIRMED');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        success('Thanh toán thành công qua cổng thanh toán!');
      }
    };

    socket.on('orderStatusUpdated', handleOrderUpdate);

    return () => {
      socket.off('orderStatusUpdated', handleOrderUpdate);
    };
  }, [socket, orderId, success]);

  const handleVNPayClick = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: Number(orderId) })
      });
      const data = await res.json();
      if (res.ok) {
        // In real app, window.location.href = data.paymentUrl;
        success('Link thanh toán đã được tạo (Xem console để lấy link VNPay Sandbox)');
        console.log('VNPAY Sandbox URL:', data.paymentUrl);
        window.open(data.paymentUrl, '_blank');
      } else {
        error(data.message || 'Lỗi khi tạo phiên thanh toán');
      }
    } catch (err) {
      error('Lỗi kết nối');
    }
  };

  const simulateWebhookSuccess = async () => {
    setWebhookSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const payload = {
        transactionId: `TXN_MOCK_${Date.now()}`,
        idempotencyKey: `idem_mock_${Date.now()}`,
        orderId: Number(orderId),
        amount: order?.totalAmount || 0,
        status: 'SUCCESS',
        message: 'Thanh toán giả lập thành công'
      };

      const res = await fetch(`${apiUrl}/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.message || 'Lỗi giả lập Webhook');
      }
      // If success, we wait for Socket.io to trigger the UI update!
    } catch (err) {
      error('Lỗi kết nối Webhook');
    } finally {
      setWebhookSubmitting(false);
    }
  };

  if (paymentStatus === 'LOADING' || !order) {
    return <div className="py-24 text-center flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const isWarning = timeLeft && timeLeft < 120; // less than 2 minutes
  const minutes = timeLeft ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft ? timeLeft % 60 : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-24">
      {paymentStatus === 'AWAITING_PAYMENT' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán Đơn hàng #{order.id}</h1>
          <p className="text-slate-500 mb-8">Vui lòng hoàn tất thanh toán để chúng tôi tiến hành giao hàng.</p>
          
          <div className="text-4xl font-extrabold text-slate-900 mb-6">
            {formatVND(order.totalAmount)}
          </div>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 font-mono text-xl font-bold transition-colors ${isWarning ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
            <Clock className="w-5 h-5" />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <div className="space-y-4 max-w-sm mx-auto">
            <Button onClick={handleVNPayClick} className="w-full h-12 text-lg bg-[#005BAA] hover:bg-[#004a8b]">
              <CreditCard className="w-5 h-5 mr-2" />
              Thanh toán qua VNPAY
            </Button>
          </div>

          {/* Widget Giả lập Webhook Sandbox */}
          <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-left">
            <div className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Widget Giả lập Webhook Sandbox
            </div>
            <p className="text-sm text-slate-500 mb-4">Dành cho Demo/Test: Giả lập cổng thanh toán gọi API Webhook về hệ thống. Khi click, Socket.io sẽ phát tín hiệu Real-time thay đổi trạng thái ngay lập tức.</p>
            <Button 
              variant="outline" 
              onClick={simulateWebhookSuccess} 
              isLoading={webhookSubmitting}
              className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            >
              🚀 Bắn Webhook "Thanh toán thành công"
            </Button>
          </div>
        </div>
      )}

      {paymentStatus === 'CONFIRMED' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-emerald-200/30 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Thanh toán thành công!</h1>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Giao dịch cho đơn hàng <strong className="text-slate-900">#{order.id}</strong> đã được ghi nhận qua hệ thống Webhook Real-time.
          </p>
          <Button onClick={() => router.push('/orders')} className="w-full sm:w-auto">
            Quản lý đơn hàng
          </Button>
        </div>
      )}

      {paymentStatus === 'CANCELLED' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-red-200/30 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Đơn hàng đã hết hạn thanh toán</h1>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Rất tiếc, thời gian thanh toán 15 phút cho đơn hàng <strong className="text-slate-900">#{order.id}</strong> đã kết thúc. Đơn hàng đã tự động bị Hủy (CANCELLED).
          </p>
          <Button onClick={() => router.push('/cart')} className="w-full sm:w-auto">
            Quay lại giỏ hàng
          </Button>
        </div>
      )}
    </div>
  );
}
