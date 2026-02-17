import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { validatePassword } from '@nomnom/shared';
import PasswordInput from '@/components/PasswordInput';

interface User {
  id: number;
  username: string;
  created_at: string;
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<User[]>('/admin/users').then(setUsers).catch(() => {});
  }, []);

  async function handleDelete(id: number, username: string) {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast(`Deleted ${username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleResetPassword(id: number) {
    setError('');
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError('Password requires: ' + validation.errors.join(', '));
      return;
    }
    try {
      await api.post(`/admin/users/${id}/reset-password`, { password: newPassword });
      setResetId(null);
      setNewPassword('');
      showToast('Password reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    }
  }

  if (currentUser?.username !== 'micah') {
    return <div className="p-4 text-gray-500">Access denied</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Manage Users</h2>

      {error && (
        <div className="bg-danger-50 text-danger-500 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">{u.username}</span>
                <span className="text-xs text-gray-400 ml-2">
                  since {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setResetId(resetId === u.id ? null : u.id);
                    setNewPassword('');
                    setError('');
                  }}
                  className="text-xs text-accent-500 font-medium"
                >
                  {resetId === u.id ? 'Cancel' : 'Reset Password'}
                </button>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="text-xs text-danger-400 font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {resetId === u.id && (
              <div className="px-4 pb-3 space-y-2">
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="New password"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResetPassword(u.id)}
                    disabled={!newPassword}
                    className="px-3 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setResetId(null); setNewPassword(''); setError(''); }}
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
    </div>
  );
}
