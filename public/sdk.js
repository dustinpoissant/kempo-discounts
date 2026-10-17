const BASE = '/discounts/api';

const req = async (method, path, data) => {
  const opts = { method, headers: {} };
  if(data !== undefined && method !== 'GET'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  try {
    const res = await fetch(path, opts);
    const json = await res.json().catch(() => ({}));
    if(!res.ok) return [{ code: res.status, msg: json.error || 'An error occurred' }, null];
    return [null, json];
  } catch {
    return [{ code: 503, msg: 'Network error' }, null];
  }
};

const enc = encodeURIComponent;

/*
  The browser's way to the sales API. Every call resolves to [error, data]. Reading needs `discounts:view`
  and changing needs `discounts:manage`; only `quote` is open to everyone.
*/
export const getSales = ({ state } = {}) => req('GET', `${BASE}/sales${state ? `?state=${enc(state)}` : ''}`);
export const getSale = id => req('GET', `${BASE}/sales/${enc(id)}`);
export const createSale = data => req('POST', `${BASE}/sales`, data);
export const updateSale = (id, data) => req('PATCH', `${BASE}/sales/${enc(id)}`, data);
export const deleteSale = id => req('DELETE', `${BASE}/sales/${enc(id)}`);
export const duplicateSale = id => req('POST', `${BASE}/sales/${enc(id)}/duplicate`, {});

/* Adds `[{ type: 'product' | 'category' | 'type', key }]` to a sale. Resolves with how many were new. */
export const addToSale = (id, targets) => req('POST', `${BASE}/sales/${enc(id)}/targets`, { targets });

/*
  What running sales do to a price. Asks are batched: everything asked for in the same moment (every card on a
  page) goes in one request, and an answer is kept for a minute. Resolves to the quote, or null when there is no sale.
*/
const waiting = new Map();
const answers = new Map();
let timer = null;
const KEEP = 60000;

const flush = async () => {
  timer = null;
  const batch = [...waiting.entries()];
  waiting.clear();
  const [error, data] = await req('POST', `${BASE}/quote`, { lines: batch.map(([, entry]) => ({ productId: entry.productId, unitPrice: entry.unitPrice })) });
  for(const [key, entry] of batch){
    const quote = error ? null : data.quotes?.[entry.productId] ?? null;
    answers.set(key, { quote, at: Date.now() });
    for(const resolve of entry.resolvers) resolve(quote);
  }
};

export const quote = (productId, unitPrice) => {
  const key = `${productId}:${unitPrice}`;
  const known = answers.get(key);
  if(known && Date.now() - known.at < KEEP) return Promise.resolve(known.quote);
  return new Promise(resolve => {
    const entry = waiting.get(key) ?? { productId, unitPrice, resolvers: [] };
    entry.resolvers.push(resolve);
    waiting.set(key, entry);
    timer ??= setTimeout(flush, 0);
  });
};
