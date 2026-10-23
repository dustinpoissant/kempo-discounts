# Changelog

All notable changes to `kempo-discounts` are documented in this file.

## [Unreleased]

### Added

- **A product's price says what the sale takes off the way the sale says it:** a fixed amount shows as "-$2.00" (it used to be turned into a percent), a percent as "-10%", and both as "-$2.00 and -10%", the fixed amount first because it comes off first. When the product's minimum price held something back, the one amount that really comes off is shown instead. `POST quote` answers a `parts` list for each product (`[{ kind: 'fixed' | 'percent', value }]`), and `percentOff` is still there.
- **Sales.** A percent or a fixed amount off, for every product or for products and categories added to the sale, between optional dates, paused or not. Listed, made, changed, copied and deleted under **Marketing > Sales and Discounts**.
- **Combining.** A sale says whether it can be combined with other discounts. Combinable ones apply together (fixed amounts first, then the added percents off what is left), one that cannot be combined applies alone, the customer gets whichever saves more, and a product's minimum price is never broken. Worked out by kempo-commerce for every extension that adds discounts.
- **Cart rows named after the sale:** "Sale: Name (10% Off)", or "Sale: $2.00 Off" when the sale has no name.
- **Add to a sale** and **Quick discount** buttons on a product's edit page and on each product category.
- **Sale prices on the storefront:** the original price struck through, the price paid and the real percent saved, on product cards and pages, following the options chosen.
- **Usage:** how many orders each sale was used on and what it saved customers, net of refunds.
- Permissions `discounts:view` and `discounts:manage`, groups `kempo-discounts:viewer` and `kempo-discounts:manager`, the SDK, and the events `kempo-discounts:sale:created`, `updated` and `deleted`.

Needs kempo 4.7.0, kempo-products 0.2.0 (the minimum price and the admin button locations) and a kempo-commerce that combines discounts.
