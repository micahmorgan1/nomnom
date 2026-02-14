import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import authRoutes from './routes/auth.js';
import listRoutes from './routes/lists.js';
import listItemRoutes from './routes/listItems.js';
import itemRoutes from './routes/items.js';
import categoryRoutes from './routes/categories.js';
import shareRoutes from './routes/shares.js';
import { setupSocket } from './socket.js';
import db from './db.js';
import { DEFAULT_CATEGORIES } from '@nomnom/shared';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3002;

// Socket.IO
const io = new SocketServer(httpServer, {
  cors: { origin: '*' },
});
setupSocket(io);
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/lists', listItemRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/lists', shareRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Production: serve client build
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Run migrations + seed defaults, then listen
async function start() {
  await db.migrate.latest();

  // Seed default categories if needed
  const existing = await db('categories').where({ is_default: true }).first();
  if (!existing) {
    await db('categories').insert(
      DEFAULT_CATEGORIES.map((c) => ({
        name: c.name,
        color: c.color,
        is_default: true,
        user_id: null,
      }))
    );
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`nomnom server listening on 0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
