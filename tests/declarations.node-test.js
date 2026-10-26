import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EVENTS } from '../server/utils/events.js';

/*
  What this extension declares to kempo agrees with the files that back it: every hook points at a file, every
  permission a route asks for is declared, every event is in the README, and the pieces that other extensions'
  locations load exist.
*/

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(path.join(root, file), 'utf8');

const walk = async dir => {
  const files = [];
  for(const entry of await readdir(dir, { withFileTypes: true })){
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
};

export default {
  'every hook in kempo-config.json points at a file': async ({ pass, fail }) => {
    const config = JSON.parse(await read('kempo-config.json'));
    for(const [event, file] of Object.entries(config.hooks)){
      if(!existsSync(path.join(root, file))) return fail(`${event} -> ${file} is missing`);
      if(!event.startsWith('kempo-commerce:')) return fail(`${event} is not a commerce event`);
    }
    if(!config.dependencies.includes('kempo-commerce') || !config.dependencies.includes('kempo-products')) return fail('it needs products and commerce');
    pass('');
  },

  'every permission a route asks for is declared, and the groups only use declared ones': async ({ pass, fail }) => {
    const config = JSON.parse(await read('kempo-config.json'));
    const declared = new Set(config.permissions.map(permission => permission.name));
    for(const file of await walk(path.join(root, 'public', 'api'))){
      for(const [, name] of (await readFile(file, 'utf8')).matchAll(/authorize\(request, '([\w:]+)'\)/g)){
        if(!declared.has(`discounts:${name}`)) return fail(`${path.relative(root, file)} asks for discounts:${name}`);
      }
    }
    for(const group of config.groups){
      for(const name of group.permissions){
        if(name !== 'system:admin:access' && !declared.has(name)) return fail(`${group.name} uses ${name}`);
      }
    }
    pass('');
  },

  'every event this extension fires is in the README': async ({ pass, fail }) => {
    const readme = await read('README.md');
    for(const event of Object.values(EVENTS)){
      if(!readme.includes(event)) return fail(`${event} is not in the README`);
    }
    pass('');
  },

  'what the other extensions\' locations load is here': async ({ pass, fail }) => {
    const admin = await read('admin/product-actions.global.html');
    for(const [, file] of admin.matchAll(/src="\/admin\/extension\/kempo-discounts\/(components\/[\w.]+)"/g)){
      if(!existsSync(path.join(root, 'admin', file))) return fail(`admin/${file} is loaded but missing`);
    }
    const storefront = await read('public/price.global.html');
    for(const [, file] of storefront.matchAll(/src="\/discounts\/(components\/[\w.]+)"/g)){
      if(!existsSync(path.join(root, 'public', file))) return fail(`public/${file} is loaded but missing`);
    }
    if(!/location="products-admin-product-actions"[^>]*><k-discounts-product-actions slot="actions">/.test(admin)) return fail('the product buttons name their slot');
    if(!/location="products-admin-category-actions"[^>]*><k-discounts-category-sale-action slot="after" action="add">/.test(admin)) return fail('the category buttons name their slot');
    if(!/location="products-card-price"><k-discounts-price slot="price">/.test(storefront) || !/location="products-detail-price"><k-discounts-price slot="price">/.test(storefront)) return fail('the price names its slot');
    pass('');
  },

  'every module in the package parses': async ({ pass, fail }) => {
    const { spawnSync } = await import('child_process');
    for(const dir of ['server', 'hooks', 'public', 'admin']){
      for(const file of await walk(path.join(root, dir))){
        if(!file.endsWith('.js')) continue;
        const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
        if(result.status !== 0) return fail(`${path.relative(root, file)}: ${result.stderr.split('\n')[0]}`);
      }
    }
    pass('');
  },
};
