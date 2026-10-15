import { createServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { sequelize } from './config/database.js';
import { sql } from './config/sql.js';
import { env } from './config/env.js';

const httpServer = createServer();
const allowedOrigins = env.clientUrl.split(',').map((origin) => origin.trim()).filter(Boolean);

/**
 * Real-time layer: authenticated per-user rooms + conversation rooms.
 * Event contract (mirrored in clients/src/services/socket.ts):
 *   client -> server: 'chat:join' { conversationId }, 'chat:message' { conversationId, body }
 *   server -> client: 'chat:message' { id, conversationId, senderId, senderName, body, createdAt }
 */
export const io = new Server(httpServer, {
  cors: { origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
});

io.use((socket, next) => {
  try {
    const token = (socket.handshake.auth?.token as string | undefined)
      ?? (socket.handshake.headers.authorization ?? '').replace(/^Bearer /, '');
    if (!token) return next(new Error('Authentication required'));
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string; role?: string; email?: string };
    if (!payload.sub) return next(new Error('Invalid authentication token'));
    socket.data.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(new Error('Authentication token expired or invalid'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user as { id: string; role?: string };
  void socket.join(`user:${user.id}`);

  socket.on('chat:join', async (conversationId: unknown) => {
    try {
      if (typeof conversationId !== 'string' || !conversationId) return;
      const member = await sql<{ conversation_id: string }>(
        'SELECT conversation_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1',
        { replacements: [conversationId, user.id], type: QueryTypes.SELECT }
      );
      if (member.length) void socket.join(`conversation:${conversationId}`);
    } catch { /* ignore */ }
  });

  socket.on('chat:message', async (input: unknown) => {
    try {
      const { conversationId, body } = (input ?? {}) as { conversationId?: unknown; body?: unknown };
      if (typeof conversationId !== 'string' || !conversationId) return;
      const text = typeof body === 'string' ? body.trim() : '';
      if (!text || text.length > 2000) return;
      const member = await sql<{ conversation_id: string }>(
        'SELECT conversation_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1',
        { replacements: [conversationId, user.id], type: QueryTypes.SELECT }
      );
      if (!member.length) return;
      const saved = await sql<{ id: number; created_at: Date }>(
        `INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?) RETURNING id, created_at`,
        { replacements: [conversationId, user.id, text], type: QueryTypes.SELECT }
      );
      const names = await sql<{ first_name: string; last_name: string }>(
        'SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1',
        { replacements: [user.id], type: QueryTypes.SELECT }
      );
      const senderName = names.length ? `${names[0].first_name} ${names[0].last_name}`.trim() : 'User';
      const peers = await sql<{ user_id: string }>(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
        { replacements: [conversationId], type: QueryTypes.SELECT }
      );
      const payload = {
        id: saved[0]?.id ?? Date.now(),
        conversationId,
        senderId: user.id,
        senderName,
        body: text,
        createdAt: saved[0]?.created_at ?? new Date().toISOString(),
      };
      for (const peer of peers) io.to(`user:${peer.user_id}`).emit('chat:message', payload);
    } catch { /* never crash the socket on a bad message */ }
  });
});

export const startSocketServer = (port: number): void => {
  httpServer.listen(port, () => console.log(`Socket server listening on ${port}`));
};
