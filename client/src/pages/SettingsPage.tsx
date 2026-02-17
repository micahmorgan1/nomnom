import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PRESET_COLORS } from '@nomnom/shared';
import type { Category } from '@nomnom/shared';
import PasswordInput from '@/components/PasswordInput';

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState<string>(PRESET_COLORS[0]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingColorId, setEditingColorId] = useState<number | null>(null);
  const [stagedColor, setStagedColor] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');

  function startEditing(cat: Category) {
    if (editingColorId === cat.id) {
      setEditingColorId(null);
      setStagedColor(null);
    } else {
      setEditingColorId(cat.id);
      setStagedColor(cat.color);
    }
  }

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
      showToast('Category created');
    } catch {
      // handled
    }
  }

  async function updateColor(id: number, color: string) {
    try {
      const updated = await api.put<Category>(`/categories/${id}`, { color });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingColorId(null);
    } catch {
      // handled
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm('Delete this category? Items will be moved to "Other".')) return;
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function changePassword() {
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Account */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <p className="text-sm text-gray-600">
            Logged in as <span className="font-medium text-gray-800">{user?.username}</span>
          </p>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="text-sm text-accent-500 font-medium"
          >
            {showChangePassword ? 'Cancel' : 'Change Password'}
          </button>

          {showChangePassword && (
            <div className="space-y-3 pt-1">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                autoComplete="current-password"
              />
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="New password"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                autoComplete="new-password"
              />
              {pwError && <p className="text-xs text-danger-400">{pwError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={changePassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-accent-500 text-white text-sm font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwError('');
                  }}
                  className="px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Admin */}
      {user?.username === 'micah' && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Admin</h3>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Link to="/admin" className="text-sm text-accent-500 font-medium hover:underline">
              Manage Users
            </Link>
          </div>
        </section>
      )}

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
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEditing(cat)}
                    className="w-6 h-6 rounded-full ring-1 ring-gray-200 transition-transform hover:scale-110"
                    style={{ backgroundColor: editingColorId === cat.id && stagedColor ? stagedColor : cat.color }}
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
              {editingColorId === cat.id && (
                <div className="px-4 pb-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setStagedColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          stagedColor === color ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <label className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden">
                      <input
                        type="color"
                        value={stagedColor || cat.color}
                        onChange={(e) => setStagedColor(e.target.value)}
                        className="absolute w-0 h-0 opacity-0"
                      />
                      <span className="text-gray-400 text-xs">+</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => stagedColor && updateColor(cat.id, stagedColor)}
                      disabled={!stagedColor || stagedColor === cat.color}
                      className="px-3 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingColorId(null); setStagedColor(null); }}
                      className="px-3 py-1.5 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
