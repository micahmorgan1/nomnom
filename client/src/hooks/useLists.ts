import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ListWithMeta } from '@nomnom/shared';

export function useLists() {
  const [lists, setLists] = useState<ListWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<ListWithMeta[]>('/lists');
      setLists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createList = useCallback(async (name: string) => {
    const list = await api.post<ListWithMeta>('/lists', { name });
    setLists((prev) => [list, ...prev]);
    return list;
  }, []);

  const deleteList = useCallback(async (id: number) => {
    await api.delete(`/lists/${id}`);
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { lists, loading, error, createList, deleteList, refresh };
}
