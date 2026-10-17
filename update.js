import { createIndexes } from './server/db/indexes.js';

/* Updating makes sure the indexes exist. Every statement is `IF NOT EXISTS`, so this is safe from any version to any other. */
export default async () => {
  await createIndexes();
};
