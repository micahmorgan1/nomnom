import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await db('categories')
      .where({ is_default: true })
      .orWhere({ user_id: req.user!.id })
      .orderBy('name');

    res.json(categories.map((c) => ({ ...c, is_default: !!c.is_default })));
  } catch (err) {
    console.error('Categories fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name || !color) {
      res.status(400).json({ error: 'Name and color are required' });
      return;
    }

    const [id] = await db('categories').insert({
      name: name.trim(),
      color,
      is_default: false,
      user_id: req.user!.id,
    });

    const category = await db('categories').where({ id }).first();
    res.status(201).json({ ...category, is_default: false });
  } catch (err) {
    console.error('Category create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const catId = Number(req.params.id);
    const category = await db('categories').where({ id: catId }).first();
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Allow color edits on default categories, full edits on own custom categories
    if (category.user_id && category.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Cannot edit this category' });
      return;
    }

    const updates: Record<string, any> = {};
    if (!category.is_default && req.body.name) updates.name = req.body.name.trim();
    if (req.body.color) updates.color = req.body.color;

    await db('categories').where({ id: catId }).update(updates);
    const updated = await db('categories').where({ id: catId }).first();
    res.json({ ...updated, is_default: !!updated.is_default });
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const catId = Number(req.params.id);
    const category = await db('categories').where({ id: catId }).first();
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (category.is_default) {
      res.status(403).json({ error: 'Cannot delete default categories' });
      return;
    }
    if (category.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Cannot delete this category' });
      return;
    }

    // Reassign items to "Other"
    const other = await db('categories').where({ name: 'Other', is_default: true }).first();
    if (other) {
      await db('items').where({ category_id: catId }).update({ category_id: other.id });
    }

    await db('categories').where({ id: catId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
