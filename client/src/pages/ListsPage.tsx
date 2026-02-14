import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLists } from '@/hooks/useLists';

export default function ListsPage() {
  const { lists, loading, createList, deleteList } = useLists();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const list = await createList(newName.trim());
      setNewName('');
      setShowCreate(false);
      navigate(`/lists/${list.id}`);
    } catch {
      // handled
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">My Lists</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-9 h-9 flex items-center justify-center bg-emerald-600 text-white rounded-full text-xl hover:bg-emerald-700 transition-colors"
        >
          +
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="List name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center text-gray-400 mt-16">
          <p className="text-lg mb-2">No lists yet</p>
          <p className="text-sm">Tap + to create your first list</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lists.map((list) => (
            <div
              key={list.id}
              onClick={() => navigate(`/lists/${list.id}`)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{list.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {list.unchecked_count || 0} item{list.unchecked_count !== 1 ? 's' : ''}
                    {list.total_count > 0 && list.total_count !== list.unchecked_count && (
                      <span> / {list.total_count} total</span>
                    )}
                    {!list.is_owner && list.owner_username && (
                      <span className="ml-2 text-emerald-500">Shared by {list.owner_username}</span>
                    )}
                  </p>
                </div>
                {list.is_owner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${list.name}"?`)) deleteList(list.id);
                    }}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
