import { getProducts } from 'kempo-products/sdk';
import { resolveUnitDiscounts } from 'kempo-commerce/sdk';
import { activeSales, salesFor } from './match.js';

const MAX_PRODUCTS = 200;

/* The products by id, as kempo-products returns them. */
const loadProducts = async ids => {
  const unique = [...new Set(ids)].slice(0, MAX_PRODUCTS);
  if(!unique.length) return new Map();
  const [error, found] = await getProducts({ ids: unique, limit: unique.length });
  return error ? new Map() : new Map(found.items.map(product => [product.id, product]));
};

const asDiscounts = sales => sales.map(sale => ({ kind: sale.kind, value: sale.value, stackable: sale.stackable }));

/*
  The discount rows to put on a cart or an order for `lines` (`{ id, productId }`): one for each running sale
  that covers a line's product. A row says what the sale is (`kind`, `value`, `stackable`) and leaves the amount
  to kempo-commerce, which works out every row on a line together, in order, within the product's minimum price.
*/
export const discountRowsFor = async lines => {
  const sales = await activeSales();
  if(!sales.length || !lines.length) return [];
  const products = await loadProducts(lines.map(line => line.productId));
  const rows = [];
  for(const line of lines){
    for(const sale of salesFor(sales, products.get(line.productId))){
      rows.push({
        type: 'discount', code: `sale:${sale.id}`, label: 'Sale', lineId: line.id, taxable: false, source: 'kempo-discounts',
        data: { kind: sale.kind, value: sale.value, stackable: sale.stackable, saleId: sale.id },
      });
    }
  }
  return rows;
};

/*
  What running sales do to a price, for showing on a storefront: for each `{ productId, unitPrice }` the sale
  price, what comes off, and the real percent saved (rounded down, so it never says more than the customer gets).
  A product with no sale is simply left out. It is the same function the cart uses, so what a page shows is what
  the cart takes. Codes are never included, since a customer has to enter one.
*/
export const quoteProducts = async entries => {
  const sales = await activeSales();
  const quotes = {};
  if(!sales.length) return quotes;
  const products = await loadProducts(entries.map(entry => entry.productId));
  for(const { productId, unitPrice } of entries.slice(0, MAX_PRODUCTS)){
    const product = products.get(productId);
    const matching = salesFor(sales, product);
    if(!matching.length || !Number.isSafeInteger(unitPrice) || unitPrice <= 0) continue;
    const { total, limited } = resolveUnitDiscounts({ unitPrice, minimumPrice: product.minimumPrice ?? null, discounts: asDiscounts(matching) });
    if(total <= 0) continue;
    quotes[productId] = { unitPrice, salePrice: unitPrice - total, off: total, percentOff: Math.floor(total * 100 / unitPrice), limited };
  }
  return quotes;
};
