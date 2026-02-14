import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { assertListAccess, handleAccessError } from './helpers.js';

const router = Router();

async function enrichListItem(listItemId: number) {
  const li = await db('list_items')
    .join('items', 'list_items.item_id', 'items.id')
    .join('categories', 'items.category_id', 'categories.id')
    .where('list_items.id', listItemId)
    .select(
      'list_items.*',
      'items.name as item_name',
      'items.category_id',
      'items.created_by',
      'categories.name as category_name',
      'categories.color as category_color',
      'categories.is_default as category_is_default'
    )
    .first();

  if (!li) return null;

  return {
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
  };
}

router.post('/:listId/items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    await assertListAccess(req.user!.id, listId, true);

    const { name, category_id, quantity, notes } = req.body;
    if (!name || !category_id) {
      res.status(400).json({ error: 'Name and category_id are required' });
      return;
    }

    // Find or create item in library
    let item = await db('items')
      .where({ name: name.trim(), created_by: req.user!.id })
      .first();

    if (!item) {
      const [itemId] = await db('items').insert({
        name: name.trim(),
        category_id,
        created_by: req.user!.id,
      });
      item = { id: itemId, name: name.trim(), category_id, created_by: req.user!.id };
    }

    // Check if this item already exists on the list
    const existing = await db('list_items')
      .where({ list_id: listId, item_id: item.id })
      .first();

    if (existing) {
      if (existing.is_checked) {
        // Re-activate: uncheck and update quantity/notes
        await db('list_items').where({ id: existing.id }).update({
          is_checked: false,
          checked_at: null,
          quantity: quantity || '1',
          notes: notes || '',
        });
        const enriched = await enrichListItem(existing.id);
        const io = req.app.get('io');
        if (io) {
          io.to(`list:${listId}`).emit('list:item-updated', { listId, listItem: enriched! });
        }
        res.json(enriched);
        return;
      } else {
        res.status(409).json({ error: 'Item already on this list' });
        return;
      }
    }

    // Get max sort_order
    const maxOrder = await db('list_items')
      .where({ list_id: listId, is_checked: false })
      .max('sort_order as max')
      .first();
    const sort_order = (maxOrder?.max ?? 0) + 1;

    const [listItemId] = await db('list_items').insert({
      list_id: listId,
      item_id: item.id,
      quantity: quantity || '1',
      notes: notes || '',
      sort_order,
    });

    const enriched = await enrichListItem(listItemId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`list:${listId}`).emit('list:item-added', { listId, listItem: enriched });
    }

    res.status(201).json(enriched);
  } catch (err) {
    if (handleAccessError(err, res)) return;
    console.error('Add item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:listId/items/:listItemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const listItemId = Number(req.params.listItemId);
    await assertListAccess(req.user!.id, listId, true);

    const existing = await db('list_items').where({ id: listItemId, list_id: listId }).first();
    if (!existing) {
      res.status(404).json({ error: 'List item not found' });
      return;
    }

    const updates: Record<string, any> = {};
    if (req.body.quantity !== undefined) updates.quantity = req.body.quantity;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.is_checked !== undefined) {
      updates.is_checked = req.body.is_checked;
      updates.checked_at = req.body.is_checked ? new Date().toISOString() : null;
    }

    const categoryUpdate = req.body.category_id !== undefined ? req.body.category_id : undefined;

    if (Object.keys(updates).length === 0 && categoryUpdate === undefined) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    if (Object.keys(updates).length > 0) {
      await db('list_items').where({ id: listItemId }).update(updates);
    }

    // Update category on the underlying item record
    if (categoryUpdate !== undefined) {
      await db('items').where({ id: existing.item_id }).update({ category_id: categoryUpdate });
    }

    const isCheckOnly = updates.is_checked !== undefined && categoryUpdate === undefined
      && Object.keys(updates).every((k) => k === 'is_checked' || k === 'checked_at');

    const io = req.app.get('io');
    if (io && isCheckOnly) {
      io.to(`list:${listId}`).emit('list:item-checked', {
        listId,
        listItemId,
        is_checked: updates.is_checked,
        checked_at: updates.checked_at,
      });
    } else if (io) {
      const enriched = await enrichListItem(listItemId);
      io.to(`list:${listId}`).emit('list:item-updated', { listId, listItem: enriched! });
    }

    const enriched = await enrichListItem(listItemId);
    res.json(enriched);
  } catch (err) {
    if (handleAccessError(err, res)) return;
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:listId/items/:listItemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const listItemId = Number(req.params.listItemId);
    await assertListAccess(req.user!.id, listId, true);

    const existing = await db('list_items').where({ id: listItemId, list_id: listId }).first();
    if (!existing) {
      res.status(404).json({ error: 'List item not found' });
      return;
    }

    await db('list_items').where({ id: listItemId }).del();

    const io = req.app.get('io');
    if (io) {
      io.to(`list:${listId}`).emit('list:item-removed', { listId, listItemId });
    }

    res.json({ success: true });
  } catch (err) {
    if (handleAccessError(err, res)) return;
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
