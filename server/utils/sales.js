import crypto from 'crypto';
import db from 'kempo/server/db/index.js';
import { eq, desc, sql } from 'drizzle-orm';
import { kempoDiscountSale, kempoDiscountUsage } from '../db/schema.js';
import { EVENTS, notify } from './hooks.js';

const newId = () => crypto.randomBytes(8).toString('hex');

const MAX_NAME = 100;
const MAX_TARGETS = 500;
const MAX_KEY = 200;
export const TARGET_TYPES = ['product', 'category', 'type'];

/*
  Where a sale stands, worked out when asked so nothing needs a timer: paused, scheduled (it starts later), ended,
  or running.
*/
export const stateOf = (sale, now = new Date()) => {
  if(sale.paused) return 'paused';
  if(sale.startsAt && new Date(sale.startsAt) > now) return 'scheduled';
  if(sale.endsAt && new Date(sale.endsAt) <= now) return 'ended';
  return 'running';
};

const toDate = (value, label) => {
  if(value === null || value === undefined || value === '') return [null, null];
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return [{ code: 400, msg: `${label} is not a date` }, null];
  return [null, date];
};

/* The list of things a sale covers, cleaned: known types only, trimmed keys, no repeats. */
export const normalizeTargets = input => {
  if(!Array.isArray(input)) return [{ code: 400, msg: 'targets must be a list' }, null];
  if(input.length > MAX_TARGETS) return [{ code: 400, msg: `A sale can list at most ${MAX_TARGETS} products, categories and types` }, null];
  const seen = new Set();
  const targets = [];
  for(const raw of input){
    const type = String(raw?.type ?? '');
    const key = String(raw?.key ?? '').trim();
    if(!TARGET_TYPES.includes(type)) return [{ code: 400, msg: `A target is a product, a category or a type, not "${type}"` }, null];
    if(!key || key.length > MAX_KEY) return [{ code: 400, msg: 'Every target needs a key' }, null];
    if(seen.has(`${type}:${key}`)) continue;
    seen.add(`${type}:${key}`);
    targets.push({ type, key });
  }
  return [null, targets];
};

/*
  Checks what was supplied for a sale and returns the values to store. `existing` is the sale being updated, because
  the rules cross fields: a percent is at most 100, and a sale ends after it starts.
*/
const validate = (input, existing = null) => {
  const values = {};

  if(input.name !== undefined){
    const name = String(input.name ?? '').trim();
    if(name.length > MAX_NAME) return [{ code: 400, msg: `A name must be ${MAX_NAME} characters or fewer` }, null];
    values.name = name;
  }

  const kind = input.kind ?? existing?.kind;
  if(input.kind !== undefined && !['percent', 'fixed'].includes(input.kind)) return [{ code: 400, msg: 'A sale takes a percent or a fixed amount off' }, null];
  if(!kind) return [{ code: 400, msg: 'Say whether the sale takes a percent or a fixed amount off' }, null];
  if(input.kind !== undefined) values.kind = input.kind;

  if(input.value !== undefined || input.kind !== undefined || !existing){
    const raw = input.value ?? existing?.value;
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if(!Number.isSafeInteger(value) || value < 1) return [{ code: 400, msg: kind === 'percent' ? 'The percent must be a whole number from 1 to 100' : 'The amount must be a whole number of the smallest currency unit, above zero' }, null];
    if(kind === 'percent' && value > 100) return [{ code: 400, msg: 'The percent must be a whole number from 1 to 100' }, null];
    values.value = value;
  }

  for(const flag of ['stackable', 'allProducts', 'paused']){
    if(input[flag] === undefined) continue;
    if(typeof input[flag] !== 'boolean') return [{ code: 400, msg: `${flag} must be true or false` }, null];
    values[flag] = input[flag];
  }

  if(input.targets !== undefined){
    const [error, targets] = normalizeTargets(input.targets);
    if(error) return [error, null];
    values.targets = targets;
  }

  for(const property of ['startsAt', 'endsAt']){
    if(input[property] === undefined) continue;
    const [error, date] = toDate(input[property], property === 'startsAt' ? 'The start' : 'The end');
    if(error) return [error, null];
    values[property] = date;
  }
  const startsAt = values.startsAt !== undefined ? values.startsAt : existing?.startsAt ?? null;
  const endsAt = values.endsAt !== undefined ? values.endsAt : existing?.endsAt ?? null;
  if(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return [{ code: 400, msg: 'A sale has to end after it starts' }, null];

  return [null, values];
};

const withState = (sale, usage = null) => ({ ...sale, state: stateOf(sale), orders: usage?.orders ?? 0, units: usage?.units ?? 0, saved: usage?.saved ?? 0 });

/* How many orders each sale was used on, the units it was taken off, and what it saved after refunds. */
const usageBySale = async () => {
  const rows = await db.select({
    saleId: kempoDiscountUsage.saleId,
    orders: sql`count(*)::int`,
    units: sql`coalesce(sum(${kempoDiscountUsage.units}), 0)::int`,
    saved: sql`coalesce(sum(${kempoDiscountUsage.amount} - ${kempoDiscountUsage.refundedAmount}), 0)::int`,
  }).from(kempoDiscountUsage).groupBy(kempoDiscountUsage.saleId);
  return new Map(rows.map(row => [row.saleId, row]));
};

export const getSale = async id => {
  if(!id) return [{ code: 400, msg: 'id is required' }, null];
  try {
    const [sale] = await db.select().from(kempoDiscountSale).where(eq(kempoDiscountSale.id, String(id)));
    if(!sale) return [{ code: 404, msg: 'Sale not found' }, null];
    return [null, withState(sale, (await usageBySale()).get(sale.id))];
  } catch {
    return [{ code: 500, msg: 'Failed to retrieve the sale' }, null];
  }
};

/* Every sale, newest first, with its state and what it did. `state` narrows to one of paused, scheduled, running and ended. */
export const getSales = async ({ state } = {}) => {
  try {
    const rows = await db.select().from(kempoDiscountSale).orderBy(desc(kempoDiscountSale.created), desc(kempoDiscountSale.id));
    const usage = await usageBySale();
    const sales = rows.map(row => withState(row, usage.get(row.id))).filter(sale => !state || sale.state === state);
    return [null, { items: sales, total: sales.length }];
  } catch {
    return [{ code: 500, msg: 'Failed to retrieve the sales' }, null];
  }
};

export const createSale = async (data = {}, { actor = '' } = {}) => {
  const [invalid, values] = validate(data);
  if(invalid) return [invalid, null];
  const now = new Date();
  try {
    const [sale] = await db.insert(kempoDiscountSale).values({
      id: newId(), name: '', stackable: false, allProducts: false, targets: [], startsAt: null, endsAt: null, paused: false,
      ...values, created: now, updated: now,
    }).returning();
    await notify(EVENTS.saleCreated, { sale, actor });
    return [null, withState(sale)];
  } catch {
    return [{ code: 500, msg: 'Failed to create the sale' }, null];
  }
};

export const updateSale = async (id, data = {}, { actor = '' } = {}) => {
  const [lookupError, existing] = await getSale(id);
  if(lookupError) return [lookupError, null];
  const [invalid, values] = validate(data, existing);
  if(invalid) return [invalid, null];
  if(!Object.keys(values).length) return [null, existing];
  try {
    const [sale] = await db.update(kempoDiscountSale).set({ ...values, updated: new Date() }).where(eq(kempoDiscountSale.id, existing.id)).returning();
    await notify(EVENTS.saleUpdated, { sale, previous: existing, actor });
    return getSale(sale.id);
  } catch {
    return [{ code: 500, msg: 'Failed to update the sale' }, null];
  }
};

export const deleteSale = async (id, { actor = '' } = {}) => {
  const [lookupError, existing] = await getSale(id);
  if(lookupError) return [lookupError, null];
  try {
    await db.delete(kempoDiscountSale).where(eq(kempoDiscountSale.id, existing.id));
    await notify(EVENTS.saleDeleted, { sale: existing, actor });
    return [null, { id: existing.id }];
  } catch {
    return [{ code: 500, msg: 'Failed to delete the sale' }, null];
  }
};

/* A copy of a sale, paused, so a seasonal sale can be run again with new dates without being rebuilt. */
export const duplicateSale = async (id, { actor = '' } = {}) => {
  const [lookupError, existing] = await getSale(id);
  if(lookupError) return [lookupError, null];
  const { name, kind, value, stackable, allProducts, targets, startsAt, endsAt } = existing;
  return createSale({ name: name ? `${name} (copy)` : '', kind, value, stackable, allProducts, targets, startsAt, endsAt, paused: true }, { actor });
};

/* Adds products, categories or types to a sale. Returns how many were new, so a caller can say when nothing was. */
export const addTargets = async (id, targets, { actor = '' } = {}) => {
  const [lookupError, existing] = await getSale(id);
  if(lookupError) return [lookupError, null];
  const [invalid, wanted] = normalizeTargets(targets);
  if(invalid) return [invalid, null];
  const have = new Set(existing.targets.map(target => `${target.type}:${target.key}`));
  const fresh = wanted.filter(target => !have.has(`${target.type}:${target.key}`));
  if(!fresh.length) return [null, { sale: existing, added: 0 }];
  const [error, sale] = await updateSale(id, { targets: [...existing.targets, ...fresh] }, { actor });
  return error ? [error, null] : [null, { sale, added: fresh.length }];
};
