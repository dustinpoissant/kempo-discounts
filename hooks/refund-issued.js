import { recordRefund } from '../server/utils/usage.js';

/* A refund was issued: take back that share of what the sales on the order saved. */
export default async ({ order }) => {
  await recordRefund(order.id);
};
