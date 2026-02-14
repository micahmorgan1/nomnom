import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const search = req.query.search as string | undefined;

    let query = db('items')
      .join('categories', 'items.category_id', 'categories.id')
      .where('items.created_by', userId)
      .select(
        'items.*',
        'categories.name as category_name',
        'categories.color as category_color'
      )
      .orderBy('items.name');

    if (search) {
      query = query.where('items.name', 'like', `%${search}%`);
    }

    const items = await query;
    res.json(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        category_id: i.category_id,
        created_by: i.created_by,
        category: {
          id: i.category_id,
          name: i.category_name,
          color: i.category_color,
        },
      }))
    );
  } catch (err) {
    console.error('Items fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Number(req.params.id);
    const item = await db('items').where({ id: itemId, created_by: req.user!.id }).first();
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const updates: Record<string, any> = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.category_id) updates.category_id = req.body.category_id;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    await db('items').where({ id: itemId }).update(updates);
    const updated = await db('items').where({ id: itemId }).first();
    res.json(updated);
  } catch (err) {
    console.error('Item update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Number(req.params.id);
    const item = await db('items').where({ id: itemId, created_by: req.user!.id }).first();
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    await db('items').where({ id: itemId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('Item delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
