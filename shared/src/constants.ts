export const DEFAULT_CATEGORIES = [
  { name: 'Produce',        color: '#34C759' },  // jade_green
  { name: 'Meat',           color: '#FF4B2B' },  // blazing_flame
  { name: 'Dairy',          color: '#007AFF' },  // azure_blue
  { name: 'Bakery',         color: '#FF9500' },  // deep_saffron
  { name: 'Frozen',         color: '#5AC8FA' },  // sky_aqua
  { name: 'Beverages',      color: '#AF52DE' },  // lavender_purple
  { name: 'Snacks',         color: '#F333FF' },
  { name: 'Canned Goods',   color: '#FF1493' },  // bright_gold
  { name: 'Household',      color: '#5856D6' },  // violet_twilight
  { name: 'Personal Care',  color: '#00CED1' },
  { name: 'Other',          color: '#737373' },
] as const;

export const PRESET_COLORS = [
  '#FF4B2B', '#FF6F61', '#FF9500', '#FF1493',
  '#34C759', '#5AC8FA', '#007AFF', '#5856D6',
  '#AF52DE', '#E91E63', '#737373',
] as const;

export const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 6, label: 'At least 6 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
  { test: (p: string) => /[^a-zA-Z0-9]/.test(p), label: 'One special character' },
] as const;

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) errors.push(rule.label);
  }
  return { valid: errors.length === 0, errors };
}
