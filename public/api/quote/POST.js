import { quoteProducts } from '../../../server/utils/quote.js';

/*
  What running sales do to some prices, for a storefront to show: `{ lines: [{ productId, unitPrice }] }`
  answers `{ quotes: { [productId]: { unitPrice, salePrice, off, percentOff, limited } } }`, leaving out products
  with no sale. Public, like the product list: it only does arithmetic on what it is given and changes nothing.
*/
export default async (request, response) => {
  const lines = Array.isArray(request.body?.lines) ? request.body.lines.slice(0, 200) : [];
  const entries = lines
    .map(line => ({ productId: String(line?.productId ?? ''), unitPrice: Number(line?.unitPrice) }))
    .filter(line => line.productId && Number.isSafeInteger(line.unitPrice) && line.unitPrice > 0);
  response.json({ quotes: await quoteProducts(entries) });
};
