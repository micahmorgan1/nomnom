import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import type { ListShare } from '@nomnom/shared';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  listId: number;
}

export default function ShareModal({ open, onClose, listId }: ShareModalProps) {
  const [shares, setShares] = useState<ListShare[]>([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      api.get<ListShare[]>(`/lists/${listId}/shares`).then(setShares).catch(() => {});
      setUsername('');
      setError('');
    }
  }, [open, listId]);

  async function handleShare(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setError('');
    setLoading(true);
    try {
      const share = await api.post<ListShare>(`/lists/${listId}/shares`, {
        username: username.trim(),
        permission: 'edit',
      });
      setShares((prev) => [...prev, share]);
      setUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(userId: number) {
    await api.delete(`/lists/${listId}/shares/${userId}`);
    setShares((prev) => prev.filter((s) => s.user_id !== userId));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold">Share List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleShare} className="flex gap-2">
            <input
              type="text"
              placeholder="Username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Share
            </button>
          </form>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {shares.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Shared with</h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.user_id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium">{share.username}</span>
                    <button
                      onClick={() => handleRevoke(share.user_id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
