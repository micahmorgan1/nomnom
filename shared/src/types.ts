// ---------- Users ----------
export interface User {
  id: number;
  username: string;
  created_at: string;
}

// ---------- Lists ----------
export interface List {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export type SharePermission = 'view' | 'edit';

export interface ListShare {
  list_id: number;
  user_id: number;
  permission: SharePermission;
  username?: string;
}

// ---------- Categories ----------
export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
  user_id: number | null;
}

// ---------- Items (library) ----------
export interface Item {
  id: number;
  name: string;
  category_id: number;
  created_by: number;
}

// ---------- List Items ----------
export interface ListItem {
  id: number;
  list_id: number;
  item_id: number;
  quantity: string;
  notes: string;
  is_checked: boolean;
  sort_order: number;
  added_at: string;
  checked_at: string | null;
}

export interface ListItemWithDetails extends ListItem {
  item: Item;
  category: Category;
}

// ---------- List with metadata ----------
export interface ListWithMeta extends List {
  is_owner: boolean;
  owner_username?: string;
  unchecked_count: number;
  total_count: number;
}

// ---------- API Payloads ----------
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AddListItemRequest {
  name: string;
  category_id: number;
  quantity?: string;
  notes?: string;
}

export interface UpdateListItemRequest {
  quantity?: string;
  notes?: string;
  is_checked?: boolean;
}

// ---------- Socket Events ----------
export interface ServerToClientEvents {
  'list:item-added': (data: { listId: number; listItem: ListItemWithDetails }) => void;
  'list:item-checked': (data: { listId: number; listItemId: number; is_checked: boolean; checked_at: string | null }) => void;
  'list:item-removed': (data: { listId: number; listItemId: number }) => void;
  'list:item-updated': (data: { listId: number; listItem: ListItemWithDetails }) => void;
}

export interface ClientToServerEvents {
  'list:join': (listId: number) => void;
  'list:leave': (listId: number) => void;
}
