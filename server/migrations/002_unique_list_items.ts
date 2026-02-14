import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove duplicates first — keep earliest entry (lowest id) for each (list_id, item_id)
  const duplicates = await knex('list_items')
    .select('list_id', 'item_id')
    .groupBy('list_id', 'item_id')
    .havingRaw('count(*) > 1');

  for (const dup of duplicates) {
    const rows = await knex('list_items')
      .where({ list_id: dup.list_id, item_id: dup.item_id })
      .orderBy('id', 'asc')
      .select('id');
    // Delete all but the first
    const idsToDelete = rows.slice(1).map((r: { id: number }) => r.id);
    if (idsToDelete.length > 0) {
      await knex('list_items').whereIn('id', idsToDelete).del();
    }
  }

  await knex.schema.alterTable('list_items', (t) => {
    t.unique(['list_id', 'item_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('list_items', (t) => {
    t.dropUnique(['list_id', 'item_id']);
  });
}
