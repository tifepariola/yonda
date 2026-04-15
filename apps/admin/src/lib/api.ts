const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('yonda_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    localStorage.removeItem('yonda_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: object) => request<T>('POST', path, body),
  patch: <T>(path: string, body: object) => request<T>('PATCH', path, body),
};

// Auth
export const login = (email: string, password: string) =>
  api.post<{ token: string; admin: { id: string; email: string; name: string } }>(
    '/admin/auth/login',
    { email, password },
  );

// Orders
export const getOrders = (params?: { status?: string; phone?: string; page?: number }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.phone) qs.set('phone', params.phone);
  if (params?.page) qs.set('page', String(params.page));
  return api.get<{ orders: Order[]; total: number; pages: number }>(`/admin/orders?${qs}`);
};

export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/admin/orders/${id}/status`, { status });

export const markOrderPaid = (id: string, note?: string) =>
  api.patch(`/admin/orders/${id}/mark-paid`, { note });

// KYC
export const getKycQueue = () => api.get<User[]>('/admin/users/kyc/queue');
export const approveKyc = (userId: string) =>
  api.patch(`/admin/users/kyc/${userId}/approve`, {});
export const rejectKyc = (userId: string, reason: string) =>
  api.patch(`/admin/users/kyc/${userId}/reject`, { reason });
export const getUserBvn = (userId: string) =>
  api.get<{ bvn: string }>(`/admin/users/${userId}/bvn`);

// Rates
export const getActiveRate = () =>
  api.get<FxRate>('/admin/rates/active');
export const getRateHistory = () =>
  api.get<FxRate[]>('/admin/rates');
export const createRate = (baseRateCnyToNgn: number, marginPercent: number) =>
  api.post<FxRate>('/admin/rates', { baseRateCnyToNgn, marginPercent });

// Users
export const getUsers = (params?: { kycStatus?: string; phone?: string }) => {
  const qs = new URLSearchParams();
  if (params?.kycStatus) qs.set('kycStatus', params.kycStatus);
  if (params?.phone) qs.set('phone', params.phone);
  return api.get<{ users: User[]; total: number }>(`/admin/users?${qs}`);
};

// Types
export interface Order {
  id: string;
  orderRef: string;
  status: string;
  ngnAmount: string;
  cnyAmount: string;
  exchangeRate: string;
  deliveryType: string;
  deliveryAccountId: string;
  paystackRef?: string;
  paystackLink?: string;
  paidAt?: string;
  deliveredAt?: string;
  adminNotes?: string;
  createdAt: string;
  user: { whatsappPhone: string; name?: string };
}

export interface User {
  id: string;
  whatsappPhone: string;
  name?: string;
  kycStatus: string;
  isBlocked: boolean;
  createdAt: string;
  kycRejectionReason?: string;
}

export interface FxRate {
  id: string;
  baseRateCnyToNgn: string;
  marginPercent: string;
  effectiveRateCnyToNgn: string;
  isActive: boolean;
  createdAt: string;
}
