import 'dotenv/config';
import db from './db.js';
import { DEFAULT_CATEGORIES } from '@nomnom/shared';

async function seed() {
  await db.migrate.latest();

  const existing = await db('categories').where({ is_default: true }).first();
  if (existing) {
    console.log('Default categories already seeded.');
    process.exit(0);
  }

  await db('categories').insert(
    DEFAULT_CATEGORIES.map((c) => ({
      name: c.name,
      color: c.color,
      is_default: true,
      user_id: null,
    }))
  );

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
