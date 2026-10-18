import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';

/**
 * Where the realtime server lives.
 *
 * There is deliberately no production fallback any more: it used to be
 * `http://127.0.0.1:4001`, which made every visitor's browser try to reach a
 * server running on their own machine. Development keeps that convenience (the
 * socket runs beside the API on 4001); a real deployment must name its socket
 * server with VITE_SOCKET_URL. Render exposes a single port, so the API's own
 * origin only becomes valid once the socket is mounted on the API's HTTP server.
 */
const ENV = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env;

export const SOCKET_URL: string | null = (() => {
  const explicit = typeof ENV?.VITE_SOCKET_URL === 'string' ? ENV.VITE_SOCKET_URL.trim() : '';
  if (explicit) return explicit.replace(/\/+$/, '');
  if (ENV?.DEV && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4001`;
  }
  return null;
})();

/** False when the deployment has no realtime server; messaging then reads only. */
export const isChatConfigured = (): boolean => SOCKET_URL !== null;

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
  if (!SOCKET_URL) {
    throw new Error('Realtime messaging is not configured for this deployment');
  }
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
