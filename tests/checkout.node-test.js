import { and, eq } from 'drizzle-orm';
import { resolveCart, addToCart, getCart, placeOrder, completeOrder, previewRefund, refundOrder } from 'kempo-commerce/sdk';
import { db, seedDatabase } from './helpers/db.js';
import { purge, makeProduct, makeCategory, listen, stopListening, key } from './helpers/shop.js';
import { installFakeCard, restoreCard, succeed } from './helpers/fakeCard.js';
import { createSale, updateSale, deleteSale } from '../server/utils/sales.js';
import { quoteProducts } from '../server/utils/quote.js';
import { kempoDiscountUsage } from '../server/db/schema.js';

/*
  Sales through a real cart, order and refund, with this extension's hooks registered the way kempo registers them
  for an installed extension: the cart takes the discount, a stacked one comes off in the right order, the minimum
  price holds, the order keeps it against its line, the storefront price agrees with the cart, and the usage count
  follows payment and refunds.
*/

const BILLING = { name: 'Fixture Buyer', email: 'fixture@example.test', line1: '1 Test St' };

const ok = ([error, value]) => {
  if(error) throw new Error(`unexpected error: ${error.code} ${error.msg}`);
  return value;
};

const cartWith = async (product, quantity = 1) => {
  const { cart } = ok(await resolveCart({}));
  ok(await addToCart({ cartId: cart.id, productId: product.id, quantity }));
  return cart.id;
};

const discountOf = async cartId => ok(await getCart({ cartId })).totals.discountTotal;

export const beforeAll = async () => {
  await seedDatabase();
  await purge();
  await listen();
  installFakeCard();
};

export const afterAll = async () => {
  await stopListening();
  restoreCard();
  await purge();
};

export default {
  'a running sale takes its percent off the line in the cart, and a stopped one does not': async ({ pass, fail }) => {
    const item = await makeProduct({ price: 4000, quantity: 5 });
    const sale = ok(await createSale({ kind: 'percent', value: 25, allProducts: true }));
    const cartId = await cartWith(item, 2);
    const cart = ok(await getCart({ cartId }));
    if(cart.totals.discountTotal !== -2000 || cart.totals.total !== 6000) return fail(`totals ${JSON.stringify(cart.totals)}`);
    const row = cart.adjustments.find(adjustment => adjustment.type === 'discount');
    if(!row || row.label !== 'Sale: 25% Off' || row.source !== 'kempo-discounts' || row.lineId !== cart.lines[0].id) return fail(`row ${JSON.stringify(row)}`);

    ok(await updateSale(sale.id, { paused: true }));
    if(await discountOf(cartId) !== 0) return fail('a paused sale still takes something off');
    ok(await updateSale(sale.id, { paused: false, targets: [], allProducts: false }));
    if(await discountOf(cartId) !== 0) return fail('a sale with nothing in it takes something off');
    ok(await deleteSale(sale.id));
    pass('');
  },

  'a sale covers a product through its category, and only that product': async ({ pass, fail }) => {
    const category = await makeCategory('Model cars');
    const car = await makeProduct({ price: 2500, categories: [category.key] });
    const paint = await makeProduct({ price: 2500 });
    ok(await createSale({ kind: 'fixed', value: 1000, targets: [{ type: 'category', key: category.key }] }));
    if(await discountOf(await cartWith(car)) !== -1000) return fail('the car in the category');
    if(await discountOf(await cartWith(paint)) !== 0) return fail('a product that is not in it');
    pass('');
  },

  'sales stack as the combine setting says: fixed first, then the added percents, never below the minimum price': async ({ pass, fail }) => {
    await purge();
    const item = await makeProduct({ price: 5000, minimumPrice: 2800, quantity: 9 });
    ok(await createSale({ kind: 'fixed', value: 1000, allProducts: true, stackable: true }));
    ok(await createSale({ kind: 'percent', value: 25, allProducts: true, stackable: true }));
    ok(await createSale({ kind: 'percent', value: 10, allProducts: true, stackable: true }));
    /* $50 less $10, then 35% of $40 ($14), is $26, but the minimum is $28: $22 off. */
    const cart = ok(await getCart({ cartId: await cartWith(item) }));
    if(cart.totals.discountTotal !== -2200 || cart.totals.total !== 2800) return fail(`totals ${JSON.stringify(cart.totals)}`);
    if(!cart.adjustments.every(adjustment => adjustment.data.limited === true)) return fail('the cart is not told the minimum price held it back');

    await purge();
    const plain = await makeProduct({ price: 5000, quantity: 9 });
    ok(await createSale({ kind: 'fixed', value: 1000, allProducts: true, stackable: true }));
    ok(await createSale({ kind: 'percent', value: 25, allProducts: true, stackable: true }));
    ok(await createSale({ kind: 'percent', value: 10, allProducts: true, stackable: true }));
    if(await discountOf(await cartWith(plain)) !== -2400) return fail('without a minimum, $24 off: $26');

    await purge();
    const alone = await makeProduct({ price: 5000, quantity: 9 });
    ok(await createSale({ kind: 'percent', value: 40, allProducts: true, stackable: false }));
    ok(await createSale({ kind: 'percent', value: 25, allProducts: true, stackable: true }));
    ok(await createSale({ kind: 'percent', value: 10, allProducts: true, stackable: true }));
    if(await discountOf(await cartWith(alone)) !== -2000) return fail('a standalone 40% beats 25% and 10% together');
    pass('');
  },

  'a storefront price says a fixed amount, a percent, or both, the way the sales do': async ({ pass, fail }) => {
    await purge();
    const item = await makeProduct({ price: 5000 });
    const sale = ok(await createSale({ kind: 'fixed', value: 200, allProducts: true, stackable: true }));
    let quote = (await quoteProducts([{ productId: item.id, unitPrice: 5000 }]))[item.id];
    if(JSON.stringify(quote.parts) !== JSON.stringify([{ kind: 'fixed', value: 200 }])) return fail(`a fixed sale: ${JSON.stringify(quote)}`);
    ok(await createSale({ kind: 'percent', value: 10, allProducts: true, stackable: true }));
    quote = (await quoteProducts([{ productId: item.id, unitPrice: 5000 }]))[item.id];
    if(JSON.stringify(quote.parts) !== JSON.stringify([{ kind: 'fixed', value: 200 }, { kind: 'percent', value: 10 }]) || quote.salePrice !== 4320) return fail(`both: ${JSON.stringify(quote)}`);
    ok(await deleteSale(sale.id));
    quote = (await quoteProducts([{ productId: item.id, unitPrice: 5000 }]))[item.id];
    if(JSON.stringify(quote.parts) !== JSON.stringify([{ kind: 'percent', value: 10 }])) return fail(`a percent sale: ${JSON.stringify(quote)}`);
    pass('');
  },

  'the storefront price is the cart price, with the real percent saved': async ({ pass, fail }) => {
    await purge();
    const item = await makeProduct({ price: 5000, minimumPrice: 2800 });
    const other = await makeProduct({ price: 999 });
    ok(await createSale({ kind: 'fixed', value: 1000, allProducts: true, stackable: true }));
    ok(await createSale({ kind: 'percent', value: 35, allProducts: true, stackable: true }));
    const quotes = await quoteProducts([{ productId: item.id, unitPrice: 5000 }, { productId: other.id, unitPrice: 999 }, { productId: 'missing', unitPrice: 100 }]);
    const held = quotes[item.id];
    if(!held || held.salePrice !== 2800 || held.off !== 2200 || held.percentOff !== 44 || !held.limited) return fail(`held ${JSON.stringify(held)}`);
    if(JSON.stringify(held.parts) !== JSON.stringify([{ kind: 'fixed', value: 2200 }])) return fail(`a held-back sale says the real amount: ${JSON.stringify(held.parts)}`);
    const small = quotes[other.id];
    if(!small || small.salePrice !== 0 || small.off !== 999) return fail(`a fixed amount larger than the price takes all of it: ${JSON.stringify(small)}`);
    if(quotes.missing) return fail('an unknown product has no quote');
    const cart = ok(await getCart({ cartId: await cartWith(item) }));
    if(cart.totals.total !== held.salePrice) return fail(`the page says ${held.salePrice}, the cart takes ${cart.totals.total}`);
    pass('');
  },

  'an order keeps the discount, counts once when paid, and a refund takes that share back': async ({ pass, fail }) => {
    await purge();
    const item = await makeProduct({ price: 5000, quantity: 5 });
    const sale = ok(await createSale({ kind: 'percent', value: 20, allProducts: true }));
    const cartId = await cartWith(item, 2);
    const { order, payment } = ok(await placeOrder({ cartId, checkoutKey: key().slice(0, 30), billing: BILLING, expectedTotal: 8000 }));
    if(order.discountTotal !== -2000 || order.total !== 8000) return fail(`order ${order.discountTotal} ${order.total}`);
    const line = order.adjustments.find(adjustment => adjustment.type === 'discount');
    if(line.lineId !== order.lines[0].id) return fail('the discount is not kept against its line');

    const before = await db.select().from(kempoDiscountUsage).where(eq(kempoDiscountUsage.saleId, sale.id));
    if(before.length) return fail('an unpaid order was counted');

    await succeed(payment.id);
    ok(await completeOrder(order.id));
    ok(await completeOrder(order.id));
    const [usage] = await db.select().from(kempoDiscountUsage).where(and(eq(kempoDiscountUsage.saleId, sale.id), eq(kempoDiscountUsage.orderId, order.id)));
    if(!usage || usage.amount !== 2000 || usage.units !== 2 || usage.refundedAmount !== 0) return fail(`usage ${JSON.stringify(usage)}`);
    if((await db.select().from(kempoDiscountUsage)).length !== 1) return fail('a second completion counted again');

    const refund = ok(await previewRefund({ orderId: order.id, lines: { [order.lines[0].id]: 1 } }));
    if(refund.amount !== 4000) return fail(`one unit refunds ${refund.amount}, what was paid for it is 4000`);
    ok(await refundOrder(order.id, { lines: { [order.lines[0].id]: 1 }, destination: 'original', reason: 'test' }));
    const [half] = await db.select().from(kempoDiscountUsage).where(eq(kempoDiscountUsage.orderId, order.id));
    if(half.refundedAmount !== 1000) return fail(`half the units back should give back half the discount: ${half.refundedAmount}`);
    pass('');
  },
};
