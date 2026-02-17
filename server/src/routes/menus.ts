import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/menus — list user's menus with item counts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const menus = await db('menus')
      .where({ created_by: req.user!.id })
      .select('menus.*')
      .orderBy('menus.name');

    const menuIds = menus.map((m: any) => m.id);

    // Get item counts
    const counts = menuIds.length > 0
      ? await db('menu_items')
          .whereIn('menu_id', menuIds)
          .groupBy('menu_id')
          .select('menu_id')
          .count('* as item_count')
      : [];

    const countMap = new Map<number, number>();
    for (const c of counts as any[]) {
      countMap.set(c.menu_id, Number(c.item_count));
    }

    const result = menus.map((m: any) => ({
      ...m,
      item_count: countMap.get(m.id) || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('List menus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/menus — create menu with items
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, item_ids } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    if (name.length > 200) {
      res.status(400).json({ error: 'Name must be 200 characters or less' });
      return;
    }
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      res.status(400).json({ error: 'At least one item is required' });
      return;
    }

    const menuId = await db.transaction(async (trx) => {
      const [id] = await trx('menus').insert({
        name: name.trim(),
        created_by: req.user!.id,
      });

      const toInsert = item_ids.map((item_id: number) => ({
        menu_id: id,
        item_id,
      }));
      await trx('menu_items').insert(toInsert);

      return id;
    });

    const menu = await db('menus').where({ id: menuId }).first();
    res.status(201).json({ ...menu, item_count: item_ids.length });
  } catch (err) {
    console.error('Create menu error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/menus/:id — get menu with full item+category details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const menu = await db('menus').where({ id: menuId, created_by: req.user!.id }).first();

    if (!menu) {
      res.status(404).json({ error: 'Menu not found' });
      return;
    }

    const items = await db('menu_items')
      .join('items', 'menu_items.item_id', 'items.id')
      .join('categories', 'items.category_id', 'categories.id')
      .where('menu_items.menu_id', menuId)
      .select(
        'menu_items.id',
        'menu_items.menu_id',
        'menu_items.item_id',
        'items.name as item_name',
        'items.category_id',
        'items.created_by as item_created_by',
        'categories.name as category_name',
        'categories.color as category_color',
        'categories.is_default as category_is_default'
      );

    const enrichedItems = items.map((row: any) => ({
      id: row.id,
      menu_id: row.menu_id,
      item_id: row.item_id,
      item: {
        id: row.item_id,
        name: row.item_name,
        category_id: row.category_id,
        created_by: row.item_created_by,
      },
      category: {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        is_default: !!row.category_is_default,
        user_id: null,
      },
    }));

    res.json({ ...menu, items: enrichedItems });
  } catch (err) {
    console.error('Get menu error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/menus/:id — update menu name and/or replace items
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const menu = await db('menus').where({ id: menuId, created_by: req.user!.id }).first();

    if (!menu) {
      res.status(404).json({ error: 'Menu not found' });
      return;
    }

    const { name, item_ids } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Name cannot be empty' });
        return;
      }
      if (name.length > 200) {
        res.status(400).json({ error: 'Name must be 200 characters or less' });
        return;
      }
    }

    if (item_ids !== undefined && (!Array.isArray(item_ids) || item_ids.length === 0)) {
      res.status(400).json({ error: 'At least one item is required' });
      return;
    }

    await db.transaction(async (trx) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name.trim();
      await trx('menus').where({ id: menuId }).update(updates);

      if (item_ids !== undefined) {
        await trx('menu_items').where({ menu_id: menuId }).del();
        const toInsert = item_ids.map((item_id: number) => ({
          menu_id: menuId,
          item_id,
        }));
        await trx('menu_items').insert(toInsert);
      }
    });

    const updated = await db('menus').where({ id: menuId }).first();
    const count = await db('menu_items').where({ menu_id: menuId }).count('* as item_count').first();
    res.json({ ...updated, item_count: Number(count?.item_count || 0) });
  } catch (err) {
    console.error('Update menu error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/menus/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const menu = await db('menus').where({ id: menuId, created_by: req.user!.id }).first();

    if (!menu) {
      res.status(404).json({ error: 'Menu not found' });
      return;
    }

    await db('menus').where({ id: menuId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete menu error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
