import { triggerHook } from 'kempo/server/sdk.js';

import { EVENTS } from './events.js';

export { EVENTS };

/* Tells subscribers something happened. A handler that throws is logged and stops nothing. */
export const notify = async (event, data) => {
  try {
    await triggerHook(event, data);
  } catch(error) {
    console.error(`[kempo-discounts] "${event}" notification failed:`, error);
  }
};
