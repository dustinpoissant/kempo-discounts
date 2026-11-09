import assert from 'node:assert/strict';
import { slugFromName, slugProblem, MAX_SLUG } from '../server/utils/saleSlug.js';

/*
  A sale's address: made from its name, kept to letters, numbers and single dashes, and never one the site uses.
*/

export default {
  'an address is made from the name, in lower case with dashes': async ({ pass, fail }) => {
    try {
      assert.equal(slugFromName('Summer Sale!'), 'summer-sale');
      assert.equal(slugFromName('  Café   Deals  '), 'cafe-deals');
      assert.equal(slugFromName(''), '');
      assert.equal(slugFromName(undefined), '');
      assert.ok(slugFromName('a'.repeat(200)).length <= MAX_SLUG);
      pass('');
    } catch(error) {
      fail(error.message);
    }
  },

  'an address that is not letters, numbers and single dashes is refused, and a reserved one is too': async ({ pass, fail }) => {
    try {
      assert.equal(slugProblem('summer-sale'), undefined);
      assert.ok(slugProblem('Summer'));
      assert.ok(slugProblem('summer--sale'));
      assert.ok(slugProblem('-sale'));
      assert.ok(slugProblem(''));
      assert.ok(slugProblem('api'));
      assert.ok(slugProblem('a'.repeat(MAX_SLUG + 1)));
      pass('');
    } catch(error) {
      fail(error.message);
    }
  }
};
