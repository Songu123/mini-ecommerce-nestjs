const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, token, headers, ...customConfig } = options;

  const base = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  let url = endpoint.startsWith('http') ? endpoint : (API_URL + base);

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const q = searchParams.toString();
    if (q) {
      url += (url.includes('?') ? String.fromCharCode(38) : '?') + q;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((headers as Record<string, string>) || {}),
  };

  if (token) {
    reqHeaders['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(url, {
    ...customConfig,
    headers: reqHeaders,
  });

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: res.statusText || 'An unexpected error occurred' };
    }
    const errorMsg = Array.isArray(errorData?.message)
      ? errorData.message.join(', ')
      : errorData?.message || ('HTTP ' + res.status + ': ' + res.statusText);
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}