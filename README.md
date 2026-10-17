# kempo-discounts

**Not built yet.** This package only reserves a place for it: a **Sales and Discounts** entry in the **Marketing** group of the admin menu, which opens a page saying it is coming soon.

Time-limited price reductions on products, with start and end dates.

It exists so the admin menu can be seen as it will look once the extension is built, and so the entry belongs to the extension that will own it instead of to kempo-commerce. It has no pages, API, database tables, permissions or settings, and it is `private` in `package.json` so it cannot be published by accident.

When this is built: drop `private`, add what it needs to `files`, give the page its real content, and set up the release workflow the other extensions use (copy it from kempo-store-credit).
