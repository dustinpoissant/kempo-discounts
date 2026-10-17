# kempo-discounts

Sales and discounts for [kempo](https://github.com/dustinpoissant/kempo): take a percent or a fixed amount off the products, categories and product types you choose, between the dates you choose. It is **Sales and Discounts** in the Marketing menu. Discount **codes** a customer types in are a different extension (kempo-coupons).

It needs **kempo-products** (the catalog) and **kempo-commerce** (the cart and orders), and installs like any kempo extension.

## A sale

A sale is its own thing that products are added to, the Etsy way, not a field on every product. It has:

- **What it takes off**: a percent (1 to 100), or a fixed amount off each one, in the catalog's currency.
- **What it applies to**: every product, or a mix of individual products, whole **categories** (including products added to them later) and product **types**. Credit packs are never discounted.
- **When**: an optional start and end (in your own time zone). Blank is "as soon as it is saved" and "until you stop it".
- **Can be combined**, off by default (see below).
- **Paused**, to stop it without deleting it.
- A **name**, optional and only for you; customers just see "Sale" on the cart.

A sale is *Scheduled*, *Running*, *Ended* or *Paused*, worked out when asked, so nothing needs a timer.

### From a product or a category

On a product's edit page, and on each product category, two buttons:

- **Add to a sale** picks a sale that exists and adds the product (or the whole category) to it.
- **Quick discount** makes a new sale with only the essentials (a percent or an amount, whether it can be combined, optional dates) with this product or category already in it. Open it from the list to change anything else.

## Combining discounts

Each sale is either a **fixed amount** or a **percent**, and says whether it **can be combined** with other discounts (sales here and codes from kempo-coupons). For one line, among the discounts that cover it:

- the ones that can be combined all apply together: every fixed amount comes off the price first, then the percents are added up and taken off what is left. A $50 car with $10 off and a 25% and a 10% sale is $50 - $10 = $40, then 35% of $40 is $14, so **$26**;
- one that cannot be combined applies alone, and the customer gets whichever saves more: that, or all the combinable ones together;
- the price never goes below the product's **minimum price** (kempo-products' "Lowest price after discounts"), or zero without one. Percents round down, so a customer never gets more off than stated.

This is worked out by kempo-commerce, once, for every extension that adds discounts, so a sale and a code follow the same rule. When the minimum price held a discount back, the cart says so.

## What customers see

- **Product cards and pages** show the original price struck through, the price they pay, and the real percent saved (rounded down). It follows the options chosen on a product page. With no sale the price looks as it always did.
- **The cart and checkout** take the discount off the line and show one "Sale" row. The order keeps it against its line, so a later edit or delete of the sale never changes an old order, tax is worked out on what the customer pays, and **a refund of a line returns what was paid for it**.

## What it saved

The sales list shows, for each sale, how many **orders** it was used on and how much it **saved** customers, net of refunds. An order counts once, when it is paid; a refund takes back that share of the discount. The numbers are this extension's own tally, which survives a sale being deleted.

## Permissions and groups

| Permission | Allows |
|---|---|
| `discounts:view` | See the sales and their results |
| `discounts:manage` | Create, change, pause, copy and delete sales, and add products and categories to them |

Groups: `kempo-discounts:viewer` and `kempo-discounts:manager`.

## HTTP API

Under `/discounts/api`:

| Route | Needs | Does |
|---|---|---|
| `GET sales` (`state`) | `discounts:view` | List sales, with state, orders and saved |
| `POST sales` | `discounts:manage` | Create one: `{ name, kind, value, stackable, allProducts, targets, startsAt, endsAt, paused }` |
| `GET`, `PATCH`, `DELETE sales/<id>` | view, manage | Read, change, delete |
| `POST sales/<id>/duplicate` | `discounts:manage` | A paused copy |
| `POST sales/<id>/targets` | `discounts:manage` | Add `{ targets: [{ type: 'product' \| 'category' \| 'type', key }] }`; says how many were new |
| `POST quote` | no one | `{ lines: [{ productId, unitPrice }] }` answers `{ quotes: { [productId]: { unitPrice, salePrice, off, percentOff, limited } } }` for products with a sale |

## Building on it

```javascript
import { getSales, quoteProducts } from 'kempo-discounts/sdk';
```

Every function returns `[error, data]`. `getSale`, `getSales`, `createSale`, `updateSale`, `deleteSale`, `duplicateSale`, `addTargets`, `stateOf`, and `quoteProducts(entries)` (what a storefront shows) are exported.

### Events

Notifications, after the change is stored; nothing they do can undo it.

| Event | Payload |
|---|---|
| `kempo-discounts:sale:created` | `{ sale, actor }` |
| `kempo-discounts:sale:updated` | `{ sale, previous, actor }` |
| `kempo-discounts:sale:deleted` | `{ sale, actor }` |

### What it uses

It answers three kempo-commerce hooks: `totals:discounts` (pushes one row for each running sale that covers a line, saying what it is and leaving the amount to commerce), `order:paid` (counts the sales on the order) and `refund:issued` (takes back the refunded share). It fills kempo-products' `products-card-price` and `products-detail-price` slots, and its admin locations `products-admin-product-actions` and `products-admin-category-actions`.

## Not here yet

Order-wide offers ("10% off orders over $100"), free shipping, buy-X-get-Y, per-customer sales, and limits on how often a sale may be used.

## Tests

`npm test` runs everything in an in-memory database. `npm run link:local` links the sibling checkouts into `node_modules` first (kempo-commerce is not on npm yet); `npm run test:integration` runs it all on a real Postgres (`docker-compose.yml`).
