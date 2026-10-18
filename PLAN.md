# kempo-discounts: Sales and Discounts

Status: **built** (data, rules, commerce integration, admin, storefront, usage, tests, README). Not yet checked in a browser on the demo, and not released. Plan kept as the design record.

## What it is

Automatic price reductions you set up in the admin, with no code: "20% off all candles until Sunday",
"$10 off every model car". It is the **Sales and Discounts** item in the Marketing menu (Etsy's name for it).
Discount **codes** a customer types in are a different extension, kempo-coupons, and are not part of this.

Out of scope for the first release: order-level offers ("10% off orders over $100"), free shipping (kempo-shipping),
buy-X-get-Y, per-customer or per-group sales, usage limits, reports.

## Decisions to confirm

1. **A sale is its own entity that products, categories and types are added to** (the Etsy way), with two shortcuts from the
   product and category pages: "Add to a discount" and "Quick discount". Per-product only in v1 (never "the whole order").
2. **Fixed-amount and percent sales, and stacking is a choice per sale** (see "Stacking"): off by default. When sales combine, fixed amounts come off first, then the added percents come off what is left.
3. **Requires kempo-products and kempo-commerce** (a sale price you cannot buy at is no use).
4. **Credit packs** (credit-only products) are discounted like any other product when a sale covers them.
5. **The product page and cards show the sale:** original price struck through, the sale price, and a badge with the real saving.
6. **A minimum price per product, built into kempo-products** and honoured by every discount (see "Minimum price").

## How a sale works

A sale is its own thing that products are added to (the Etsy way), not a field on each product. It has: **how much** (a
percent, or a fixed amount off each unit, in the catalog's currency), **what it applies to** (the whole catalog, or a mix
of individual products, whole categories and product types, like Etsy's listings plus shop sections), an optional **start**
and **end**, **paused** or not, and
**can be combined** or not. It has an optional name for the admin list (made up from its settings when blank, e.g.
"20% off Candles"); customers see only "Sale" on the cart line. It is *Scheduled*, *Running*, *Ended* or *Paused*, worked
out when asked, so nothing needs a timer.

On a line: discounts are worked out **per unit, on the unit price after the chosen options**, then multiplied by the
quantity. The order they are taken in is in "Stacking".

## Stacking

Each sale is either a **fixed amount off** or a **percent off**, and has **"Can be combined with other discounts"**, off by
default. For one line, among the discounts that match it:

- the ones that allow combining **all apply together**: first every **fixed amount** is taken off the price, then the
  **percents are added up** and taken off what is left (a $50 car with a $10 fixed sale and a 25% and a 10% promo:
  $50 - $10 = $40, then 35% of $40 is $14, so it costs $26);
- one that does not allow combining applies **alone**;
- when both exist, the customer gets whichever saves more: the best standalone discount, or all the combinable ones together;
- the price never goes below the product's **minimum price** (see below), or zero when it has none, and a percent over 100
  is refused when the sale is saved;
- percent amounts are rounded down (`floor`), so rounding never takes off more than was stated (the same rule as
  kempo-products' credits), and each row's share of a combined percent is rounded down with the leftover cent on the first row.

Why fixed first: "$10 off every model car" suits a $25 car and a $140 one equally, with no per-price percentages to set up.

The repeat-customer case: the fall sale (combinable) plus a "Thank You" code (combinable) gives code holders both, and
everyone else only the sale. This works for **sales and coupons together** because the rule lives in kempo-commerce,
not here. A handler no longer works out its own amount: it pushes a row that says what it is,
`data: { kind: 'fixed' | 'percent', value, stackable }`, and commerce works out every row's amount in the order above and keeps the
winning set per line. So kempo-coupons gets the same rule for free, and the storefront price (which shows sales only, never
codes) calls the same function.

## Minimum price (a price floor)

A product can have a **minimum price**: the lowest its unit price (after the chosen options) may be discounted to, so
stacked sales and a forgotten old code can never sell it at a loss. A $25 car that costs you $4 to make and ship gets a
$5 minimum; however many discounts stack, it sells for $5, and you still make $1.

- It is a field on the product, so it lives in **kempo-products** (a "Lowest price after discounts" field on the product
  form, in the API, and in import and export), and every discount extension honours it: sales, coupons, anything that
  pushes a discount row. kempo-commerce's discount resolver reads it per line.
- **The customer is told the truth.** The product page badge and the cart row show the discount actually taken (a "-20%"
  is worked out from the real sale price, never from the sale's setting), and when the floor held a discount back, the cart
  row says so ("Limited by the minimum price") with a store-wide disclaimer text you can edit (setting `price_floor_notice`).
  A sale you advertise yourself can say "Up to 25% off".
- Legality: a minimum price is ordinary retail practice, and "up to X% off" with the terms stated is how sales are normally
  worded. What gets shops in trouble is advertising a discount the customer does not actually get, which the real-saving
  badge and the cart note avoid. Some places (the EU, the UK) also regulate the "was" price shown beside a sale price. That is
  a separate rule from this one, and I am not a lawyer, so check it for the countries you sell to.
- It only limits discounts. It never raises a price: a product already priced under its minimum is simply not discounted.

## How it plugs in

- **Cart, checkout, orders:** kempo-commerce's `totals:discounts` hook. For each line we push one adjustment
  `{ type: 'discount', code: 'sale:<id>', label: 'Sale', lineId, taxable: false, source: 'kempo-discounts', data: { kind, value, stackable } }`;
  commerce fills in the `amount` (see Stacking). Commerce already sums, shows (cart and admin order), taxes (a line discount
  lowers that line's tax) and stores it on the order, so a later edit or delete of a sale never changes an old order. A sale
  starting or ending between cart and payment is caught by commerce's existing "the total changed" check.
- **Storefront prices:** an element `k-discounts-price` filling kempo-products' `price` slot on cards and the product
  page (the locations `products-card-price` and `products-detail-price`). It asks `POST /discounts/api/quote` (batched
  per page) with each product's current unit price, so options and the price shown on the page stay right. With no sale
  it draws the normal price itself, from the card's `priceText` or the page's `priceLine`.
- **One function does the math**: commerce's resolver. The quote endpoint and the hook both call it, so what the page shows is what the cart takes.

## Usage tracking

Each sale shows **how many orders used it** and **how much it saved customers**. Commerce already has the hooks, so this needs
nothing new there:

- `kempo-commerce:order:paid`: the order arrives with its adjustment rows. For every row whose `source` is `kempo-discounts`,
  record `(sale, order)` once: the units discounted and the amount taken off. A unique key on sale + order makes a
  redelivered hook, a retried payment or the recovery sweep count once. Orders that fail or are cancelled never reach it, so
  they never count.
- `kempo-commerce:refund:issued`: the refund's lines say which units came back, so the saved amount is reduced by that share of
  the discount (a full refund takes the whole order's use back out). Counts are therefore **net of refunds**.
- The admin list shows used (orders) and saved (money) per sale, and the sale's page lists the orders. The numbers come from
  this extension's own tally, which keeps the order id so each can link to its order.
- Because it is a tally, a later **limit** ("first 100 orders", "once per customer") has what it needs; it is not in v1.

## Changes in kempo-commerce this needs (their own commit and release)

1. **Work out the discount rows per line** as in "Stacking" (fixed first, then the added percents; best standalone vs all
   combinable; never below the minimum price or zero), after every `totals:discounts` handler has run, so the order of
   extensions no longer matters. An exported function does it, so the storefront quote uses the same one. Tests: the $50 car
   example, a lone fixed, a lone percent, two percents, an exclusive beating a combination and the reverse, a fixed amount
   larger than the price, the minimum price holding, rounding with several rows.
2. **Refunds respect discounts.** Refunds today give back a line's full `lineTotal + tax`. With a line discount that returns
   **more than the customer paid** for that line. Fix: a line's refundable amount is `lineTotal + its discount adjustments + tax`,
   shared out the same way as now (the last unit takes the rounding). Order-wide adjustments are not produced in v1. Tests:
   refund one unit and all units of a discounted line, with and without tax.

## A change in kempo-products this needs (its own commit and release)

A nullable `minimumPrice` column (smallest currency unit) with an `ALTER` in `install.js`, validated like `price` (a whole
number, not above the price), a field on the product form, the API, import and export (a CSV column), README and CHANGELOG,
tests. Commerce carries it onto each cart line so its resolver can read it.

**Two new places for other extensions to add admin buttons** (today there are only product tabs), built the same way as the
storefront ones (compose with slots, never inject; see AGENTS.md "Compose with slots"):

- **Product edit page.** `k-products-form` gets a named `actions` slot in its action bar, and the page puts
  `<location name="products-admin-product-actions" />` directly among the form's children (no wrapper). A contribution is a
  server-side `*.global.html` with an element carrying `slot="actions"`, which finds its product with
  `this.closest('k-products-form')` (the form already exposes the saved product and fires `product-saved`). On the new-product page
  there is no saved product yet, so the buttons wait for `product-saved`.
- **Each category.** The category list's actions cell holds a small item element (`k-products-category-actions`, with the
  category as a property and a named `actions` slot). The page declares **one** `<template>` containing
  `<location name="products-admin-category-actions" />`, and the list clones it into each item as slotted children (once per
  item, cached in a `WeakMap`; the item knows nothing about templates). A contribution finds its category with
  `closest('k-products-category-actions')`.
- **Scripts.** The page loads contributions' modules from a `products-admin-scripts` location *outside* any `<template>`
  (the same trick as `products-scripts`), and the server templating's rules apply: no `{{ }}` placeholders for item data inside
  the template (the component renders data), and never a literal `<location>` in a comment.
- Names are prefixed with the owner and documented as public API in kempo-products' README and docs, with a composition test
  per location, as the storefront ones have.

kempo-discounts then contributes three small things, all through these locations: a **product actions** element (the two
buttons), a **category actions** element (the same two), and the shared dialogs, which it defines once.

## Data

- `kempoDiscountSale`: id, name (optional), kind (`percent` | `fixed`), value, stackable, `allProducts` (bool), targets
  (jsonb list of `{ type: 'product' | 'category' | 'type', key }`), startsAt, endsAt (both nullable), paused (bool), created,
  updated. A product is covered if the sale is for all products, or it is listed, or it is in a listed category or type.
- `kempoDiscountUsage`: id, saleId, orderId, units, amount, refundedAmount, created; unique on (saleId, orderId). Kept after a sale is deleted, so past orders still make sense.
- Orders keep their own copy of every discount through the adjustment rows.
- Deleting a product or category leaves a sale pointing at nothing; the admin flags it, the math ignores it.

## Admin

`/admin/extension/kempo-discounts/`: a table (name, discount, applies to, dates, state badge), **New sale**, edit, pause or
resume, duplicate, delete. The full form has the fields above, a picker to add products, categories and types, and a live
example ("a $50.00 product becomes $40.00").

**From a product or a category** (two buttons on the product edit page, and the same two on each product category):
- **Add to a discount** opens a dialog to pick an existing sale; the product (or category) is added to it.
- **Quick discount** opens a dialog with only the essentials (percent or fixed amount, the amount, can be combined, and
  optional dates); it creates the sale with this product or category already in it. The full form is where the rest is set.
Both end back on the page they started from, with a message and a link to the sale. Adding something already in the sale
says so and changes nothing.

Money inputs reuse kempo-products'
`k-products-money`; start and end are date-time inputs stored in UTC and shown in the admin's local time. Permissions
`discounts:view` and `discounts:manage`; groups `kempo-discounts:viewer` and `:manager`.

## Public surface (for other extensions)

SDK: `getSales`, `getSale`, `createSale`, `updateSale`, `deleteSale`, `quoteLines(lines)` (what the hook uses).
Events: `kempo-discounts:sale:created`, `updated`, `deleted`. Admin `<location>`s are not added until someone needs one.

## Build order

1. Data layer, rules and SDK, with unit tests (windows, targets, kind and value validation).
2. The kempo-products minimum price, then the commerce resolver and refund fix, then the discounts hook, with tests through
   a real cart, order and refund.
3. Admin pages, then the two buttons and their dialogs on the product and category pages.
4. The storefront price element and the quote API, and the usage tally (the two commerce hooks) with its admin columns.
5. README, CHANGELOG, icon and config tests, check in the demo, then release (first manual npm publish is yours).

## Risks

- The price element must look exactly like the normal price when there is no sale; the card's and the page's
  public getters should be enough, and if not, expose one more getter in kempo-products.
- Credits that cover a share of a price (`creditPercent`) are worked out on the full price today; whether they should
  use the sale price is decided in step 2 and written down.
- The product page's search-engine data (structured data price) still shows the regular price in v1.
- A minimum price is one number per product, so a product whose options change its price a lot may want a floor per
  option combination later; v1 uses one floor on the final unit price.
