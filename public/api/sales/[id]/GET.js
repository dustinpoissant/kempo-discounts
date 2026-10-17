import authorize from '../../../../server/utils/authorize.js';
import { getSale } from '../../../../server/utils/sales.js';

export default async (request, response) => {
  const [authError] = await authorize(request, 'view');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const [error, sale] = await getSale(request.params.id);
  if(error) return response.status(error.code).json({ error: error.msg });
  response.json({ sale });
};
