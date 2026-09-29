# Admin + MongoDB implementation plan

## Existing-system audit

The current repository is a Django 5.2 modular monolith with server-rendered templates, vanilla JavaScript interactions, SQLite development storage, Django sessions/admin, and Razorpay verification. The storefront is visually complete and should remain the presentation layer.

The MongoDB requirement conflicts with Django ORM being the current source of truth. The migration strategy therefore uses a strangler pattern:

1. Introduce `commerce-service`, a TypeScript/Express/Mongoose API and admin application.
2. Make MongoDB authoritative for catalog, pricing, inventory, CMS, orders, payments and engagement.
3. Add an environment-controlled Django commerce adapter. Local tests retain the ORM provider; production points at the Mongo API.
4. Import existing Django seed data once, reconcile counts/totals, then disable direct Django mutations.

## Runtime topology

```text
Browser storefront ──> Django presentation/BFF ──> Commerce API ──> MongoDB replica set
Admin browser ───────────────────────────────────> Commerce API ──> Redis/cache + queue
                                                        └────────> Razorpay / media / email
```

MongoDB binds to the private container/network interface only. Transactions require a replica set, including single-node production installations.

## Admin wireframe

```text
[Sidebar]                       [Search / Command palette] [Admin]
 Dashboard     [Greeting + date]           [+ Quick action]
 Catalog       [Revenue] [Orders] [AOV] [Customers]
 Sales         [Sales chart / time range]
 Inventory     [Order pipeline]
 Customers     [Low stock] [Top products]
 Marketing     [Recent orders]
 Storefront    [Reviews] [System health]
 Reports
 System
```

Product editor: sticky identity/status/action bar, twelve grouped sections, variant editor, media manager, SEO preview and publish controls. Lists preserve filters in URL and use cursor pagination.

## Core invariants

- Prices use integer paise; totals are calculated server-side.
- Order items contain immutable product/price/tax/discount snapshots.
- Inventory changes only through transaction-backed inventory services and append-only transactions.
- Price mutations create price-history records.
- Payment/refund state changes require verified gateway data.
- Order transitions follow an explicit state machine; overrides require a reason and audit entry.
- All privileged mutations require authenticated RBAC permission and emit an audit log.
- Published catalog and homepage writes invalidate tagged cache keys.
- Destructive records are archived where financial/history integrity matters.

## Delivery slices

1. Platform: configuration, DB connection, security middleware, auth/RBAC, response/error contract.
2. Commerce: catalog/variants/media, pricing history, inventory ledger, orders/payments/refunds, coupons.
3. Operations: CMS, reviews, customers, newsletter/messages, analytics/reports, health and audit logs.
4. Admin UI: dashboard, catalog, inventory, orders, reviews, CMS and system surfaces.
5. Integration: Django adapter, migration/seed/backup scripts, Docker replica set, tests and API docs.

## Migration and rollback

- Migration scripts are versioned and idempotent in `commerce-service/scripts/migrations`.
- Existing relational IDs are retained as `legacyId` during import.
- Cutover requires record-count, SKU, inventory and order-total reconciliation.
- Rollback switches `COMMERCE_PROVIDER=django` before any new Mongo-only orders are accepted.
- After cutover, Django tables are read-only migration evidence until the retention window expires.

