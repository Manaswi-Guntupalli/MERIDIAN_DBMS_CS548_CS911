import { io, type Socket } from 'socket.io-client';
import { TOKEN_KEY } from './api';

let socket: Socket | null = null;
let socketToken: string | null = null;

// The server derives the school room from our JWT — we never ask to join one.
export function connectSocket(): Socket | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (socket && socketToken === token) return socket;
  disconnectSocket();
  socketToken = token;
  socket = io(process.env.NEXT_PUBLIC_SOCKET_ORIGIN || '/', { addTrailingSlash: false, transports: ['polling', 'websocket'], tryAllTransports: true, auth: { token } });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
