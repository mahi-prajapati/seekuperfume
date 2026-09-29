# SEEKUPERFUMES build plan

## Product intent

SEEKUPERFUMES is a light, editorial fragrance house. The experience moves through **discover → explore → understand → trust → gift → connect**, while keeping purchase actions fast and clear.

## Sitemap and route map

- Storefront: `/`, `/shop/`, `/best-sellers/`, `/new-arrivals/`, `/shop/<facet>/`
- Product and discovery: `/products/<slug>/`, `/search/`, `/fragrance-finder/`
- Gifting: `/gifting/`, `/bundles/`
- Commerce: `/cart/`, `/checkout/`, `/order-success/<number>/`, `/track-order/`
- Customer: `/account/`, `/wishlist/`, Django authentication routes
- Brand/support: `/about/`, `/contact/`, `/faq/`, `/journal/`, `/careers/`
- Operations: `/admin/`, `/health/`, `/sitemap.xml`, `/robots.txt`
- JSON actions: `/api/search/`, `/api/cart/*`, `/api/wishlist/toggle/`, `/api/newsletter/`, `/api/finder/`

## Homepage wireframe

```text
[OFFER STRIP]
[MENU]             [SEEKUPERFUMES]       [SEARCH] [ACCOUNT] [BAG]
[PRIMARY NAV]
[EDITORIAL HERO: COPY | ORIGINAL CAMPAIGN IMAGE]
[QUICK DISCOVERY FILTERS]
[BEST SELLERS: 4 PRODUCT CARDS]
[SHOP THE MOMENT: TABS + PRODUCT GRID]
[GENDER: HIM | HER | UNISEX]
[OCCASION MOSAIC]
[NOTES: HORIZONTAL DISCOVERY]
[WHY WE SEEK: STORY]
[GIFTING EDIT: PRODUCT-LED IMAGE + CTA]
[FRAGRANCE FINDER: 3-STEP QUIZ]
[THE SEEK PROMISE]
[REVIEWS]
[SOCIAL GALLERY]
[NEWSLETTER]
[LARGE MULTI-COLUMN FOOTER]
```

## Key secondary wireframes

```text
SHOP       [breadcrumb] [title/count] [filters] [sort] [4→2 col grid] [pagination]
PRODUCT    [gallery] [badge/title/rating/price/size/qty/actions] [note pyramid] [details/reviews]
SEARCH     [overlay input] [suggested terms] [instant results]
GIFTING    [editorial intro] [gift products] [bundle builder]
CART       [line items/quantity] [coupon/gift] [server-calculated summary] [checkout]
CHECKOUT   [contact/address/delivery/payment/review] [sticky order summary]
TRACK      [order + email] [verified timeline] [items/support]
ACCOUNT    [profile nav] [orders/wishlist/addresses/reviews]
CONTACT    [contact channels] [validated form]
ADMIN      [Django admin] [catalog/orders/content/reviews/subscribers/messages]
```

## Architecture

```text
HTML templates + CSS + vanilla JS
             ↓ fetch + CSRF
Django views/services (modular monolith)
             ↓
Django ORM → SQLite in development / PostgreSQL via DATABASE_URL in production
             ↘ payment provider abstraction (Razorpay-ready)
```

`store` owns catalog, cart, checkout, orders, content, and customer engagement. Financial totals and inventory are calculated only on the server. Session carts support guests and are attached to authenticated users when available.

## Data model

- Taxonomy: Category, FragranceNote, Occasion, Collection
- Catalog: Product, ProductImage, ProductVariant, Inventory
- Commerce: Cart, CartItem, Coupon, Order, OrderItem, Payment
- Engagement: WishlistItem, Review, Subscriber, ContactMessage
- CMS: HeroSlide, HomepageSection, SocialPost
- Governance: UserProfile/role, AuditLog

Indexes cover slugs, SKU, publication/merchandising flags, gender/family, order number/email, and search-oriented fields.

## Security and operations

- Django password hashing, session cookies, CSRF, clickjacking protection, secure production cookie settings.
- POST-only mutation endpoints, input validation, server-side totals, atomic inventory changes.
- Order tracking requires order number plus matching email.
- Review moderation and admin role groups.
- Razorpay is isolated behind a provider interface; mock provider is explicit in development.
- Health endpoint, structured logging, Docker/Gunicorn, environment-driven secrets.

## Delivery phases

1. Foundation, tokens, models, migrations, seed data.
2. Storefront pages, discovery, search, cart and wishlist interactions.
3. Checkout, order tracking, reviews, newsletter, contact and admin.
4. Tests, responsive/a11y pass, query/performance checks, documentation.

