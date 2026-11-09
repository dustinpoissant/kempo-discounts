import assert from 'node:assert/strict';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import publicSale from '../server/utils/publicSale.js';

/*
  The sale banner: a page sees only what a banner shows, and the widget is declared with the files that back it.
*/

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default {
  'a public sale carries its name, what it takes off and when it ends, and nothing else': async ({ pass, fail }) => {
    try {
      const sale = { id: 'abc', name: 'Summer', kind: 'percent', value: 20, stackable: true, allProducts: false, targets: [{ type: 'product', key: 'x' }], startsAt: null, endsAt: '2026-12-01T00:00:00.000Z', paused: false, state: 'running', orders: 3, saved: 500 };
      assert.deepEqual(Object.keys(publicSale(sale)).sort(), ['endsAt', 'id', 'kind', 'name', 'slug', 'startsAt', 'value']);
      assert.equal(publicSale(sale).value, 20);
      pass('');
    } catch(error) {
      fail(error.message);
    }
  },

  'the widget is declared with its files, and its settings choose the sales and say what each shows': async ({ pass, fail }) => {
    try {
      const config = JSON.parse(await readFile(path.join(root, 'kempo-config.json'), 'utf8'));
      const [widget] = config.page_widgets;
      assert.equal(widget.key, 'sale-banner');
      assert.deepEqual(widget.attributes.map(attribute => attribute.name), ['sales', 'show-end']);
      for(const file of [widget.page_component, widget.editor_component, widget.settings_component]){
        const local = file.replace(/^\/discounts\//, 'public/').replace(/^\/admin\/extension\/kempo-discounts\//, 'admin/');
        await readFile(path.join(root, local));
      }
      pass('');
    } catch(error) {
      fail(error.message);
    }
  }
};
