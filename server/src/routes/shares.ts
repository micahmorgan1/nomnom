import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:listId/shares', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const list = await db('lists').where({ id: listId }).first();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    // Must be owner or shared with
    if (list.owner_id !== req.user!.id) {
      const share = await db('list_shares').where({ list_id: listId, user_id: req.user!.id }).first();
      if (!share) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const shares = await db('list_shares')
      .join('users', 'list_shares.user_id', 'users.id')
      .where('list_shares.list_id', listId)
      .select('list_shares.*', 'users.username');

    res.json(shares);
  } catch (err) {
    console.error('Shares fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:listId/shares', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const list = await db('lists').where({ id: listId }).first();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    if (list.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the owner can share a list' });
      return;
    }

    const { username, permission } = req.body;
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const targetUser = await db('users').where({ username }).first();
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (targetUser.id === req.user!.id) {
      res.status(400).json({ error: 'Cannot share with yourself' });
      return;
    }

    // Check if already shared
    const existing = await db('list_shares').where({ list_id: listId, user_id: targetUser.id }).first();
    if (existing) {
      await db('list_shares').where({ list_id: listId, user_id: targetUser.id }).update({
        permission: permission || 'edit',
      });
    } else {
      await db('list_shares').insert({
        list_id: listId,
        user_id: targetUser.id,
        permission: permission || 'edit',
      });
    }

    res.status(201).json({ list_id: listId, user_id: targetUser.id, username, permission: permission || 'edit' });
  } catch (err) {
    console.error('Share create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:listId/shares/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const targetUserId = Number(req.params.userId);

    const list = await db('lists').where({ id: listId }).first();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    if (list.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the owner can manage shares' });
      return;
    }

    await db('list_shares').where({ list_id: listId, user_id: targetUserId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('Share delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
