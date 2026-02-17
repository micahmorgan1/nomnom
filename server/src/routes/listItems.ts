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

    if (typeof name === 'string' && name.length > 200) {
      res.status(400).json({ error: 'Name must be 200 characters or less' });
      return;
    }
    if (notes && typeof notes === 'string' && notes.length > 500) {
      res.status(400).json({ error: 'Notes must be 500 characters or less' });
      return;
    }
    if (quantity && typeof quantity === 'string' && quantity.length > 50) {
      res.status(400).json({ error: 'Quantity must be 50 characters or less' });
      return;
    }

    // Find or create item in library (normalize to lowercase)
    const normalizedName = name.trim().toLowerCase();
    let item = await db('items')
      .whereRaw('lower(name) = ?', [normalizedName])
      .where({ created_by: req.user!.id })
      .first();

    if (!item) {
      const [itemId] = await db('items').insert({
        name: normalizedName,
        category_id,
        created_by: req.user!.id,
      });
      item = { id: itemId, name: normalizedName, category_id, created_by: req.user!.id };
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

router.post('/:listId/items/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    await assertListAccess(req.user!.id, listId, true);

    const { items } = req.body as { items: { item_id: number }[] };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required' });
      return;
    }

    const userId = req.user!.id;
    const added: number[] = [];

    await db.transaction(async (trx) => {
      // Get max sort_order once
      const maxOrder = await trx('list_items')
        .where({ list_id: listId, is_checked: false })
        .max('sort_order as max')
        .first();
      let sortOrder = (maxOrder?.max ?? 0) + 1;

      for (const { item_id } of items) {
        // Look up the item
        let item = await trx('items').where({ id: item_id }).first();
        if (!item) continue;

        // If system item (created_by = null), clone to user's library
        if (item.created_by === null) {
          // Check if user already has an item with this name (case-insensitive)
          const existing = await trx('items')
            .whereRaw('lower(name) = ?', [item.name.toLowerCase()])
            .where({ created_by: userId })
            .first();
          if (existing) {
            item = existing;
          } else {
            const lowName = item.name.toLowerCase();
            const [newId] = await trx('items').insert({
              name: lowName,
              category_id: item.category_id,
              created_by: userId,
            });
            item = { id: newId, name: lowName, category_id: item.category_id, created_by: userId };
          }
        }

        // Check if already on list
        const onList = await trx('list_items')
          .where({ list_id: listId, item_id: item.id })
          .first();

        if (onList) {
          if (onList.is_checked) {
            // Re-activate
            await trx('list_items').where({ id: onList.id }).update({
              is_checked: false,
              checked_at: null,
              quantity: '1',
              notes: '',
            });
            added.push(onList.id);
          }
          // If active, skip silently
          continue;
        }

        const [listItemId] = await trx('list_items').insert({
          list_id: listId,
          item_id: item.id,
          quantity: '1',
          notes: '',
          sort_order: sortOrder++,
        });
        added.push(listItemId);
      }
    });

    // Enrich all added/reactivated items
    const enriched = (
      await Promise.all(added.map((id) => enrichListItem(id)))
    ).filter(Boolean);

    // Emit socket event
    const io = req.app.get('io');
    if (io && enriched.length > 0) {
      io.to(`list:${listId}`).emit('list:items-added', { listId, listItems: enriched });
    }

    res.status(201).json(enriched);
  } catch (err) {
    if (handleAccessError(err, res)) return;
    console.error('Batch add error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:listId/menus/:menuId/add — add all items from a menu to this list
router.post('/:listId/menus/:menuId/add', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listId = Number(req.params.listId);
    const menuId = Number(req.params.menuId);
    await assertListAccess(req.user!.id, listId, true);

    const userId = req.user!.id;

    // Verify menu exists and belongs to user
    const menu = await db('menus').where({ id: menuId, created_by: userId }).first();
    if (!menu) {
      res.status(404).json({ error: 'Menu not found' });
      return;
    }

    const { exclude_item_ids = [] } = req.body || {};

    // Get menu items
    const menuItems = await db('menu_items')
      .join('items', 'menu_items.item_id', 'items.id')
      .where('menu_items.menu_id', menuId)
      .select('items.*');

    const excludeSet = new Set(exclude_item_ids);
    const itemsToAdd = menuItems.filter((i: any) => !excludeSet.has(i.id));

    const added: number[] = [];

    await db.transaction(async (trx) => {
      let maxOrder = await trx('list_items')
        .where({ list_id: listId, is_checked: false })
        .max('sort_order as max')
        .first();
      let sortOrder = (maxOrder?.max ?? 0) + 1;

      for (let item of itemsToAdd) {
        // If system item (created_by = null), clone to user's library
        if (item.created_by === null) {
          const existing = await trx('items')
            .whereRaw('lower(name) = ?', [item.name.toLowerCase()])
            .where({ created_by: userId })
            .first();
          if (existing) {
            item = existing;
          } else {
            const lowName = item.name.toLowerCase();
            const [newId] = await trx('items').insert({
              name: lowName,
              category_id: item.category_id,
              created_by: userId,
            });
            item = { id: newId, name: lowName, category_id: item.category_id, created_by: userId };
          }
        }

        // Check if already on list
        const onList = await trx('list_items')
          .where({ list_id: listId, item_id: item.id })
          .first();

        if (onList) {
          if (onList.is_checked) {
            // Re-activate with menu name as notes
            await trx('list_items').where({ id: onList.id }).update({
              is_checked: false,
              checked_at: null,
              quantity: '1',
              notes: menu.name,
            });
            added.push(onList.id);
          } else {
            // Active — append menu name to existing notes
            let newNotes = onList.notes
              ? `${onList.notes}, ${menu.name}`
              : menu.name;
            if (newNotes.length > 500) {
              newNotes = newNotes.slice(0, 500);
            }
            await trx('list_items').where({ id: onList.id }).update({
              notes: newNotes,
            });
            added.push(onList.id);
          }
          continue;
        }

        const [listItemId] = await trx('list_items').insert({
          list_id: listId,
          item_id: item.id,
          quantity: '1',
          notes: menu.name,
          sort_order: sortOrder++,
        });
        added.push(listItemId);
      }
    });

    // Enrich all added/updated items
    const enriched = (
      await Promise.all(added.map((id) => enrichListItem(id)))
    ).filter(Boolean);

    // Emit socket event
    const io = req.app.get('io');
    if (io && enriched.length > 0) {
      io.to(`list:${listId}`).emit('list:items-added', { listId, listItems: enriched });
    }

    res.status(201).json(enriched);
  } catch (err) {
    if (handleAccessError(err, res)) return;
    console.error('Add menu to list error:', err);
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

    if (req.body.notes && typeof req.body.notes === 'string' && req.body.notes.length > 500) {
      res.status(400).json({ error: 'Notes must be 500 characters or less' });
      return;
    }
    if (req.body.quantity && typeof req.body.quantity === 'string' && req.body.quantity.length > 50) {
      res.status(400).json({ error: 'Quantity must be 50 characters or less' });
      return;
    }

    const updates: Record<string, any> = {};
    if (req.body.quantity !== undefined) updates.quantity = req.body.quantity;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.is_checked !== undefined) {
      updates.is_checked = req.body.is_checked;
      updates.checked_at = req.body.is_checked ? new Date().toISOString() : null;
      // Reset quantity and notes when checking off an item
      if (req.body.is_checked) {
        updates.quantity = '1';
        updates.notes = '';
      }
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
