import { displayMoney } from '/products/sdk.js';

/*
  Words and values the admin pages share: what a sale is called, what it covers, and the date inputs.
*/

export const STATE_LABELS = { running: 'Running', scheduled: 'Scheduled', ended: 'Ended', paused: 'Paused' };
export const STATE_CLASSES = { running: 'bg-success', scheduled: 'bg-primary', ended: '', paused: 'bg-warning' };

/* "20% off" or "$10.00 off". */
export const discountText = (sale, config) => sale.kind === 'percent'
  ? `${sale.value}% off`
  : `${displayMoney(sale.value, config.currency, config.decimals)} off`;

/* What a sale is called: its name when it has one, otherwise what it does. */
export const saleLabel = (sale, config) => sale.name || discountText(sale, config);

/* What a sale covers, in a few words: "All products" or "3 products, 1 category". */
export const coverText = sale => {
  if(sale.allProducts) return 'All products';
  const count = type => sale.targets.filter(target => target.type === type).length;
  const parts = [];
  if(count('product')) parts.push(`${count('product')} product${count('product') === 1 ? '' : 's'}`);
  if(count('category')) parts.push(`${count('category')} ${count('category') === 1 ? 'category' : 'categories'}`);
  return parts.join(', ') || 'Nothing yet';
};

/* The dates, as the admin reads them: "Oct 17 to Oct 24", "from Oct 17", "until Oct 24" or "No dates". */
export const whenText = sale => {
  const show = date => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if(sale.startsAt && sale.endsAt) return `${show(sale.startsAt)} to ${show(sale.endsAt)}`;
  if(sale.startsAt) return `from ${show(sale.startsAt)}`;
  if(sale.endsAt) return `until ${show(sale.endsAt)}`;
  return 'No dates';
};

/* A date for a `datetime-local` input (the browser's own time zone), and back to the UTC the server stores. */
export const toLocalInput = date => {
  if(!date) return '';
  const value = new Date(date);
  const pad = number => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

export const fromLocalInput = text => text ? new Date(text).toISOString() : null;

/* What taking this discount off a price comes to, for the example under the form (a single sale on its own). */
export const exampleText = (kind, value, config, unit = 5000) => {
  if(!Number.isSafeInteger(value) || value < 1 || (kind === 'percent' && value > 100)) return '';
  const off = kind === 'percent' ? Math.floor(unit * value / 100) : Math.min(value, unit);
  const money = minor => displayMoney(minor, config.currency, config.decimals);
  return `A ${money(unit)} product becomes ${money(unit - off)}.`;
};
