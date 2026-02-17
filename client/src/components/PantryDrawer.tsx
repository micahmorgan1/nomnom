import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useItemLibrary } from '@/hooks/useItemLibrary';
import { hexToRgb, getTextColor, getColoredPillText } from '@/lib/colorUtils';

interface PantryDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (itemIds: number[]) => Promise<unknown>;
  currentItemIds: Set<number>;
}

interface GroupedCategory {
  name: string;
  color: string;
  items: { id: number; name: string }[];
}

export default function PantryDrawer({ open, onClose, onAdd, currentItemIds }: PantryDrawerProps) {
  const { results, loading, loadAll } = useItemLibrary();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportOffset, setViewportOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load library when opened
  useEffect(() => {
    if (open) {
      loadAll();
      setSelected(new Set());
      setSearch('');
      // Trigger entrance animation
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open, loadAll]);

  // iOS keyboard: adjust height when visual viewport resizes
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      setViewportHeight(vv!.height);
      setViewportOffset(vv!.offsetTop);
    }
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);

  // Filter out items already on the list and group by category
  const grouped = useMemo(() => {
    let available = results.filter((item) => !currentItemIds.has(item.id));

    if (search.trim()) {
      available = available.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    const map = new Map<string, GroupedCategory>();
    for (const item of available) {
      const key = item.category.name;
      if (!map.has(key)) {
        map.set(key, { name: item.category.name, color: item.category.color, items: [] });
      }
      map.get(key)!.items.push({ id: item.id, name: item.name });
    }

    // Sort categories alphabetically, items within each alphabetically
    const groups = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    for (const g of groups) {
      g.items.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [results, currentItemIds, search]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((catName: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((itemId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  async function handleAdd() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await onAdd(Array.from(selected));
      onClose();
    } catch {
      // keep drawer open on error
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearchFocus() {
    setTimeout(() => {
      scrollRef.current?.scrollTo(0, 0);
    }, 150);
  }

  if (!visible) return null;

  const totalAvailable = grouped.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div
      className="fixed left-0 right-0 z-50"
      style={viewportHeight
        ? { top: `${viewportOffset}px`, height: `${viewportHeight}px` }
        : { top: 0, bottom: 0 }
      }
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${animating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out flex flex-col ${
          animating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80%' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold">Pantry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-1 relative">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={handleSearchFocus}
            className="w-full px-4 py-2 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
            autoComplete="one-time-code"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-white text-xs"
            >
              &times;
            </button>
          )}
        </div>

        {/* Content */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-24"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading items...</div>
          ) : totalAvailable === 0 ? (
            <div className="text-center text-gray-400 py-12">
              {results.length === 0
                ? 'No items in your library yet'
                : search.trim()
                  ? 'No items match your search'
                  : 'All items are already on this list'}
            </div>
          ) : (
            <div className="py-3 space-y-4">
              {grouped.map((group) => {
                const isCollapsed = collapsed.has(group.name);
                const textColor = getTextColor(group.color);
                return (
                  <div key={group.name}>
                    {/* Category header */}
                    <button
                      onClick={() => toggleCollapse(group.name)}
                      className="flex items-center gap-2 w-full text-left mb-2"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                        style={{ color: '#374151' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-sm font-semibold" style={{ color: '#374151' }}>
                        {group.name}
                      </span>
                      <span className="text-xs text-gray-400">({group.items.length})</span>
                    </button>

                    {/* Items */}
                    {!isCollapsed && (
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => {
                          const isSelected = selected.has(item.id);
                          const rgb = hexToRgb(group.color);
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleSelect(item.id)}
                              className={`pill relative transition-all ${
                                isSelected ? 'ring-2 ring-accent-400 scale-105' : ''
                              }`}
                              style={{
                                backgroundColor: '#ffffff',
                                border: `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
                                color: getColoredPillText(group.color, 0),
                                opacity: 0.7,
                              }}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3.5 h-3.5 mr-0.5 text-accent-500 inline-block"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating add button */}
        {selected.size > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="w-full py-3 bg-accent-500 text-white font-semibold rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : `Add ${selected.size} item${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
