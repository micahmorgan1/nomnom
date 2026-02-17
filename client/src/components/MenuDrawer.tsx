import { useState, useEffect, useCallback } from 'react';
import { useMenus } from '@/hooks/useMenus';
import { hexToRgb, getColoredPillText } from '@/lib/colorUtils';
import CreateMenuModal from './CreateMenuModal';
import type { MenuWithItems, MenuSummary } from '@nomnom/shared';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onAddToList: (menuId: number, excludeItemIds: number[]) => Promise<unknown>;
  currentItemIds: Set<number>;
}

export default function MenuDrawer({ open, onClose, onAddToList, currentItemIds }: MenuDrawerProps) {
  const { menus, loading, loadMenus, getMenu, createMenu, updateMenu, deleteMenu } = useMenus();
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedMenu, setExpandedMenu] = useState<MenuWithItems | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuWithItems | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadMenus();
      setExpandedId(null);
      setExpandedMenu(null);
      setExcluded(new Set());
      setConfirmDelete(null);
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open, loadMenus]);

  const handleExpand = useCallback(async (menuId: number) => {
    if (expandedId === menuId) {
      setExpandedId(null);
      setExpandedMenu(null);
      setExcluded(new Set());
      return;
    }
    setExpandedId(menuId);
    setExpandedLoading(true);
    setExcluded(new Set());
    try {
      const menu = await getMenu(menuId);
      setExpandedMenu(menu);
    } catch {
      setExpandedMenu(null);
    } finally {
      setExpandedLoading(false);
    }
  }, [expandedId, getMenu]);

  const toggleExclude = useCallback((itemId: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  async function handleAddToList(menuId: number) {
    setSubmitting(true);
    try {
      await onAddToList(menuId, Array.from(excluded));
      onClose();
    } catch {
      // keep drawer open on error
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateMenu(name: string, itemIds: number[]) {
    await createMenu({ name, item_ids: itemIds });
  }

  async function handleEditMenu(name: string, itemIds: number[]) {
    if (!editingMenu) return;
    await updateMenu(editingMenu.id, { name, item_ids: itemIds });
    // Refresh expanded if it was the edited menu
    if (expandedId === editingMenu.id) {
      const updated = await getMenu(editingMenu.id);
      setExpandedMenu(updated);
    }
  }

  async function handleDelete(id: number) {
    await deleteMenu(id);
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedMenu(null);
    }
    setConfirmDelete(null);
  }

  async function handleEditClick(menu: MenuSummary) {
    const full = await getMenu(menu.id);
    setEditingMenu(full);
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${animating ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />

        {/* Drawer */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${
            animating ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
            <h2 className="text-lg font-semibold">Menus</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          {/* Content */}
          <div
            className="overflow-y-auto overscroll-contain px-4 pb-24"
            style={{ maxHeight: 'calc(80vh - 56px)', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Create button */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full mt-3 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent-400 hover:text-accent-500 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
              Create Menu
            </button>

            {loading ? (
              <div className="text-center text-gray-400 py-12">Loading menus...</div>
            ) : menus.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                No menus yet. Create one to save a collection of items.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {menus.map((menu) => {
                  const isExpanded = expandedId === menu.id;
                  return (
                    <div key={menu.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Menu header row */}
                      <button
                        onClick={() => handleExpand(menu.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-800 flex-1 text-left">{menu.name}</span>
                        <span className="text-xs text-gray-400">{menu.item_count} item{menu.item_count !== 1 ? 's' : ''}</span>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-gray-100">
                          {expandedLoading ? (
                            <div className="text-center text-gray-400 py-4 text-sm">Loading...</div>
                          ) : expandedMenu ? (
                            <>
                              {/* Ingredient pills */}
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {expandedMenu.items.map((mi) => {
                                  const isExcluded = excluded.has(mi.item_id);
                                  const onList = currentItemIds.has(mi.item_id);
                                  const rgb = hexToRgb(mi.category.color);
                                  return (
                                    <button
                                      key={mi.id}
                                      onClick={() => toggleExclude(mi.item_id)}
                                      className={`pill relative transition-all text-sm ${
                                        isExcluded ? 'opacity-40 line-through' : ''
                                      }`}
                                      style={{
                                        backgroundColor: '#ffffff',
                                        border: `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isExcluded ? 0.2 : 0.5})`,
                                        color: getColoredPillText(mi.category.color, 0),
                                      }}
                                    >
                                      {!isExcluded && (
                                        <svg
                                          className="w-3 h-3 mr-0.5 text-accent-500 inline-block"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {mi.item.name}
                                      {onList && (
                                        <span className="ml-1 text-[10px] text-gray-400 font-normal">on list</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() => handleAddToList(menu.id)}
                                  disabled={submitting || expandedMenu.items.length - excluded.size === 0}
                                  className="flex-1 py-2 bg-accent-500 text-white text-sm font-semibold rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
                                >
                                  {submitting
                                    ? 'Adding...'
                                    : `Add ${expandedMenu.items.length - excluded.size} Item${
                                        expandedMenu.items.length - excluded.size !== 1 ? 's' : ''
                                      }`}
                                </button>
                                <button
                                  onClick={() => handleEditClick(menu)}
                                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Edit menu"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {confirmDelete === menu.id ? (
                                  <button
                                    onClick={() => handleDelete(menu.id)}
                                    className="px-3 py-1.5 text-xs bg-danger-400 text-white rounded-lg hover:bg-danger-500 transition-colors"
                                  >
                                    Confirm
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDelete(menu.id)}
                                    className="p-2 text-gray-400 hover:text-danger-400 transition-colors"
                                    title="Delete menu"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      <CreateMenuModal
        open={showCreate || editingMenu !== null}
        onClose={() => {
          setShowCreate(false);
          setEditingMenu(null);
        }}
        onSave={editingMenu ? handleEditMenu : handleCreateMenu}
        editingMenu={editingMenu}
      />
    </>
  );
}
