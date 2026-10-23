import { pgTable, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

/*
  A sale: a discount that products and categories are added to.

  `kind` is `percent` (`value` 1 to 100) or `fixed` (`value` is an amount off each unit, in the smallest
  currency unit). `stackable` says whether it may combine with other discounts on a line. The sale covers a
  product when `allProducts` is set, when the product is listed in `targets`, or when it is in a listed
  category: `targets` is a list of `{ type: 'product' | 'category', key }`.

  Whether it is running is not stored: it is worked out from `paused`, `startsAt` and `endsAt` when asked.
*/
export const kempoDiscountSale = pgTable('kempoDiscountSale', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  kind: text('kind').notNull(), // percent | fixed
  value: integer('value').notNull(),
  stackable: boolean('stackable').notNull().default(false),
  allProducts: boolean('allProducts').notNull().default(false),
  targets: jsonb('targets').notNull().default([]),
  startsAt: timestamp('startsAt'),
  endsAt: timestamp('endsAt'),
  paused: boolean('paused').notNull().default(false),
  created: timestamp('created').notNull(),
  updated: timestamp('updated').notNull(),
});

/*
  What a sale did on one paid order: the units it was taken off and the amount, and how much of that a refund
  has since given back. Kept after the sale is deleted, so past orders still make sense. One row for each sale on
  each order, so a hook that arrives twice counts once.
*/
export const kempoDiscountUsage = pgTable('kempoDiscountUsage', {
  id: text('id').primaryKey(),
  saleId: text('saleId').notNull(),
  orderId: text('orderId').notNull(),
  units: integer('units').notNull().default(0),
  amount: integer('amount').notNull().default(0),
  refundedAmount: integer('refundedAmount').notNull().default(0),
  created: timestamp('created').notNull(),
}, table => [
  uniqueIndex('kempoDiscountUsage_sale_order_idx').on(table.saleId, table.orderId),
  index('kempoDiscountUsage_order_idx').on(table.orderId),
]);
