'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, User as UserIcon, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/Toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải từ 2 ký tự trở lên'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
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
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(apiUrl + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký không thành công');
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const loginData = await loginRes.json();

      setAuth(loginData.user, loginData.accessToken);
      success('Tài khoản đã tạo thành công! Đang chuyển hướng...');

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    } catch (err: any) {
      error(err.message || 'Lỗi khi tạo tài khoản');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tạo tài khoản mới</h1>
          <p className="text-sm text-slate-500 mt-1">Tham gia mua sắm và nhận ưu đãi giảm giá độc quyền</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Họ và tên</label>
            <Input
              type="text"
              placeholder="Nguyễn Văn A"
              icon={<UserIcon className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

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
            Đăng ký tài khoản
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
