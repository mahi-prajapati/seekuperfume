# Admin and MongoDB deployment

1. Provision a private host/network and persistent encrypted volumes.
2. Set strong unique Mongo root/application, Redis, JWT and cookie secrets outside Compose.
3. Start the Mongo replica set and create the least-privileged application user.
4. Run the service build, migrations and seed command; create the first super administrator interactively.
5. Put Nginx/TLS in front of Django and the commerce service. Expose neither MongoDB nor Redis publicly.
6. Set exact CORS/storefront origins and secure cookies. Register Razorpay webhooks on HTTPS endpoints.
7. Schedule encrypted `mongodump` backups, copy them off-host, apply retention and perform quarterly restore drills.
8. Monitor `/health`, disk space, replica-set state, slow queries, queue depth and failed payment reconciliation.

## Cutover checklist

- Import legacy Django records with stable `legacyId` values.
- Compare SKU/product/customer/order counts.
- Recalculate and compare inventory and every historical order total.
- Run storefront reads against the Mongo API in staging.
- Run checkout/payment/refund/order-transition tests.
- Freeze Django catalog mutations, take final backup, import delta and switch `COMMERCE_API_URL`.
- Keep the relational data read-only through the agreed rollback window.

## Backup verification

`npm run backup` uses `mongodump`; `npm run restore -- <path>` uses `mongorestore --drop`. A backup is not considered valid until restored into an isolated database and checked for collection counts, indexes and sampled order totals.
