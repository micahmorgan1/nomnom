import type { Knex } from 'knex';

// SQLite can't disable FK checks inside a transaction
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.raw('PRAGMA foreign_keys = OFF');

  // Create new table with nullable created_by
  await knex.schema.createTable('items_new', (t) => {
    t.increments('id').primary();
    t.string('name', 200).notNullable();
    t.integer('category_id').notNullable().references('id').inTable('categories');
    t.integer('created_by').references('id').inTable('users').onDelete('CASCADE');
  });

  // Copy data
  await knex.raw('INSERT INTO items_new (id, name, category_id, created_by) SELECT id, name, category_id, created_by FROM items');

  // Swap tables
  await knex.schema.dropTable('items');
  await knex.schema.renameTable('items_new', 'items');

  await knex.raw('PRAGMA foreign_keys = ON');
}

export async function down(knex: Knex): Promise<void> {
  // Delete system items so we can restore NOT NULL
  await knex('items').whereNull('created_by').del();

  await knex.raw('PRAGMA foreign_keys = OFF');

  await knex.schema.createTable('items_old', (t) => {
    t.increments('id').primary();
    t.string('name', 200).notNullable();
    t.integer('category_id').notNullable().references('id').inTable('categories');
    t.integer('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.unique(['name', 'created_by']);
  });

  await knex.raw('INSERT INTO items_old (id, name, category_id, created_by) SELECT id, name, category_id, created_by FROM items');

  await knex.schema.dropTable('items');
  await knex.schema.renameTable('items_old', 'items');

  await knex.raw('PRAGMA foreign_keys = ON');
}
