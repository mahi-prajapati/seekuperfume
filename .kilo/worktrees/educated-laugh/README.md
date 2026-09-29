# SEEKUPERFUMES

A responsive premium fragrance storefront built with Django, server-rendered HTML, CSS and vanilla JavaScript. It includes a CMS/admin foundation, catalog filtering, instant search, authenticated wishlist, persistent guest carts, server-priced checkout, inventory-safe orders, private order tracking, moderated reviews, newsletter and contact persistence, gifting and a fragrance finder.

The repository now also contains the production MongoDB control plane in `commerce-service/`: a TypeScript/Mongoose API and premium operational admin with RBAC, variant pricing, price history, traceable inventory, controlled order transitions, CMS, reviews, customers, reporting, audit logs and health monitoring. See `docs/ADMIN_MONGODB_PLAN.md` for the staged source-of-truth cutover.

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py createsuperuser
python manage.py runserver
```

Open `http://127.0.0.1:8000/`; admin is at `/admin/`.

## Test

```powershell
python manage.py check
python manage.py test
```

## Production configuration

Copy `.env.example` into your deployment secret store. Set `DEBUG=0`, a long random `SECRET_KEY`, exact `ALLOWED_HOSTS`, and a PostgreSQL `DATABASE_URL`. Configure TLS at the load balancer or Nginx and add `SECURE_SSL_REDIRECT=1` at infrastructure level.

Run `python manage.py collectstatic --noinput` and `python manage.py migrate` during release. The included Docker Compose stack provides PostgreSQL and Gunicorn for a deployment-like local environment.

Online payment selection activates Razorpay hosted checkout when both account keys are configured; COD remains functional without third-party credentials. The browser callback and webhook are signature-verified before a payment is marked captured. Register `/payments/razorpay/webhook/` in Razorpay and provide `RAZORPAY_WEBHOOK_SECRET` before launch. No client-supplied price is accepted by the order service.

## Content operations

Use Django admin to manage products, notes, occasions, orders, reviews, homepage content, subscribers and messages. Uploaded assets are stored under `media/` by default; production should use S3-compatible storage and a CDN. Search currently uses indexed SQL fields with a debounced endpoint; the service boundary is ready to replace with Typesense or Meilisearch at larger catalog scale.

## Brand assets

The hero and product photography are original AI-generated assets created for this project. Their prompts intentionally use the SEEKUPERFUMES palette and prohibit copied branding, logos and text.
