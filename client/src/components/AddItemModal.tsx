import { useState, useEffect, FormEvent } from 'react';
import { useItemLibrary } from '@/hooks/useItemLibrary';
import CategoryPicker from './CategoryPicker';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; category_id: number; quantity?: string; notes?: string }) => Promise<unknown>;
}

export default function AddItemModal({ open, onClose, onAdd }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { results, search, loadAll } = useItemLibrary();

  useEffect(() => {
    if (open) {
      setName('');
      setCategoryId(null);
      setQuantity('1');
      setNotes('');
      loadAll();
    }
  }, [open, loadAll]);

  useEffect(() => {
    search(name);
  }, [name, search]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    setSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        category_id: categoryId,
        quantity: quantity || '1',
        notes: notes || '',
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectLibraryItem(item: typeof results[0]) {
    setName(item.name);
    setCategoryId(item.category_id);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold">Add Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Search / Name input */}
          <input
            type="text"
            placeholder="Item name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />

          {/* Library suggestions */}
          {name.trim() && results.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {results.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectLibraryItem(item)}
                  className="pill"
                  style={{
                    backgroundColor: item.category.color + '25',
                    color: item.category.color,
                  }}
                >
                  {item.name}
                </button>
              ))}
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
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !categoryId || submitting}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
