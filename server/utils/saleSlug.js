import { eq, isNull, or } from 'drizzle-orm';
import db from 'kempo/server/db/index.js';
import { kempoDiscountSale } from '../db/schema.js';

/*
  A sale's address: /sales/<slug>. Made from its name when it is created, then kept, so renaming a sale never breaks a link
  that is out there. The words the sales folder itself uses are reserved.
*/
export const MAX_SLUG = 80;
export const RESERVED_SLUGS = ['api', 'components', 'sdk', 'sdk.js', 'index', 'admin'];
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugFromName = name => String(name ?? '')
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, MAX_SLUG)
  .replace(/-+$/g, '');

/* The error for a slug that cannot be an address, or undefined when it can. */
export const slugProblem = slug => {
  if(!slug || slug.length > MAX_SLUG || !SLUG_PATTERN.test(slug)) return 'An address uses letters, numbers and single dashes, such as summer-sale';
  if(RESERVED_SLUGS.includes(slug)) return `"${slug}" is used by the site, so choose another address`;
  return undefined;
};

/* The first address from `base` that no other sale has: base, then base-2, base-3 and so on. */
export const freeSlug = async (base, exceptId = null) => {
  for(let attempt = 1; attempt <= 500; attempt++){
    const slug = attempt === 1 ? base : `${base}-${attempt}`.slice(0, MAX_SLUG);
    const [taken] = await db.select({ id: kempoDiscountSale.id }).from(kempoDiscountSale).where(eq(kempoDiscountSale.slug, slug)).limit(1);
    if(!taken || taken.id === exceptId) return slug;
  }
  return `${base}-${Date.now()}`.slice(0, MAX_SLUG);
};

/* Gives an address to every sale that has none (sales made before addresses existed). */
export const backfillSaleSlugs = async () => {
  const rows = await db.select().from(kempoDiscountSale).where(or(isNull(kempoDiscountSale.slug), eq(kempoDiscountSale.slug, '')));
  for(const row of rows){
    const slug = await freeSlug(slugFromName(row.name) || 'sale');
    await db.update(kempoDiscountSale).set({ slug }).where(eq(kempoDiscountSale.id, row.id));
  }
};
