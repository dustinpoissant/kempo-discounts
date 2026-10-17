import { sql } from 'drizzle-orm';
import db from 'kempo/server/db/index.js';

/*
  The indexes server/db/schema.js declares, created by hand: kempo's installer makes columns and primary keys
  from a Drizzle schema and nothing else. install.js and update.js both run this.

  The unique one on a sale and an order is what makes a hook that arrives twice count once, so if it cannot be
  made the install fails rather than going ahead without it.
*/
export const INDEXES = [
  { name: 'kempoDiscountUsage_sale_order_idx', required: true, sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS "kempoDiscountUsage_sale_order_idx" ON "kempoDiscountUsage" ("saleId", "orderId")` },
  { name: 'kempoDiscountUsage_order_idx', sql: sql`CREATE INDEX IF NOT EXISTS "kempoDiscountUsage_order_idx" ON "kempoDiscountUsage" ("orderId")` },
];

export const createIndexes = async () => {
  for(const index of INDEXES){
    try {
      await db.execute(index.sql);
    } catch(error) {
      if(index.required) throw new Error(`[kempo-discounts] Could not create ${index.name}, which the usage count cannot work safely without: ${error.message}`);
      console.warn(`[kempo-discounts] Could not create the index ${index.name}: ${error.message}`);
    }
  }
};
