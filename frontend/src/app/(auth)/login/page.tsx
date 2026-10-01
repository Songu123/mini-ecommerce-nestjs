'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/Toast';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, setAuth } = useAuthStore();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng nhập không thành công');
      }

      setAuth(data.user, data.accessToken);
      
      // Đồng bộ giỏ hàng dưới máy người dùng (chưa đăng nhập) lên Database
      try {
        const { useCartStore } = await import('@/stores/cart-store');
        await useCartStore.getState().syncCartWithServer();
      } catch (e) {
        console.error('Failed to sync cart on login', e);
      }

      success('Đăng nhập thành công! Đang chuyển hướng...');

      setTimeout(() => {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/products');
        } else {
          router.push('/');
        }
        router.refresh();
      }, 800);
    } catch (err: any) {
      error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-600/30">
            <ShoppingBag className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chào mừng trở lại!</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để tiếp tục mua sắm hoặc quản lý đơn hàng</p>
        </div>

        <div className="bg-indigo-50/60 rounded-2xl p-4 mb-6 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
          <div className="font-bold mb-1">Tài khoản trải nghiệm mẫu:</div>
          <div>• Admin: <code className="font-mono bg-indigo-100/70 px-1 py-0.5 rounded">admin@example.com</code> / <code className="font-mono bg-indigo-100/70 px-1 py-0.5 rounded">password123</code></div>
          <div>• User: <code className="font-mono bg-indigo-100/70 px-1 py-0.5 rounded">john@example.com</code> / <code className="font-mono bg-indigo-100/70 px-1 py-0.5 rounded">password123</code></div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Email</label>
            <Input
              type="email"
              placeholder="tenban@example.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Mật khẩu</label>
            <Input
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Đăng nhập
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}
