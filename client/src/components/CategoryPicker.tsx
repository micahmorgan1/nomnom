import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getTextColor } from '@/lib/colorUtils';
import { PRESET_COLORS } from '@nomnom/shared';
import type { Category } from '@nomnom/shared';

interface CategoryPickerProps {
  selected: number | null;
  onSelect: (id: number) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const cat = await api.post<Category>('/categories', {
        name: newName.trim(),
        color: newColor,
      });
      setCategories((prev) => [...prev, cat]);
      onSelect(cat.id);
      setCreating(false);
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              selected === cat.id
                ? 'border-gray-800 ring-1 ring-gray-800'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              backgroundColor: selected === cat.id ? cat.color + '25' : undefined,
              color: selected === cat.id ? getTextColor(cat.color) : '#6b7280',
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
          </button>
        ))}
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all"
          >
            + New
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-3 p-3 border border-gray-200 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="New category..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
            autoFocus
            autoComplete="one-time-code"
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${
                  newColor === c ? 'ring-2 ring-offset-1 ring-gray-800 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || submitting}
              className="px-3 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName('');
                setNewColor(PRESET_COLORS[0]);
              }}
              className="px-3 py-1.5 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
