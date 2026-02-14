import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await db('users').where({ username: body.username }).first();
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const password_hash = await bcrypt.hash(body.password, 10);
    const [id] = await db('users').insert({ username: body.username, password_hash });
    const user = { id, username: body.username, created_at: new Date().toISOString() };
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await db('users').where({ username: body.username }).first();
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ id: user.id, username: user.username });
    res.json({
      user: { id: user.id, username: user.username, created_at: user.created_at },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await db('users').where({ id: req.user!.id }).select('id', 'username', 'created_at').first();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

export default router;
