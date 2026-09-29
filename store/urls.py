from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("shop/", views.shop, name="shop"),
    path("shop/<slug:facet>/", views.shop, name="shop_facet"),
    path("best-sellers/", views.best_sellers, name="best_sellers"),
    path("new-arrivals/", views.new_arrivals, name="new_arrivals"),
    path("products/<slug:slug>/", views.product_detail, name="product_detail"),
    path("api/search/", views.search_api, name="search_api"),
    path("api/cart/add/", views.cart_add, name="cart_add"),
    path("api/cart/update/", views.cart_update, name="cart_update"),
    path("api/wishlist/toggle/", views.wishlist_toggle, name="wishlist_toggle"),
    path("api/newsletter/", views.newsletter, name="newsletter"),
    path("cart/", views.cart_view, name="cart"),
    path("checkout/", views.checkout, name="checkout"),
    path("payments/verify/", views.payment_verify, name="payment_verify"),
    path("payments/razorpay/webhook/", views.razorpay_webhook, name="razorpay_webhook"),
    path("order-success/<str:number>/", views.order_success, name="order_success"),
    path("track-order/", views.track_order, name="track_order"),
    path("fragrance-finder/", views.finder, name="finder"),
    path("contact/", views.contact, name="contact"),
    path("account/", views.account, name="account"),
    path("health/", views.health, name="health"),
    path("robots.txt", views.robots, name="robots"),
    path("sitemap.xml", views.sitemap, name="sitemap"),
    path("<slug:page>/", views.static_page, name="static_page"),
]

