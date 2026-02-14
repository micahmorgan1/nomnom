import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username', 50).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('color', 7).notNullable();
    t.boolean('is_default').defaultTo(false);
    t.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  await knex.schema.createTable('lists', (t) => {
    t.increments('id').primary();
    t.string('name', 200).notNullable();
    t.integer('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('list_shares', (t) => {
    t.integer('list_id').notNullable().references('id').inTable('lists').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('permission', 10).notNullable().defaultTo('edit');
    t.primary(['list_id', 'user_id']);
  });

  await knex.schema.createTable('items', (t) => {
    t.increments('id').primary();
    t.string('name', 200).notNullable();
    t.integer('category_id').notNullable().references('id').inTable('categories');
    t.integer('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.unique(['name', 'created_by']);
  });

  await knex.schema.createTable('list_items', (t) => {
    t.increments('id').primary();
    t.integer('list_id').notNullable().references('id').inTable('lists').onDelete('CASCADE');
    t.integer('item_id').notNullable().references('id').inTable('items');
    t.string('quantity', 50).defaultTo('1');
    t.string('notes', 500).defaultTo('');
    t.boolean('is_checked').defaultTo(false);
    t.integer('sort_order').defaultTo(0);
    t.timestamp('added_at').defaultTo(knex.fn.now());
    t.timestamp('checked_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('list_items');
  await knex.schema.dropTableIfExists('items');
  await knex.schema.dropTableIfExists('list_shares');
  await knex.schema.dropTableIfExists('lists');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');
}
