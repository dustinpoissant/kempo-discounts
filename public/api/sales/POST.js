import authorize from '../../../server/utils/authorize.js';
import { createSale } from '../../../server/utils/sales.js';

export default async (request, response) => {
  const [authError, auth] = await authorize(request, 'manage');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const { name, kind, value, stackable, allProducts, targets, startsAt, endsAt, paused } = request.body || {};
  const [error, sale] = await createSale({ name, kind, value, stackable, allProducts, targets, startsAt, endsAt, paused }, { actor: auth.userId });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.status(201).json({ sale });
};
