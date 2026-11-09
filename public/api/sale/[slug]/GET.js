import { getSaleBySlug } from '../../../../server/utils/sales.js';
import publicSale from '../../../../server/utils/publicSale.js';
import saleProducts from '../../../../server/utils/saleProducts.js';

/*
  One sale, for its public page: what it takes off, when it runs, and the slugs of the products it covers. A paused sale
  is not published, so it answers as not found.
*/
export default async (request, response) => {
  const [error, sale] = await getSaleBySlug(request.params?.slug);
  if(error || sale.state === 'paused') return response.status(404).json({ error: 'There is no sale at that address' });
  response.json({ sale: { ...publicSale(sale), state: sale.state }, slugs: await saleProducts(sale) });
};
