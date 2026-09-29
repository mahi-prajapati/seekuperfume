# MongoDB schema and integrity notes

## Referenced entities

Reusable or independently growing data is referenced: admins/roles, products/categories/collections/notes/occasions, customers, orders, payments, refunds, returns and CMS resources.

## Embedded snapshots

- Product variants and media are embedded because their lifecycle is owned by the product.
- Cart items are embedded and always repriced at checkout.
- Order items, addresses, coupon and payment snapshots are embedded for historical accuracy.
- Timelines and small internal-note arrays are embedded; unbounded analytics/audit streams use separate collections.

## Indexes

- Unique: product SKU/slug, variant SKU, order number, gateway IDs, coupon code and CMS keys.
- Compound: catalog publication/facets, order status/date and approved product reviews.
- Text: product name, SKU, descriptions and tags.
- TTL: raw analytics after 400 days and system logs after 30 days.

## Transactions

Inventory adjustment and future checkout orchestration use MongoDB transactions. Production must use a replica set. Never edit variant inventory directly; use the inventory service so the ledger and stock value commit atomically.

## Migration policy

Every document-shape change receives an idempotent script under `commerce-service/scripts/migrations/<sequence>-<name>.ts`. Scripts record completion in a `schemaMigrations` collection and must support dry-run output before production execution.

