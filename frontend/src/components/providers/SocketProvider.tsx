'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/Toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated, token } = useAuthStore();
  const { success, info } = useToast();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Khởi tạo kết nối socket
    const socketInstance = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', socketInstance.id);
      
      // Xin join room dựa trên role
      socketInstance.emit('joinRoom', { role: user.role, userId: user.id });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    // Lắng nghe sự kiện toàn cục
    socketInstance.on('orderCreated', (payload) => {
      // Admin sẽ nhận được tất cả thông báo đơn mới
      // User thường chỉ nhận của họ (backend đã filter)
      success(payload.message || `Đơn hàng #${payload.order?.id} vừa được tạo`);
    });

    socketInstance.on('orderStatusUpdated', (payload) => {
      info(payload.message || `Đơn hàng #${payload.order?.id} vừa thay đổi trạng thái`);
      // Note: Components like Order History page can also listen to this event 
      // via useSocket() to trigger a local state refresh
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, user, token]); // Re-run when auth state changes

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
