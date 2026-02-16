import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PRESET_COLORS } from '@nomnom/shared';
import type { Category } from '@nomnom/shared';

export default function SettingsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState<string>(PRESET_COLORS[0]);
  const [showNewCat, setShowNewCat] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  async function createCategory() {
    if (!newCatName.trim()) return;
    try {
      const cat = await api.post<Category>('/categories', {
        name: newCatName.trim(),
        color: newCatColor,
      });
      setCategories((prev) => [...prev, cat]);
      setNewCatName('');
      setShowNewCat(false);
    } catch {
      // handled
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm('Delete this category? Items will be moved to "Other".')) return;
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Settings</h2>

      {/* Account */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">
            Logged in as <span className="font-medium text-gray-800">{user?.username}</span>
          </p>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Categories</h3>
          <button
            onClick={() => setShowNewCat(!showNewCat)}
            className="text-xs text-accent-500 font-medium"
          >
            {showNewCat ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {showNewCat && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 space-y-3">
            <input
              type="text"
              placeholder="Category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewCatColor(color)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    newCatColor === color ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={createCategory}
              disabled={!newCatName.trim()}
              className="w-full py-2 bg-accent-500 text-white text-sm font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50"
            >
              Create Category
            </button>
          </div>
        )}

        <div className="space-y-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
              </div>
              {!cat.is_default && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-xs text-gray-300 hover:text-danger-400"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
