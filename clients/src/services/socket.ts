import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SOCKET_URL
  ?? 'http://127.0.0.1:4001';

export type ChatMessage = {
  id: number | string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: getAccessToken() ?? '' },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const resetSocket = (): void => {
  try { socket?.disconnect(); } catch { /* ignore */ }
  socket = null;
};
