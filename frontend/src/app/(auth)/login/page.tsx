'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const { isAuthenticated, setAuth } = useAuthStore();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }

    const token = searchParams.get('token');
    if (token) {
      setLoading(true);
      // Fetch profile to get user info
      fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json())
      .then(user => {
        if (user && user.id) {
          setAuth(user, token);
          success('Đăng nhập bằng Google thành công!');
          router.replace('/');
        }
      }).catch(() => {
        error('Đăng nhập Google thất bại');
      }).finally(() => setLoading(false));
    }
  }, [isAuthenticated, router, searchParams, setAuth, success, error]);

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

        <div className="mt-6 flex items-center justify-between">
          <span className="w-1/5 border-b border-slate-200 lg:w-1/4"></span>
          <span className="text-xs text-center text-slate-500 uppercase">Hoặc đăng nhập bằng</span>
          <span className="w-1/5 border-b border-slate-200 lg:w-1/4"></span>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full mt-4 flex items-center justify-center gap-2"
          onClick={() => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            window.location.href = `${apiUrl}/auth/google`;
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </Button>

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
