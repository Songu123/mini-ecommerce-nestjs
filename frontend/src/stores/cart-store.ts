import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';
import { useAuthStore } from './auth-store';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
};
const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface CartItem {
  product: Product;
  variant?: import('@/types').ProductVariant;
  quantity: number;
  selected: boolean;
}

const getItemId = (item: { product: Product, variant?: import('@/types').ProductVariant }) => {
  return `${item.product.id}-${item.variant?.id || 'none'}`;
};

interface CartStore {
  items: CartItem[];
  appliedCoupon: {
    code: string;
    discountAmount: number;
  } | null;
  addItem: (product: Product, quantity?: number, variant?: import('@/types').ProductVariant) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variantId?: number) => void;
  applyCoupon: (coupon: { code: string; discountAmount: number } | null) => void;
  clearCart: () => void;
  clearSelectedItems: () => void;
  toggleSelectItem: (productId: number, variantId?: number) => void;
  toggleSelectAll: (selected: boolean) => void;
  getTotalItems: () => number;
  getSelectedItemsCount: () => number;
  getSubtotal: () => number;
  getTotalPrice: () => number;
  syncCartWithServer: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,

      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const targetId = getItemId({ product, variant });
          const existing = state.items.find((item) => getItemId(item) === targetId);
          if (existing) {
            const stockLimit = variant ? variant.stock : product.stock;
            const newQty = Math.min(existing.quantity + quantity, stockLimit);
            return {
              items: state.items.map((item) =>
                getItemId(item) === targetId ? { ...item, quantity: newQty, selected: true } : item
              ),
            };
          }
          return { items: [...state.items, { product, variant, quantity, selected: true }] };
        });

        const headers = getHeaders();
        if (headers) {
          fetch(`${getApiUrl()}/cart/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId: product.id, productVariantId: variant?.id, quantity }),
          }).catch(() => {});
        }
      },

      removeItem: (productId, variantId) => {
        const targetId = `${productId}-${variantId || 'none'}`;
        set((state) => ({
          items: state.items.filter((item) => getItemId(item) !== targetId),
          appliedCoupon: null,
        }));

        const headers = getHeaders();
        if (headers) {
          fetch(`${getApiUrl()}/cart/items/${productId}${variantId ? `?variantId=${variantId}` : ''}`, {
            method: 'DELETE',
            headers,
          }).catch(() => {});
        }
      },

      updateQuantity: (productId, quantity, variantId) => {
        const targetId = `${productId}-${variantId || 'none'}`;
        set((state) => ({
          items: state.items.map((item) => {
            if (getItemId(item) === targetId) {
              const stockLimit = item.variant ? item.variant.stock : item.product.stock;
              const safeQty = Math.max(1, Math.min(quantity, stockLimit));
              return { ...item, quantity: safeQty };
            }
            return item;
          }),
          appliedCoupon: null,
        }));

        const headers = getHeaders();
        if (headers) {
          fetch(`${getApiUrl()}/cart/items/${productId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ quantity, productVariantId: variantId }),
          }).catch(() => {});
        }
      },

      applyCoupon: (coupon) => {
        set({ appliedCoupon: coupon });
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null });
        const headers = getHeaders();
        if (headers) {
          fetch(`${getApiUrl()}/cart`, {
            method: 'DELETE',
            headers,
          }).catch(() => {});
        }
      },

      clearSelectedItems: () => {
        const state = get();
        const selectedItems = state.items.filter((i) => i.selected);

        set((s) => ({
          items: s.items.filter((item) => !item.selected),
          appliedCoupon: null,
        }));

        const headers = getHeaders();
        if (headers) {
          selectedItems.forEach((item) => {
            const vQuery = item.variant?.id ? `?variantId=${item.variant.id}` : '';
            fetch(`${getApiUrl()}/cart/items/${item.product.id}${vQuery}`, {
              method: 'DELETE',
              headers,
            }).catch(() => {});
          });
        }
      },

      toggleSelectItem: (productId, variantId) => {
        const targetId = `${productId}-${variantId || 'none'}`;
        set((state) => ({
          items: state.items.map((item) =>
            getItemId(item) === targetId ? { ...item, selected: !item.selected } : item
          ),
          appliedCoupon: null,
        }));
      },

      toggleSelectAll: (selected) => {
        set((state) => ({
          items: state.items.map((item) => ({ ...item, selected })),
          appliedCoupon: null,
        }));
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSelectedItemsCount: () => {
        return get().items.filter(item => item.selected).reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items
          .filter(item => item.selected)
          .reduce((total, item) => {
            const price = item.variant?.price || item.product.price;
            return total + Number(price) * item.quantity;
          }, 0);
      },

      getTotalPrice: () => {
        const subtotal = get().getSubtotal();
        const applied = get().appliedCoupon;
        const discount = applied ? applied.discountAmount : 0;
        return Math.max(0, subtotal - discount);
      },

      syncCartWithServer: async () => {
        const headers = getHeaders();
        if (!headers) return;

        const state = get();
        // Upload local items
        for (const item of state.items) {
          await fetch(`${getApiUrl()}/cart/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId: item.product.id, productVariantId: item.variant?.id, quantity: item.quantity }),
          }).catch(() => {});
        }

        // Fetch merged cart
        try {
          const res = await fetch(`${getApiUrl()}/cart`, { headers });
          if (res.ok) {
            const data = await res.json();
            const newItems = data.items.map((i: any) => ({
              product: i.product,
              variant: i.productVariant,
              quantity: i.quantity,
              selected: true,
            }));
            set({ items: newItems });
          }
        } catch (e) {}
      },
    }),
    {
      name: 'techstore-cart',
    }
  )
);