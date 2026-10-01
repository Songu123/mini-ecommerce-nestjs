'use client';

import React, { createContext, useContext, useState } from 'react';
import { User } from '@/types';
import { useAuthStore } from '@/stores/auth-store';

interface SessionContextType {
  initialUser: User | null;
}

const SessionContext = createContext<SessionContextType>({ initialUser: null });

export function SessionProvider({
  initialUser,
  initialToken,
  children,
}: {
  initialUser: User | null;
  initialToken: string | null;
  children: React.ReactNode;
}) {
  const { setAuth, setUser } = useAuthStore();
  const [synced, setSynced] = useState(false);

  if (!synced) {
    if (initialUser && initialToken) {
      setAuth(initialUser, initialToken);
    } else if (!initialUser) {
      setUser(null);
    }
    setSynced(true);
  }

  return (
    <SessionContext.Provider value={{ initialUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);