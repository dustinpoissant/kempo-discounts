import { seedDatabase } from './helpers/db.js';
import { purge, makeProduct, makeCategory } from './helpers/shop.js';
import { createSale, updateSale, deleteSale, getSale, getSales, duplicateSale, addTargets, stateOf } from '../server/utils/sales.js';
import { activeSales, covers } from '../server/utils/match.js';

/*
  A sale on its own: what is accepted, where it stands (scheduled, running, ended, paused), what it covers, and the
  shortcuts that add to it.
*/

const ok = ([error, value]) => {
  if(error) throw new Error(`unexpected error: ${error.code} ${error.msg}`);
  return value;
};

const refused = ([error, value], code) => {
  if(!error) throw new Error('expected an error');
  if(value !== null) throw new Error('an error should come with no value');
  if(code && error.code !== code) throw new Error(`expected ${code}, got ${error.code}: ${error.msg}`);
  return error;
};

const HOUR = 3600000;
const at = hours => new Date(Date.now() + hours * HOUR).toISOString();

export const beforeAll = async () => {
  await seedDatabase();
  await purge();
};

export const afterAll = async () => {
  await purge();
};

export default {
  'a percent or a fixed amount is accepted, anything else is refused': async ({ pass, fail }) => {
    const percent = ok(await createSale({ kind: 'percent', value: 20 }));
    if(percent.state !== 'running' || percent.stackable || percent.allProducts || percent.name !== '') return fail(`defaults ${JSON.stringify(percent)}`);
    ok(await createSale({ kind: 'fixed', value: 1000, name: 'Ten off', stackable: true }));
    refused(await createSale({ kind: 'percent', value: 101 }), 400);
    refused(await createSale({ kind: 'percent', value: 0 }), 400);
    refused(await createSale({ kind: 'percent', value: 12.5 }), 400);
    refused(await createSale({ kind: 'fixed', value: -5 }), 400);
    refused(await createSale({ kind: 'free', value: 5 }), 400);
    refused(await createSale({ value: 5 }), 400);
    refused(await createSale({ kind: 'fixed', value: 100, name: 'x'.repeat(101) }), 400);
    refused(await createSale({ kind: 'fixed', value: 100, stackable: 'yes' }), 400);
    pass('');
  },

  'a sale has to end after it starts, and dates must be dates': async ({ pass, fail }) => {
    refused(await createSale({ kind: 'percent', value: 10, startsAt: at(2), endsAt: at(1) }), 400);
    refused(await createSale({ kind: 'percent', value: 10, startsAt: 'someday' }), 400);
    const sale = ok(await createSale({ kind: 'percent', value: 10, startsAt: at(1), endsAt: at(5) }));
    refused(await updateSale(sale.id, { endsAt: at(0) }), 400);
    const longer = ok(await updateSale(sale.id, { endsAt: at(9) }));
    if(new Date(longer.endsAt) <= new Date(longer.startsAt)) return fail('the end moved');
    const open = ok(await updateSale(sale.id, { endsAt: null }));
    if(open.endsAt !== null) return fail('an empty end means it runs until stopped');
    pass('');
  },

  'where a sale stands is worked out from its dates and whether it is paused': async ({ pass, fail }) => {
    const now = new Date();
    const states = {
      running: { startsAt: new Date(now.getTime() - HOUR), endsAt: new Date(now.getTime() + HOUR) },
      scheduled: { startsAt: new Date(now.getTime() + HOUR), endsAt: null },
      ended: { startsAt: null, endsAt: new Date(now.getTime() - HOUR) },
      paused: { paused: true, startsAt: null, endsAt: null },
    };
    for(const [expected, fields] of Object.entries(states)){
      if(stateOf({ paused: false, ...fields }, now) !== expected) return fail(`${expected}`);
    }
    if(stateOf({ paused: true, startsAt: new Date(now.getTime() + HOUR), endsAt: null }, now) !== 'paused') return fail('paused wins over a start in the future');
    if(stateOf({ paused: false, startsAt: null, endsAt: null }, now) !== 'running') return fail('no dates runs until stopped');
    const sale = ok(await createSale({ kind: 'percent', value: 10, startsAt: at(3) }));
    if(sale.state !== 'scheduled') return fail('a stored sale reports its state');
    if(ok(await getSales({ state: 'scheduled' })).items.length < 1) return fail('the list filters by state');
    pass('');
  },

  'only sales that are running are active': async ({ pass, fail }) => {
    await purge();
    ok(await createSale({ kind: 'percent', value: 10, name: 'now' }));
    ok(await createSale({ kind: 'percent', value: 10, name: 'later', startsAt: at(2) }));
    ok(await createSale({ kind: 'percent', value: 10, name: 'over', endsAt: at(-2) }));
    ok(await createSale({ kind: 'percent', value: 10, name: 'stopped', paused: true }));
    const names = (await activeSales()).map(sale => sale.name);
    if(names.length !== 1 || names[0] !== 'now') return fail(JSON.stringify(names));
    pass('');
  },

  'a sale covers the whole catalog, listed products, categories and types, and a credit pack like any other product': async ({ pass, fail }) => {
    const category = await makeCategory('Model cars');
    const car = await makeProduct({ categories: [category.key] });
    const other = await makeProduct();
    const pack = await makeProduct({ price: 500, creditsOnly: false });
    const everything = { allProducts: true, targets: [] };
    if(!covers(everything, car) || !covers(everything, other)) return fail('the whole catalog');
    if(!covers({ allProducts: false, targets: [{ type: 'product', key: car.id }] }, car) || covers({ allProducts: false, targets: [{ type: 'product', key: car.id }] }, other)) return fail('a listed product');
    if(!covers({ allProducts: false, targets: [{ type: 'category', key: category.key }] }, car) || covers({ allProducts: false, targets: [{ type: 'category', key: category.key }] }, other)) return fail('a category');
    if(!covers({ allProducts: false, targets: [{ type: 'type', key: 'vehicle' }] }, { ...car, type: 'vehicle' })) return fail('a type');
    const credits = { ...pack, creditsOnly: true };
    if(!covers(everything, credits)) return fail('every product includes credit packs');
    if(!covers({ allProducts: false, targets: [{ type: 'product', key: credits.id }] }, credits)) return fail('a credit pack that is named is discounted');
    if(covers({ allProducts: false, targets: [{ type: 'product', key: car.id }] }, credits)) return fail('a credit pack that is not named is not');
    if(covers({ allProducts: false, targets: [] }, car)) return fail('an empty sale covers nothing');
    pass('');
  },

  'targets are cleaned, and adding to a sale says how many were new': async ({ pass, fail }) => {
    const sale = ok(await createSale({ kind: 'percent', value: 10 }));
    refused(await updateSale(sale.id, { targets: [{ type: 'colour', key: 'red' }] }), 400);
    refused(await updateSale(sale.id, { targets: [{ type: 'product', key: ' ' }] }), 400);
    refused(await updateSale(sale.id, { targets: 'all' }), 400);
    const first = ok(await addTargets(sale.id, [{ type: 'product', key: 'p1' }, { type: 'product', key: 'p1' }, { type: 'category', key: 'cars' }]));
    if(first.added !== 2 || first.sale.targets.length !== 2) return fail(`first ${JSON.stringify(first)}`);
    const again = ok(await addTargets(sale.id, [{ type: 'category', key: 'cars' }]));
    if(again.added !== 0 || again.sale.targets.length !== 2) return fail('adding what is there changes nothing');
    refused(await addTargets('missing', [{ type: 'product', key: 'p' }]), 404);
    pass('');
  },

  'a sale can be duplicated (paused) and deleted': async ({ pass, fail }) => {
    const sale = ok(await createSale({ kind: 'fixed', value: 500, name: 'Fall', stackable: true, targets: [{ type: 'category', key: 'cars' }] }));
    const copy = ok(await duplicateSale(sale.id));
    if(copy.id === sale.id || copy.name !== 'Fall (copy)' || !copy.paused || copy.state !== 'paused') return fail(`copy ${JSON.stringify(copy)}`);
    if(copy.value !== 500 || !copy.stackable || copy.targets.length !== 1) return fail('the copy keeps what the sale did');
    ok(await deleteSale(sale.id));
    refused(await getSale(sale.id), 404);
    refused(await deleteSale(sale.id), 404);
    pass('');
  },
};
