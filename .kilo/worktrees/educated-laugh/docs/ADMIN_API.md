# Commerce API

All responses use `{ success, data, meta? }` or `{ success: false, error: { code, message, details?, requestId } }`. Prices are integer paise.

## Public

- `GET /api/v1/catalog/products` — search/filter/cursor pagination
- `GET /api/v1/catalog/products/:slug` — published PDP data
- `GET /api/v1/storefront/home` — active scheduled CMS blocks
- `GET /api/v1/taxonomy` — published categories, notes and occasions
- `GET /api/v1/products/:id/reviews` — approved reviews
- `GET /health` — API and MongoDB health/latency

## Authentication

- `POST /api/auth/login` — creates an 8-hour HttpOnly admin session and double-submit CSRF cookie
- `POST /api/auth/logout`
- `GET /api/auth/me`

Admin mutations require both the session cookie and `X-CSRF-Token` header. Every route checks a named permission.

## Administration

- `GET|POST /api/admin/products`
- `GET|PATCH /api/admin/products/:id` — optimistic version check
- `POST /api/admin/products/:productId/variants/:variantId/price` — validates price and records history
- `POST /api/admin/inventory/adjust` — transactional stock adjustment with mandatory reason
- `GET /api/admin/inventory/transactions`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status` — state-machine validated
- `GET /api/admin/payments`
- `GET /api/admin/customers`
- `GET|PATCH /api/admin/reviews`
- `GET|POST|PATCH /api/admin/resources/:resource` — controlled CMS/marketing resources
- `GET /api/admin/dashboard`
- `GET /api/admin/search?q=`
- `GET /api/admin/audit`
- `GET /api/admin/reports/sales.csv` — bounded export

## Important status codes

- `401`: missing/expired/revoked session
- `403`: CSRF or permission failure
- `409`: inventory, order transition or optimistic-version conflict
- `422`: schema/business validation failure

