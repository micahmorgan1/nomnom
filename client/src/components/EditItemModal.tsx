import { useState, useEffect, FormEvent } from 'react';
import type { ListItemWithDetails } from '@nomnom/shared';
import CategoryPicker from './CategoryPicker';

interface EditItemModalProps {
  open: boolean;
  item: ListItemWithDetails | null;
  onClose: () => void;
  onSave: (listItemId: number, updates: { quantity?: string; notes?: string; category_id?: number }) => Promise<unknown>;
  onRename?: (itemId: number, name: string) => Promise<unknown>;
  onDeletePermanently?: (itemId: number) => Promise<unknown>;
}

export default function EditItemModal({ open, item, onClose, onSave, onRename, onDeletePermanently }: EditItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open && item) {
      setName(item.item.name);
      setQuantity(item.quantity || '1');
      setNotes(item.notes || '');
      setCategoryId(item.category.id);
      setConfirmDelete(false);
    }
  }, [open, item]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!item || !categoryId) return;

    setSubmitting(true);
    try {
      // Handle name change
      const trimmedName = name.trim();
      if (trimmedName && trimmedName !== item.item.name && onRename) {
        await onRename(item.item_id, trimmedName);
      }

      const updates: { quantity?: string; notes?: string; category_id?: number } = {};
      if (quantity !== item.quantity) updates.quantity = quantity || '1';
      if (notes !== (item.notes || '')) updates.notes = notes;
      if (categoryId !== item.category.id) updates.category_id = categoryId;

      if (Object.keys(updates).length > 0) {
        await onSave(item.id, updates);
      }
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!item || !onDeletePermanently) return;
    setSubmitting(true);
    try {
      await onDeletePermanently(item.item_id);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !item) return null;

  const isUserItem = item.item.created_by !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold">Edit Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name field */}
          {isUserItem && onRename && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Label</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                autoComplete="one-time-code"
              />
            </div>
          )}

          {/* Category picker */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
            <CategoryPicker selected={categoryId} onSelect={setCategoryId} />
          </div>

          {/* Quantity & Notes */}
          <div className="flex gap-3">
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-600 mb-1">Qty</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                autoComplete="one-time-code"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!categoryId || submitting}
            className="w-full py-3 bg-accent-500 text-white font-semibold rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>

          {/* Delete permanently */}
          {isUserItem && onDeletePermanently && (
            <div className="pt-2 border-t border-gray-100">
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-danger-400 text-white text-sm font-semibold rounded-lg hover:bg-danger-500 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 text-danger-400 text-sm font-medium hover:bg-danger-50 rounded-lg transition-colors"
                >
                  Delete from library
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
