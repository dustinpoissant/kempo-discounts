/*
  Events this extension fires, for other extensions to subscribe to in their kempo-config.json `hooks`.
  They are notifications: they run after the change is stored and nothing they do can undo it.
*/
export const EVENTS = {
  saleCreated: 'kempo-discounts:sale:created',
  saleUpdated: 'kempo-discounts:sale:updated',
  saleDeleted: 'kempo-discounts:sale:deleted',
};
