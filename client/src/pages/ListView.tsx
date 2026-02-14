import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useList } from '@/hooks/useList';
import PillGroup from '@/components/PillGroup';
import CheckedSection from '@/components/CheckedSection';
import AddItemModal from '@/components/AddItemModal';
import ShareModal from '@/components/ShareModal';

export default function ListView() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const navigate = useNavigate();
  const { list, loading, error, addItem, checkItem, removeItem, clearChecked } = useList(listId);
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Group unchecked items by category
  const { groups, checkedItems } = useMemo(() => {
    if (!list) return { groups: [], checkedItems: [] };

    const unchecked = list.items.filter((i) => !i.is_checked);
    const checked = list.items.filter((i) => i.is_checked);

    const categoryMap = new Map<number, { name: string; color: string; items: typeof unchecked }>();
    for (const item of unchecked) {
      const catId = item.category.id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { name: item.category.name, color: item.category.color, items: [] });
      }
      categoryMap.get(catId)!.items.push(item);
    }

    return {
      groups: Array.from(categoryMap.entries()).map(([id, data]) => ({ id, ...data })),
      checkedItems: checked,
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

      {/* Category groups with inline pills */}
      {groups.length === 0 && checkedItems.length === 0 ? (
        <div className="text-center text-gray-400 mt-16">
          <p className="text-lg mb-2">List is empty</p>
          <p className="text-sm">Tap + to add items</p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <PillGroup
              key={group.id}
              categoryName={group.name}
              categoryColor={group.color}
              items={group.items}
              onCheckItem={(id, checked) => checkItem(id, checked)}
              onRemoveItem={(id) => removeItem(id)}
            />
          ))}
          <CheckedSection
            items={checkedItems}
            onUncheck={(id) => checkItem(id, false)}
            onRemove={(id) => removeItem(id)}
            onClearAll={clearChecked}
          />
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

      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        listId={listId}
      />
    </div>
  );
}
