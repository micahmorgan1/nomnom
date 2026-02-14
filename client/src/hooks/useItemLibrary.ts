import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Item, Category } from '@nomnom/shared';

interface LibraryItem extends Item {
  category: Pick<Category, 'id' | 'name' | 'color'>;
}

export function useItemLibrary() {
  const [results, setResults] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<LibraryItem[]>(`/items?search=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<LibraryItem[]>('/items');
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search, loadAll };
}
