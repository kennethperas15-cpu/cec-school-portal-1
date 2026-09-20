export type SocketEvent = 'connect' | 'message' | 'notification' | 'status';

export type SocketMessage = {
  event: SocketEvent;
  payload: Record<string, unknown>;
  timestamp: string;
};

export const socketEvents: SocketEvent[] = ['connect', 'message', 'notification', 'status'];