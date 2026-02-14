import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@nomnom/shared';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from './AuthContext';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<TypedSocket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const s = getSocket(token);
    setSocket(s);

    return () => {
      disconnectSocket();
      setSocket(null);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
