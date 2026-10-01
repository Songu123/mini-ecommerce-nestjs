import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Hàm parse JWT đơn giản chạy được trên Edge Runtime
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua các file tĩnh, ảnh, api route của Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(.*)$/)
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Nếu có accessToken, kiểm tra hạn sử dụng
  if (accessToken) {
    const payload = parseJwt(accessToken);
    // Trừ hao 30 giây để đảm bảo token chưa "vừa đúng lúc" hết hạn
    const isExpired = payload && payload.exp && payload.exp * 1000 < Date.now() + 30000;

    if (isExpired && refreshToken) {
      // Token hết hạn, tiến hành Refresh Token ngầm
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      try {
        const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newAccessToken = data.access_token || data.accessToken;
          const newRefreshToken = data.refresh_token || data.refreshToken;

          if (newAccessToken) {
            // 1. Cập nhật cookie cho Server Components (layout.tsx) đọc ngay lập tức
            request.cookies.set('accessToken', newAccessToken);
            if (newRefreshToken) request.cookies.set('refreshToken', newRefreshToken);
            
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('cookie', request.cookies.toString());
            
            const response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });

            // 2. Cập nhật cookie trả về trình duyệt
            response.cookies.set('accessToken', newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 60 * 60 * 24, // 1 ngày
            });

            if (newRefreshToken) {
              response.cookies.set('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 ngày
              });
            }

            return response;
          }
        } else {
          // Refresh thất bại (Refresh token cũ quá hoặc bị ban), xóa sạch
          const response = NextResponse.next();
          response.cookies.delete('accessToken');
          response.cookies.delete('refreshToken');
          return response;
        }
      } catch (err) {
        // Lỗi mạng hoặc server sập, bỏ qua cho qua vòng tiếp theo
      }
    }
  }

  if (accessToken) {
    if (pathname === '/login' || pathname === '/register') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}
