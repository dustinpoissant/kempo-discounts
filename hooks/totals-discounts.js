import { discountRowsFor } from '../server/utils/quote.js';

/*
  kempo-commerce asks for discounts while it works out a cart's totals. Each running sale that covers a line is
  pushed as a row that says what it is; commerce works out the amounts, together, per line.
*/
export default async ({ lines, adjustments }) => {
  adjustments.push(...await discountRowsFor(lines ?? []));
};
