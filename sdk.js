/*
  Server-side entry point for what builds on sales.

    import { getSales, quoteProducts } from 'kempo-discounts/sdk';

  Every function returns `[error, data]` with `error = { code, msg }`, and none throws. These are data operations
  with no permission checks of their own: the routes under public/api decide who may do what.

  A sale is a discount that products, categories and types are added to. It reduces a price through kempo-commerce's
  `totals:discounts` hook, which works out all the discounts on a line together; see the README.
*/
export {
  getSale,
  getSales,
  createSale,
  updateSale,
  deleteSale,
  duplicateSale,
  addTargets,
  stateOf,
} from './server/utils/sales.js';

export { quoteProducts, discountRowsFor } from './server/utils/quote.js';
export { EVENTS } from './server/utils/events.js';
