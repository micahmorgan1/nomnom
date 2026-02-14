import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@nomnom/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(token: string): TypedSocket {
  if (!socket) {
    socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    }) as TypedSocket;
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
