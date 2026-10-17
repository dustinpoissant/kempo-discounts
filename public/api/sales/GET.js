import authorize from '../../../server/utils/authorize.js';
import { getSales } from '../../../server/utils/sales.js';

export default async (request, response) => {
  const [authError] = await authorize(request, 'view');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const [error, data] = await getSales({ state: request.query.state || undefined });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.json(data);
};
