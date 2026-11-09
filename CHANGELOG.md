# Changelog

All notable changes to `kempo-discounts` are documented in this file.

## [Unreleased]

## [0.2.0] - 2026-11-09

Requires kempo 4.11.0 or later.

### Added

- **Every sale has its own page, at `/sales/<address>`.** It shows the sale's name, what it takes off, when it runs, and the products it covers, as the product list with their sale prices. A sale's address is made from its name when it is created and kept if the name changes; it can be changed on the sale form, and the form links to the page. Paused sales are not published (not found), and ended or not-yet-started sales say so. The page reads `GET /discounts/api/sale/<address>`. Restart the server, and run the update so the new `slug` column and its unique index are made (existing sales get addresses from their names).
- **A Sale banner page widget.** It shows the sales running now, or only the ones chosen in its settings (ticked from the sales that exist, in the order ticked). Each strip links to the sale's own page. Each strip can show the date the sale ends. Colours and alignment come from the Styles tab. It shows nothing while no sale is to be shown. Text around the banner is a Text widget.
- **A product's price says what the sale takes off the way the sale says it:** a fixed amount shows as "-$2.00" (it used to be turned into a percent), a percent as "-10%", and both as "-$2.00 and -10%", the fixed amount first because it comes off first. When the product's minimum price held something back, the one amount that really comes off is shown instead. `POST quote` answers a `parts` list for each product (`[{ kind: 'fixed' | 'percent', value }]`), and `percentOff` is still there.
- **Sales.** A percent or a fixed amount off, for every product or for products and categories added to the sale, between optional dates, paused or not. Listed, made, changed, copied and deleted under **Marketing > Sales and Discounts**.
- **Combining.** A sale says whether it can be combined with other discounts. Combinable ones apply together (fixed amounts first, then the added percents off what is left), one that cannot be combined applies alone, the customer gets whichever saves more, and a product's minimum price is never broken. Worked out by kempo-commerce for every extension that adds discounts.
- **Cart rows named after the sale:** "Sale: Name (10% Off)", or "Sale: $2.00 Off" when the sale has no name.
- **Add to a sale** and **Quick discount** buttons on a product's edit page and on each product category.
- **Sale prices on the storefront:** the original price struck through, the price paid and the real percent saved, on product cards and pages, following the options chosen.
- **Usage:** how many orders each sale was used on and what it saved customers, net of refunds.
- Permissions `discounts:view` and `discounts:manage`, groups `kempo-discounts:viewer` and `kempo-discounts:manager`, the SDK, and the events `kempo-discounts:sale:created`, `updated` and `deleted`.

Needs kempo 4.7.0, kempo-products 0.2.0 (the minimum price and the admin button locations) and a kempo-commerce that combines discounts.

### Changed

- The `kempo-ui` peer dependency is now `>=1.0.0`.
- The `kempo` peer dependency is now `>=4.11.0`.

## [0.1.2] - 2026-10-26
### Changed
- The sales list is a kempo-ui table. A row opens the sale, and Edit, Pause or resume, Duplicate and Delete are row controls.
- The category sale buttons are row controls, Add to a sale and Quick discount, placed after each category's own controls.
- Requires kempo 4.9.7 (the admin lists use kempo-ui tables).
