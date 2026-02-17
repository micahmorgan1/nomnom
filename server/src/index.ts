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

import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import listRoutes from './routes/lists.js';
import listItemRoutes from './routes/listItems.js';
import itemRoutes from './routes/items.js';
import categoryRoutes from './routes/categories.js';
import shareRoutes from './routes/shares.js';
import adminRoutes from './routes/admin.js';
import menuRoutes from './routes/menus.js';
import { setupSocket } from './socket.js';
import db from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from '@nomnom/shared';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3002;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Socket.IO
const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS },
});
setupSocket(io);
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/lists', listItemRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/lists', shareRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/menus', menuRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve client build
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

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

  // Seed system items (created_by = NULL) if not already present
  const existingSystemItem = await db('items').whereNull('created_by').first();
  if (!existingSystemItem) {
    // Build a category name → id lookup from default categories
    const defaultCats = await db('categories').where({ is_default: true }).select('id', 'name');
    const catMap = new Map<string, number>();
    for (const cat of defaultCats) {
      catMap.set(cat.name, cat.id);
    }

    const toInsert = DEFAULT_ITEMS
      .filter((item) => catMap.has(item.category))
      .map((item) => ({
        name: item.name,
        category_id: catMap.get(item.category)!,
        created_by: null,
      }));

    if (toInsert.length > 0) {
      // Insert in batches (SQLite limits)
      const BATCH = 50;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        await db('items').insert(toInsert.slice(i, i + BATCH));
      }
      console.log(`Seeded ${toInsert.length} system items.`);
    }
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`nomnom server listening on 0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
