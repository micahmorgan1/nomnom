import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useList } from '@/hooks/useList';
import Pill from '@/components/Pill';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import ShareModal from '@/components/ShareModal';
import type { ListItemWithDetails } from '@nomnom/shared';

function sortItemsByCategory(items: ListItemWithDetails[]): ListItemWithDetails[] {
  return [...items].sort((a, b) => {
    // Group by category name first
    const catCmp = a.category.name.localeCompare(b.category.name);
    if (catCmp !== 0) return catCmp;
    // Alphabetical within category
    return a.item.name.localeCompare(b.item.name);
  });
}

export default function ListView() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const navigate = useNavigate();
  const { list, loading, error, addItem, checkItem, updateItem, removeItem, clearChecked } = useList(listId);
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItemWithDetails | null>(null);

  const { activeItems, inactiveItems, hasInactive } = useMemo(() => {
    if (!list) return { activeItems: [], inactiveItems: [], hasInactive: false };

    const active = list.items.filter((i) => !i.is_checked);
    const inactive = list.items.filter((i) => i.is_checked);

    return {
      activeItems: sortItemsByCategory(active),
      inactiveItems: sortItemsByCategory(inactive),
      hasInactive: inactive.length > 0,
    };
  }, [list]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error || 'List not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-800 flex-1">{list.name}</h2>
        {list.is_owner && (
          <button
            onClick={() => setShowShare(true)}
            className="text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        )}
      </div>

      {/* Pills flow as one continuous paragraph */}
      {activeItems.length === 0 && !hasInactive ? (
        <div className="text-center text-gray-400 mt-16">
          <p className="text-lg mb-2">List is empty</p>
          <p className="text-sm">Tap + to add items</p>
        </div>
      ) : (
        <>
          {/* Active items */}
          <div className="flex flex-wrap gap-2">
            {activeItems.map((item) => (
              <Pill
                key={item.id}
                item={item}
                variant="active"
                onCheck={() => checkItem(item.id, !item.is_checked)}
                onRemove={() => removeItem(item.id)}
                onEdit={() => setEditingItem(item)}
              />
            ))}
          </div>

          {/* Inactive section */}
          {hasInactive && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inactive</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="flex flex-wrap gap-2">
                {inactiveItems.map((item) => (
                  <Pill
                    key={item.id}
                    item={item}
                    variant="inactive"
                    onCheck={() => checkItem(item.id, !item.is_checked)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>

              <button
                onClick={clearChecked}
                className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Clear all inactive
              </button>
            </>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-emerald-700 active:scale-95 transition-all"
      >
        +
      </button>

      <AddItemModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addItem}
      />

      <EditItemModal
        open={editingItem !== null}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={updateItem}
      />

      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        listId={listId}
      />
    </div>
  );
}
