import authorize from '../../../../server/utils/authorize.js';
import { deleteSale } from '../../../../server/utils/sales.js';

export default async (request, response) => {
  const [authError, auth] = await authorize(request, 'manage');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const [error] = await deleteSale(request.params.id, { actor: auth.userId });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.json({ deleted: true });
};
