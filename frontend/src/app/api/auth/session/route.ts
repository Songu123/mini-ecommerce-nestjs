import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('accessToken')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    const res = await fetch(apiUrl + '/auth/profile', {
      headers: { Authorization: 'Bearer ' + token },
    });

    if (!res.ok) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await res.json();
    return NextResponse.json({ authenticated: true, user, accessToken: token });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
