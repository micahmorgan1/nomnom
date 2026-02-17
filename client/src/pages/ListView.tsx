import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useList } from '@/hooks/useList';
import { useToast } from '@/context/ToastContext';
import Pill from '@/components/Pill';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import ShareModal from '@/components/ShareModal';
import PantryDrawer from '@/components/PantryDrawer';
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
  const { list, loading, error, addItem, addItemsFromLibrary, checkItem, updateItem, removeItem, clearChecked } = useList(listId);
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPantry, setShowPantry] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItemWithDetails | null>(null);

  const handleAddItem = useCallback(async (data: Parameters<typeof addItem>[0]) => {
    const item = await addItem(data);
    showToast(`Added ${data.name}`);
    return item;
  }, [addItem, showToast]);

  const handleRemoveItem = useCallback(async (listItemId: number) => {
    await removeItem(listItemId);
    showToast('Item removed');
  }, [removeItem, showToast]);

  const { activeItems, inactiveItems, hasInactive, currentItemIds } = useMemo(() => {
    if (!list) return { activeItems: [], inactiveItems: [], hasInactive: false, currentItemIds: new Set<number>() };

    const active = list.items.filter((i) => !i.is_checked);
    const inactive = list.items.filter((i) => i.is_checked);

    return {
      activeItems: sortItemsByCategory(active),
      inactiveItems: sortItemsByCategory(inactive),
      hasInactive: inactive.length > 0,
      currentItemIds: new Set(list.items.map((i) => i.item_id)),
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
        <div className="text-danger-400">{error || 'List not found'}</div>
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
            className="flex items-center gap-1 text-gray-400 hover:text-accent-500 transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0016.5 8.25H15M12 2.25v12m0-12l3 3m-3-3l-3 3" />
            </svg>
            <span className="text-sm font-medium">Share</span>
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
                onRemove={() => handleRemoveItem(item.id)}
                onEdit={() => setEditingItem(item)}
              />
            ))}
          </div>

          {/* Inactive section */}
          {hasInactive && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-800 uppercase tracking-wider">Inactive</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="flex flex-wrap gap-2">
                {inactiveItems.map((item) => (
                  <Pill
                    key={item.id}
                    item={item}
                    variant="inactive"
                    onCheck={() => checkItem(item.id, !item.is_checked)}
                    onRemove={() => handleRemoveItem(item.id)}
                  />
                ))}
              </div>

              <button
                onClick={clearChecked}
                className="mt-2 text-xs text-danger-400 hover:text-danger-500 transition-colors"
              >
                Clear all inactive
              </button>
            </>
          )}
        </>
      )}

      {/* Bottom action buttons */}
      <div className="fixed bottom-20 right-4 flex items-center gap-3">
        <button
          onClick={() => setShowPantry(true)}
          className="h-14 px-5 bg-white text-gray-600 rounded-full shadow-lg flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all border border-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-sm font-medium">Pantry</span>
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="w-14 h-14 bg-accent-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-accent-600 active:scale-95 transition-all"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <AddItemModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddItem}
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

      <PantryDrawer
        open={showPantry}
        onClose={() => setShowPantry(false)}
        onAdd={addItemsFromLibrary}
        currentItemIds={currentItemIds}
      />
    </div>
  );
}
