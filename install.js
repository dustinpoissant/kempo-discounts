import { createIndexes } from './server/db/indexes.js';

/*
  What kempo-config.json cannot say: the indexes, which kempo's installer does not make from the schema.
*/
export default async () => {
  await createIndexes();
  console.log('[kempo-discounts] Installed. Set up a sale at /admin/extension/kempo-discounts/.');
};
