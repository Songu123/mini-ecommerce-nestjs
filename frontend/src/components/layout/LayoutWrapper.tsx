'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { User } from '@/types';

export function LayoutWrapper({ 
  children, 
  initialUser 
}: { 
  children: React.ReactNode, 
  initialUser: User | null 
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header initialUser={initialUser} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
