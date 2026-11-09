import { getSales } from '../../../server/utils/sales.js';
import publicSale from '../../../server/utils/publicSale.js';

/*
  The sales running now, for a page's sale banner. Open to everyone, so it answers with only what a page shows (see publicSale).
  A banner picks some of them by id.
*/
export default async (request, response) => {
  const [error, data] = await getSales({ state: 'running' });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.json({ items: data.items.map(publicSale) });
};
