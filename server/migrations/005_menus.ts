import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('menus', (t) => {
    t.increments('id').primary();
    t.string('name', 200).notNullable();
    t.integer('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('menu_items', (t) => {
    t.increments('id').primary();
    t.integer('menu_id').notNullable().references('id').inTable('menus').onDelete('CASCADE');
    t.integer('item_id').notNullable().references('id').inTable('items').onDelete('CASCADE');
    t.unique(['menu_id', 'item_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('menu_items');
  await knex.schema.dropTableIfExists('menus');
}
