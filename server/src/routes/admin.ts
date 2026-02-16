import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validatePassword } from '@nomnom/shared';

const router = Router();

router.use(authenticate, requireAdmin);

// List all users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await db('users').select('id', 'username', 'created_at').orderBy('created_at');
    res.json(users);
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);

    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Orphan items created by this user so they persist in the library
    await db('items').where({ created_by: userId }).update({ created_by: null });

    // Delete user (CASCADE handles lists, list_items, shares)
    await db('users').where({ id: userId }).del();

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset a user's password
router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db('users').where({ id: userId }).update({ password_hash });

    res.json({ success: true });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
