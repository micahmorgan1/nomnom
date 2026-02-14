import db from '../db.js';

export async function assertListAccess(
  userId: number,
  listId: number,
  requireEdit: boolean = false
) {
  const list = await db('lists').where({ id: listId }).first();
  if (!list) {
    throw { status: 404, message: 'List not found' };
  }

  if (list.owner_id === userId) return list;

  const share = await db('list_shares').where({ list_id: listId, user_id: userId }).first();
  if (!share) {
    throw { status: 403, message: 'Access denied' };
  }
  if (requireEdit && share.permission !== 'edit') {
    throw { status: 403, message: 'Edit permission required' };
  }

  return list;
}

export function handleAccessError(err: unknown, res: any) {
  if (err && typeof err === 'object' && 'status' in err) {
    const e = err as { status: number; message: string };
    res.status(e.status).json({ error: e.message });
    return true;
  }
  return false;
}
