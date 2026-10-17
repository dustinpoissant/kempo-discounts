import authorize from '../../../../../server/utils/authorize.js';
import { duplicateSale } from '../../../../../server/utils/sales.js';

export default async (request, response) => {
  const [authError, auth] = await authorize(request, 'manage');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const [error, sale] = await duplicateSale(request.params.id, { actor: auth.userId });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.status(201).json({ sale });
};
