import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/layout/SessionProvider';
import { User } from '@/types';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TechStore - Thiết bị công nghệ hiện đại',
  description: 'Nền tảng mua sắm công nghệ thông minh, thanh toán tức thì và quản lý đơn hàng',
};

async function getInitialSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value || null;
  if (!token) return { user: null, token: null };
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(apiUrl + '/auth/profile', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    if (!res.ok) return { user: null, token: null };
    const user = (await res.json()) as User;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

import { SocketProvider } from '@/components/providers/SocketProvider';

import { LayoutWrapper } from '@/components/layout/LayoutWrapper';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, token } = await getInitialSession();
  return (
    <html suppressHydrationWarning lang='vi' className='h-full scroll-smooth'>
      <body suppressHydrationWarning className={inter.className + ' min-h-screen flex flex-col bg-slate-50/50 text-slate-900 antialiased'}>
        <SessionProvider initialUser={user} initialToken={token}>
          <ToastProvider>
            <SocketProvider>
              <LayoutWrapper initialUser={user}>
                {children}
              </LayoutWrapper>
            </SocketProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}