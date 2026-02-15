import type { Knex } from 'knex';

const COLOR_MAP: Record<string, string> = {
  '#22c55e': '#16a34a', // Produce
  '#ef4444': '#dc2626', // Meat
  '#3b82f6': '#2563eb', // Dairy
  '#f59e0b': '#d97706', // Bakery
  '#06b6d4': '#0891b2', // Frozen
  '#8b5cf6': '#7c3aed', // Beverages
  '#f97316': '#ea580c', // Snacks
  '#78716c': '#92400e', // Canned Goods
  '#64748b': '#4f46e5', // Household
  '#ec4899': '#db2777', // Personal Care
  '#a3a3a3': '#737373', // Other
};

export async function up(knex: Knex): Promise<void> {
  for (const [oldColor, newColor] of Object.entries(COLOR_MAP)) {
    await knex('categories')
      .where({ color: oldColor, is_default: true })
      .update({ color: newColor });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const [oldColor, newColor] of Object.entries(COLOR_MAP)) {
    await knex('categories')
      .where({ color: newColor, is_default: true })
      .update({ color: oldColor });
  }
}
