import authorize from '../../../../../server/utils/authorize.js';
import { addTargets } from '../../../../../server/utils/sales.js';

/* Adds products, categories or types to a sale: `{ targets: [{ type, key }] }`. `added` is how many were new. */
export default async (request, response) => {
  const [authError, auth] = await authorize(request, 'manage');
  if(authError) return response.status(authError.code).json({ error: authError.msg });

  const [error, result] = await addTargets(request.params.id, (request.body || {}).targets, { actor: auth.userId });
  if(error) return response.status(error.code).json({ error: error.msg });
  response.json(result);
};
