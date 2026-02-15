import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import type { List, ListItemWithDetails } from '@nomnom/shared';

interface ListDetail extends List {
  is_owner: boolean;
  items: ListItemWithDetails[];
}

export function useList(listId: number) {
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<ListDetail>(`/lists/${listId}`);
      setList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch list');
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Socket.IO real-time sync
  useEffect(() => {
    if (!socket || !listId) return;

    socket.emit('list:join', listId);

    socket.on('list:item-added', (data) => {
      if (data.listId !== listId) return;
      setList((prev) => {
        if (!prev) return prev;
        // Avoid duplicates
        if (prev.items.some((i) => i.id === data.listItem.id)) return prev;
        return { ...prev, items: [...prev.items, data.listItem] };
      });
    });

    socket.on('list:item-checked', (data) => {
      if (data.listId !== listId) return;
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === data.listItemId
              ? { ...i, is_checked: data.is_checked, checked_at: data.checked_at }
              : i
          ),
        };
      });
    });

    socket.on('list:item-removed', (data) => {
      if (data.listId !== listId) return;
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i) => i.id !== data.listItemId) };
      });
    });

    socket.on('list:item-updated', (data) => {
      if (data.listId !== listId) return;
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === data.listItem.id ? data.listItem : i)),
        };
      });
    });

    socket.on('list:items-added', (data) => {
      if (data.listId !== listId) return;
      setList((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((i) => i.id));
        const newItems = data.listItems.filter((li: ListItemWithDetails) => !existingIds.has(li.id));
        const updatedItems = prev.items.map((i) => {
          const updated = data.listItems.find((li: ListItemWithDetails) => li.id === i.id);
          return updated || i;
        });
        return { ...prev, items: [...updatedItems, ...newItems] };
      });
    });

    return () => {
      socket.emit('list:leave', listId);
      socket.off('list:item-added');
      socket.off('list:items-added');
      socket.off('list:item-checked');
      socket.off('list:item-removed');
      socket.off('list:item-updated');
    };
  }, [socket, listId]);

  const addItem = useCallback(
    async (data: { name: string; category_id: number; quantity?: string; notes?: string }) => {
      const item = await api.post<ListItemWithDetails>(`/lists/${listId}/items`, data);
      setList((prev) => {
        if (!prev) return prev;
        // If the item already exists (re-activated), update it in place
        const idx = prev.items.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          const updated = [...prev.items];
          updated[idx] = item;
          return { ...prev, items: updated };
        }
        return { ...prev, items: [...prev.items, item] };
      });
      return item;
    },
    [listId]
  );

  const checkItem = useCallback(
    async (listItemId: number, is_checked: boolean) => {
      // Optimistic update
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === listItemId
              ? {
                  ...i,
                  is_checked,
                  checked_at: is_checked ? new Date().toISOString() : null,
                  // Reset quantity and notes when checking off
                  ...(is_checked ? { quantity: '1', notes: '' } : {}),
                }
              : i
          ),
        };
      });
      await api.patch(`/lists/${listId}/items/${listItemId}`, { is_checked });
    },
    [listId]
  );

  const removeItem = useCallback(
    async (listItemId: number) => {
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i) => i.id !== listItemId) };
      });
      await api.delete(`/lists/${listId}/items/${listItemId}`);
    },
    [listId]
  );

  const updateItem = useCallback(
    async (listItemId: number, updates: { quantity?: string; notes?: string; category_id?: number }) => {
      const result = await api.patch<ListItemWithDetails>(`/lists/${listId}/items/${listItemId}`, updates);
      // Update local state with the enriched response
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === listItemId ? result : i)),
        };
      });
      return result;
    },
    [listId]
  );

  const addItemsFromLibrary = useCallback(
    async (itemIds: number[]) => {
      const items = await api.post<ListItemWithDetails[]>(`/lists/${listId}/items/batch`, {
        items: itemIds.map((id) => ({ item_id: id })),
      });
      setList((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((i) => i.id));
        const newItems = items.filter((li) => !existingIds.has(li.id));
        const updatedItems = prev.items.map((i) => {
          const updated = items.find((li) => li.id === i.id);
          return updated || i;
        });
        return { ...prev, items: [...updatedItems, ...newItems] };
      });
      return items;
    },
    [listId]
  );

  const clearChecked = useCallback(async () => {
    if (!list) return;
    const checked = list.items.filter((i) => i.is_checked);
    setList((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((i) => !i.is_checked) };
    });
    await Promise.all(checked.map((i) => api.delete(`/lists/${listId}/items/${i.id}`)));
  }, [list, listId]);

  return { list, loading, error, addItem, addItemsFromLibrary, checkItem, updateItem, removeItem, clearChecked, refresh };
}
