import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MenuSummary, MenuWithItems, CreateMenuRequest, UpdateMenuRequest } from '@nomnom/shared';

export function useMenus() {
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MenuSummary[]>('/menus');
      setMenus(data);
    } catch {
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMenu = useCallback(async (id: number) => {
    return api.get<MenuWithItems>(`/menus/${id}`);
  }, []);

  const createMenu = useCallback(async (data: CreateMenuRequest) => {
    const menu = await api.post<MenuSummary>('/menus', data);
    setMenus((prev) => [...prev, menu].sort((a, b) => a.name.localeCompare(b.name)));
    return menu;
  }, []);

  const updateMenu = useCallback(async (id: number, data: UpdateMenuRequest) => {
    const menu = await api.put<MenuSummary>(`/menus/${id}`, data);
    setMenus((prev) =>
      prev.map((m) => (m.id === id ? menu : m)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return menu;
  }, []);

  const deleteMenu = useCallback(async (id: number) => {
    await api.delete(`/menus/${id}`);
    setMenus((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { menus, loading, loadMenus, getMenu, createMenu, updateMenu, deleteMenu };
}
