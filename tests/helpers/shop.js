import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, like, sql } from 'drizzle-orm';
import { createProduct, createCategory } from 'kempo-products/sdk';
import { createHook, clearHandlerCache } from 'kempo/server/sdk.js';
import { hook, setting } from 'kempo/server/db/schema.js';
import { kempoDiscountSale, kempoDiscountUsage } from '../../server/db/schema.js';
import { db } from './db.js';

/*
  What the suites share: a reset, a product to sell, and the three hooks this extension answers, registered the
  way kempo registers them for an installed extension.
*/

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OWNER = 'kempo-discounts';

export const key = () => crypto.randomUUID();

/* The other extensions' tables, emptied by name: they are reached through their SDKs everywhere else. */
const FOREIGN_TABLES = [
  'kempoCommerceAttempt', 'kempoCommerceRefund', 'kempoCommerceNote', 'kempoCommerceEvent', 'kempoCommerceTender',
  'kempoCommerceOrderAdjustment', 'kempoCommerceOrderLine', 'kempoCommerceOrder', 'kempoCommerceCartLine', 'kempoCommerceCart', 'kempoCommerceCounter',
  'kempoPaymentRefund', 'kempoPayment', 'kempoProductLedger', 'kempoProductOption', 'kempoProduct', 'kempoProductCategory',
];

export const purge = async () => {
  await db.delete(kempoDiscountUsage);
  await db.delete(kempoDiscountSale);
  for(const name of FOREIGN_TABLES) await db.execute(sql.raw(`delete from "${name}"`)).catch(() => {});
  await db.delete(setting).where(like(setting.name, 'kempo-commerce:%'));
};

export const makeProduct = async (overrides = {}) => {
  const [error, product] = await createProduct({ name: `Test product ${crypto.randomBytes(3).toString('hex')}`, price: 1000, status: 'published', ...overrides });
  if(error) throw new Error(`could not make a product: ${error.msg}`);
  return product;
};

export const makeCategory = async name => {
  const [error, category] = await createCategory({ name });
  if(error) throw new Error(`could not make a category: ${error.msg}`);
  return category;
};

const HOOKS = {
  'kempo-commerce:totals:discounts': 'totals-discounts.js',
  'kempo-commerce:order:paid': 'order-paid.js',
  'kempo-commerce:refund:issued': 'refund-issued.js',
};

/* Registers this extension's hooks, as installing it does. */
export const listen = async () => {
  await stopListening();
  for(const [event, file] of Object.entries(HOOKS)){
    const [error] = await createHook({ owner: OWNER, event, callback: path.join(root, 'hooks', file) });
    if(error) throw new Error(`could not register ${event}: ${error.msg}`);
  }
  clearHandlerCache();
};

export const stopListening = async () => {
  await db.delete(hook).where(eq(hook.owner, OWNER));
  clearHandlerCache();
};
