import { apiClient } from './api-client';
import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  User,
  Product,
  Category,
  Order,
  CreateOrderDto,
  Review,
  CreateReviewDto,
  RatingDistribution,
  Coupon,
  PaymentIntentResponse,
} from '@/types';

export const authService = {
  login: (data: LoginDto) =>
    apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: RegisterDto) =>
    apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProfile: (token: string) =>
    apiClient<User>('/auth/profile', { token }),
  refreshToken: (refreshToken: string) =>
    apiClient<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

export const productService = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'createdAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }) =>
    apiClient<{
      data: Product[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/products', { params }),

  getById: (id: string) => apiClient<Product>('/products/' + id),

  create: (data: Partial<Product>, token: string) =>
    apiClient<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (id: string, data: Partial<Product>, token: string) =>
    apiClient<Product>('/products/' + id, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string) =>
    apiClient<void>('/products/' + id, {
      method: 'DELETE',
      token,
    }),

  setPrimaryImage: (productId: string, imageId: string, token: string) =>
    apiClient<Product>('/products/' + productId + '/images/' + imageId + '/primary', {
      method: 'PATCH',
      token,
    }),
};

export const categoryService = {
  getAll: () => apiClient<Category[]>('/categories'),
  getById: (id: string) => apiClient<Category>('/categories/' + id),
};

export const orderService = {
  create: (data: CreateOrderDto, token: string) =>
    apiClient<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
  getMyOrders: (token: string) =>
    apiClient<Order[]>('/orders/my-orders', { token }),
  getById: (id: string, token: string) =>
    apiClient<Order>('/orders/' + id, { token }),
  cancel: (id: string, token: string) =>
    apiClient<Order>('/orders/' + id + '/cancel', {
      method: 'PATCH',
      token,
    }),
  getAllAdmin: (token: string) =>
    apiClient<Order[]>('/orders', { token }),
  updateStatusAdmin: (id: string, status: string, token: string) =>
    apiClient<Order>('/orders/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      token,
    }),
};

export const reviewService = {
  getByProduct: (productId: string) =>
    apiClient<{
      reviews: Review[];
      stats: {
        averageRating: number;
        totalReviews: number;
        distribution: RatingDistribution;
      };
    }>('/reviews/product/' + productId),
  create: (data: CreateReviewDto, token: string) =>
    apiClient<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

export const couponService = {
  validate: (code: string, orderTotal: number) =>
    apiClient<{
      valid: boolean;
      discountAmount: number;
      coupon: Coupon;
      message?: string;
    }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderTotal }),
    }),
  getAllAdmin: (token: string) =>
    apiClient<Coupon[]>('/coupons', { token }),
};

export const paymentService = {
  createIntent: (orderId: string, paymentMethod: 'VNPAY' | 'STRIPE' | 'MOMO', token: string) =>
    apiClient<PaymentIntentResponse>('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentMethod }),
      token,
    }),
  triggerMockWebhook: (data: { orderId: string; transactionId: string; status: 'PAID' | 'FAILED' }) =>
    apiClient<{ received: boolean; orderStatus: string }>('/payments/webhook', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};