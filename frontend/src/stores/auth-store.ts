import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  initializeSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      initializeSession: async () => {
        try {
          const res = await fetch('/api/auth/session');
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              set({ user: data.user, token: data.accessToken, isAuthenticated: true, isLoading: false });
              return;
            }
          }
          // Giu nguyen state da luu neu fetch loi mang hoac tam thoi chua lay duoc
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'techstore-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);