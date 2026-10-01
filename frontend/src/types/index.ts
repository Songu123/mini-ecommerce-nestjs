export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: string | number;
  stock: number;
  categoryId: number;
  isActive: boolean;
  category?: Category;
  images: ProductImage[];
  variants?: ProductVariant[];
  reviews?: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  stock: number;
  price?: number | null;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string | null;
  userId: number;
  productId: number;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  starDistribution: Record<number, number>;
}

export interface ProductReviewsResponse {
  productId: number;
  summary: ReviewSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  reviews: Review[];
}

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: string | number;
  product: Product;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: string | number;
  discountAmount: string | number;
  status: OrderStatus;
  couponId?: number | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string | number;
  minOrderValue?: string | number | null;
  maxDiscount?: string | number | null;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  couponCode?: string;
}

export interface CreateReviewDto {
  productId: number;
  rating: number;
  comment?: string;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  [key: number]: number;
}

export interface PaymentIntentResponse {
  orderId: number;
  paymentUrl: string;
  amount: number;
  orderStatus: OrderStatus;
}
