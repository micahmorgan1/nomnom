import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Owned lists
    const owned = await db('lists')
      .where({ owner_id: userId })
      .select('lists.*')
      .then((rows) => rows.map((r) => ({ ...r, is_owner: true })));

    // Shared lists
    const shared = await db('lists')
      .join('list_shares', 'lists.id', 'list_shares.list_id')
      .join('users', 'lists.owner_id', 'users.id')
      .where('list_shares.user_id', userId)
      .select('lists.*', 'users.username as owner_username')
      .then((rows) => rows.map((r) => ({ ...r, is_owner: false })));

    const allLists = [...owned, ...shared];

    // Get item counts for all lists
    const listIds = allLists.map((l) => l.id);
    if (listIds.length > 0) {
      const counts = await db('list_items')
        .whereIn('list_id', listIds)
        .groupBy('list_id')
        .select(
          'list_id',
          db.raw('count(*) as total_count'),
          db.raw('sum(case when is_checked = 0 then 1 else 0 end) as unchecked_count')
        );

      const countMap = new Map(counts.map((c) => [c.list_id, c]));
      for (const list of allLists) {
        const c = countMap.get(list.id);
        list.total_count = c ? Number(c.total_count) : 0;
        list.unchecked_count = c ? Number(c.unchecked_count) : 0;
      }
    }

    res.json(allLists);
  } catch (err) {
    console.error('List fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const [id] = await db('lists').insert({
      name: name.trim(),
      owner_id: req.user!.id,
    });

    const list = await db('lists').where({ id }).first();
    res.status(201).json({ ...list, is_owner: true, total_count: 0, unchecked_count: 0 });
  } catch (err) {
    console.error('List create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.id);
    const userId = req.user!.id;

    const list = await db('lists').where({ id: listId }).first();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    // Check access
    const isOwner = list.owner_id === userId;
    if (!isOwner) {
      const share = await db('list_shares').where({ list_id: listId, user_id: userId }).first();
      if (!share) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Get list items with item and category details
    const listItems = await db('list_items')
      .join('items', 'list_items.item_id', 'items.id')
      .join('categories', 'items.category_id', 'categories.id')
      .where('list_items.list_id', listId)
      .select(
        'list_items.*',
        'items.name as item_name',
        'items.category_id',
        'items.created_by',
        'categories.name as category_name',
        'categories.color as category_color',
        'categories.is_default as category_is_default'
      )
      .orderBy([
        { column: 'list_items.is_checked', order: 'asc' },
        { column: 'list_items.sort_order', order: 'asc' },
        { column: 'list_items.added_at', order: 'asc' },
      ]);

    const enrichedItems = listItems.map((li) => ({
      id: li.id,
      list_id: li.list_id,
      item_id: li.item_id,
      quantity: li.quantity,
      notes: li.notes,
      is_checked: !!li.is_checked,
      sort_order: li.sort_order,
      added_at: li.added_at,
      checked_at: li.checked_at,
      item: {
        id: li.item_id,
        name: li.item_name,
        category_id: li.category_id,
        created_by: li.created_by,
      },
      category: {
        id: li.category_id,
        name: li.category_name,
        color: li.category_color,
        is_default: !!li.category_is_default,
        user_id: null,
      },
    }));

    res.json({ ...list, is_owner: isOwner, items: enrichedItems });
  } catch (err) {
    console.error('List detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.id);
    const list = await db('lists').where({ id: listId }).first();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    if (list.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the owner can rename a list' });
      return;
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    await db('lists').where({ id: listId }).update({ name: name.trim(), updated_at: new Date().toISOString() });
    const updated = await db('lists').where({ id: listId }).first();
    res.json(updated);
  } catch (err) {
    console.error('List update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.id);
    const list = await db('lists').where({ id: listId }).first();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    if (list.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the owner can delete a list' });
      return;
    }

    await db('lists').where({ id: listId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('List delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
