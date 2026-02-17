import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { useItemLibrary } from '@/hooks/useItemLibrary';
import { hexToRgb, getColoredPillText } from '@/lib/colorUtils';
import type { MenuWithItems } from '@nomnom/shared';

interface GroupedCategory {
  name: string;
  color: string;
  items: { id: number; name: string }[];
}

interface CreateMenuModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, itemIds: number[]) => Promise<unknown>;
  editingMenu?: MenuWithItems | null;
}

export default function CreateMenuModal({ open, onClose, onSave, editingMenu }: CreateMenuModalProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { results, loading, loadAll } = useItemLibrary();

  useEffect(() => {
    if (open) {
      loadAll();
      setSearch('');
      setError('');
      if (editingMenu) {
        setName(editingMenu.name);
        setSelected(new Set(editingMenu.items.map((i) => i.item_id)));
      } else {
        setName('');
        setSelected(new Set());
      }
    }
  }, [open, loadAll, editingMenu]);

  const grouped = useMemo(() => {
    const filtered = search.trim()
      ? results.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
      : results;

    const map = new Map<string, GroupedCategory>();
    for (const item of filtered) {
      const key = item.category.name;
      if (!map.has(key)) {
        map.set(key, { name: item.category.name, color: item.category.color, items: [] });
      }
      map.get(key)!.items.push({ id: item.id, name: item.name });
    }

    const groups = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    for (const g of groups) {
      g.items.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [results, search]);

  const toggleSelect = useCallback((itemId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || selected.size === 0) return;

    setSubmitting(true);
    setError('');
    try {
      await onSave(name.trim(), Array.from(selected));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold">{editingMenu ? 'Edit Menu' : 'Create Menu'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 pt-4 space-y-3">
            <input
              type="text"
              placeholder="Menu name (e.g. Spring Roll Stir Fry)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400"
              autoFocus
            />

            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading items...</div>
            ) : grouped.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {results.length === 0 ? 'No items in your library yet' : 'No items match your search'}
              </div>
            ) : (
              <div className="py-3 space-y-3">
                {grouped.map((group) => (
                  <div key={group.name}>
                    <div className="text-sm font-semibold text-gray-700 mb-1.5">
                      {group.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => {
                        const isSelected = selected.has(item.id);
                        const rgb = hexToRgb(group.color);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleSelect(item.id)}
                            className={`pill relative transition-all ${
                              isSelected ? 'ring-2 ring-accent-400 scale-105' : ''
                            }`}
                            style={{
                              backgroundColor: '#ffffff',
                              border: `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
                              color: getColoredPillText(group.color, 0),
                              opacity: isSelected ? 1 : 0.7,
                            }}
                          >
                            {isSelected && (
                              <svg
                                className="w-3.5 h-3.5 mr-0.5 text-accent-500 inline-block"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-danger-400 text-center px-4">{error}</p>
          )}

          <div className="p-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!name.trim() || selected.size === 0 || submitting}
              className="w-full py-3 bg-accent-500 text-white font-semibold rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              {submitting
                ? 'Saving...'
                : editingMenu
                  ? `Save (${selected.size} item${selected.size !== 1 ? 's' : ''})`
                  : `Create Menu (${selected.size} item${selected.size !== 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
