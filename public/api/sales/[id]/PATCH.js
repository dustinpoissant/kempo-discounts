import authorize from '../../../../server/utils/authorize.js';
import { updateSale } from '../../../../server/utils/sales.js';

export default async (request, response) => {
  const [authError, auth] = await authorize(request, 'manage');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const body = request.body || {};
  const data = {};
  for(const property of ['name', 'kind', 'value', 'stackable', 'allProducts', 'targets', 'startsAt', 'endsAt', 'paused']){
    if(body[property] !== undefined) data[property] = body[property];
  }
  const [error, sale] = await updateSale(request.params.id, data, { actor: auth.userId });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.json({ sale });
};
