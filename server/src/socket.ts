import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('list:join', async (listId: number) => {
      const userId = socket.data.user?.id;
      if (!userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const list = await db('lists').where({ id: listId }).first();
      if (!list) {
        socket.emit('error', { message: 'List not found' });
        return;
      }

      if (list.owner_id !== userId) {
        const share = await db('list_shares').where({ list_id: listId, user_id: userId }).first();
        if (!share) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
      }

      socket.join(`list:${listId}`);
    });

    socket.on('list:leave', (listId: number) => {
      socket.leave(`list:${listId}`);
    });
  });
}
