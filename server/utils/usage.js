import crypto from 'crypto';
import db from 'kempo/server/db/index.js';
import { and, eq } from 'drizzle-orm';
import { getOrder } from 'kempo-commerce/sdk';
import { kempoDiscountUsage } from '../db/schema.js';

/* The discount rows kempo-discounts put on an order, grouped by sale and by line: { saleId: { lineId: amountOff } }. */
const rowsOf = order => {
  const bySale = {};
  for(const adjustment of order.adjustments ?? []){
    if(adjustment.type !== 'discount' || adjustment.source !== 'kempo-discounts' || !adjustment.data?.saleId || !adjustment.lineId) continue;
    const sale = bySale[adjustment.data.saleId] ??= {};
    sale[adjustment.lineId] = (sale[adjustment.lineId] ?? 0) + Math.abs(adjustment.amount);
  }
  return bySale;
};

/*
  Counts an order's sales once it is paid: for each sale on it, the units it was taken off and the amount. One row
  for each sale on each order, so a hook that is delivered twice, a retried payment and the recovery sweep all count
  once. Orders that fail or are cancelled never get here.
*/
export const recordUsage = async order => {
  const bySale = rowsOf(order);
  const now = new Date();
  for(const [saleId, lines] of Object.entries(bySale)){
    const units = Object.keys(lines).reduce((sum, lineId) => sum + (order.lines.find(line => line.id === lineId)?.quantity ?? 0), 0);
    const amount = Object.values(lines).reduce((sum, value) => sum + value, 0);
    await db.insert(kempoDiscountUsage).values({ id: crypto.randomBytes(8).toString('hex'), saleId, orderId: order.id, units, amount, created: now }).onConflictDoNothing();
  }
};

/*
  After a refund: how much of each sale's discount has gone back, worked out from scratch from what has been
  refunded on each line so far (so running it twice changes nothing, and refunding a line in parts adds up to the
  line, the last unit taking the rounding). Counts are therefore net of refunds.
*/
export const recordRefund = async orderId => {
  const [error, order] = await getOrder(orderId);
  if(error) return;
  const bySale = rowsOf(order);
  for(const [saleId, lines] of Object.entries(bySale)){
    let refunded = 0;
    for(const [lineId, amount] of Object.entries(lines)){
      const line = order.lines.find(candidate => candidate.id === lineId);
      if(!line || !line.quantity) continue;
      const back = Math.min(line.refundedQuantity ?? 0, line.quantity);
      refunded += back >= line.quantity ? amount : Math.floor(amount * back / line.quantity);
    }
    await db.update(kempoDiscountUsage).set({ refundedAmount: refunded })
      .where(and(eq(kempoDiscountUsage.saleId, saleId), eq(kempoDiscountUsage.orderId, orderId)));
  }
};
