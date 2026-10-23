import db from 'kempo/server/db/index.js';
import { and, eq, isNull, or, lte, gt } from 'drizzle-orm';
import { kempoDiscountSale } from '../db/schema.js';

/* The sales running right now: not paused, started, and not ended. */
export const activeSales = async (now = new Date()) => db.select().from(kempoDiscountSale).where(and(
  eq(kempoDiscountSale.paused, false),
  or(isNull(kempoDiscountSale.startsAt), lte(kempoDiscountSale.startsAt, now)),
  or(isNull(kempoDiscountSale.endsAt), gt(kempoDiscountSale.endsAt, now)),
));

/*
  Whether a sale covers a product (as kempo-products returns it): the whole catalog, the product itself, a
  category it is in. A credit pack is a product like any other here: a sale discounts it when it
  covers it, so leave a pack out of a sale by adding products or categories instead of "every product".
*/
export const covers = (sale, product) => {
  if(!product) return false;
  if(sale.allProducts) return true;
  return (sale.targets ?? []).some(target => (target.type === 'product' && target.key === product.id)
    || (target.type === 'category' && (product.categories ?? []).includes(target.key)));
};

export const salesFor = (sales, product) => sales.filter(sale => covers(sale, product));
