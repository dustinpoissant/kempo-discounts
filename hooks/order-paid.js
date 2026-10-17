import { recordUsage } from '../server/utils/usage.js';

/* An order was paid: count the sales on it, once. */
export default async ({ order }) => {
  await recordUsage(order);
};
