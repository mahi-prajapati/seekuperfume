import json
import os
import razorpay
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from .forms import CheckoutForm, ContactForm, ReviewForm, TrackingForm
from .models import CartItem, ContactMessage, FragranceNote, HeroSlide, Occasion, Order, Product, Review, Subscriber, WishlistItem
from .services import cart_payload, create_order, get_cart


def _catalog(request, base=None):
    products = (base or Product.objects.all()).filter(is_active=True).prefetch_related("notes", "occasions")
    term = request.GET.get("q", "").strip()
    facet = request.GET.get("filter", "").strip().lower()
    if term:
        products = products.filter(Q(name__icontains=term) | Q(short_description__icontains=term) | Q(fragrance_family__icontains=term) | Q(top_notes__icontains=term) | Q(heart_notes__icontains=term) | Q(base_notes__icontains=term) | Q(notes__name__icontains=term) | Q(occasions__name__icontains=term)).distinct()
    if facet:
        products = products.filter(Q(gender=facet) | Q(fragrance_family__iexact=facet) | Q(notes__slug=facet) | Q(occasions__slug=facet)).distinct()
    sort = request.GET.get("sort", "featured")
    sorts = {"newest": "-created_at", "price-low": "price", "price-high": "-price", "rating": "-is_bestseller", "featured": "-is_featured"}
    return products.order_by(sorts.get(sort, "-is_featured"), "name")


def home(request):
    products = Product.objects.filter(is_active=True).prefetch_related("notes")
    return render(request, "store/home.html", {"hero": HeroSlide.objects.filter(is_active=True).order_by("sort_order").first(), "bestsellers": products.filter(is_bestseller=True)[:4], "new_arrivals": products.filter(is_new=True)[:4], "notes": FragranceNote.objects.all()[:10], "reviews": Review.objects.filter(is_approved=True).select_related("product")[:6]})


def shop(request, facet=""):
    if facet and "filter" not in request.GET:
        params = request.GET.copy(); params["filter"] = facet; request.GET = params
    products = _catalog(request)
    return render(request, "store/shop.html", {"products": products, "notes": FragranceNote.objects.all(), "occasions": Occasion.objects.all(), "facet": facet})


def best_sellers(request):
    return render(request, "store/shop.html", {"products": _catalog(request, Product.objects.filter(is_bestseller=True)), "title": "Best sellers"})


def new_arrivals(request):
    return render(request, "store/shop.html", {"products": _catalog(request, Product.objects.filter(is_new=True)), "title": "New arrivals"})


def product_detail(request, slug):
    product = get_object_or_404(Product.objects.prefetch_related("notes", "occasions", "reviews"), slug=slug, is_active=True)
    if request.method == "POST":
        form = ReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False); review.product = product
            if request.user.is_authenticated: review.user = request.user
            review.save(); messages.success(request, "Thank you. Your review is awaiting moderation.")
            return redirect("product_detail", slug=slug)
    else: form = ReviewForm()
    related = Product.objects.filter(is_active=True, fragrance_family=product.fragrance_family).exclude(pk=product.pk)[:4]
    return render(request, "store/product.html", {"product": product, "review_form": form, "related": related})


def search_api(request):
    products = _catalog(request)[:8]
    return JsonResponse({"results": [{"name": p.name, "slug": p.slug, "price": str(p.price), "gender": p.get_gender_display(), "image_key": p.image_key, "notes": p.top_notes} for p in products]})


@require_POST
def cart_add(request):
    try: data = json.loads(request.body or "{}")
    except json.JSONDecodeError: return JsonResponse({"error": "Invalid request."}, status=400)
    product = get_object_or_404(Product, pk=data.get("product_id"), is_active=True)
    cart = get_cart(request)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    requested = min(10, item.quantity if created else item.quantity + 1)
    if requested > product.available_inventory: return JsonResponse({"error": "This fragrance is currently low in stock."}, status=409)
    item.quantity = requested; item.save(update_fields=["quantity", "updated_at"])
    return JsonResponse({**cart_payload(cart), "message": f"{product.name} added to your bag."})


@require_POST
def cart_update(request):
    try: data = json.loads(request.body or "{}")
    except json.JSONDecodeError: return JsonResponse({"error": "Invalid request."}, status=400)
    cart = get_cart(request)
    item = get_object_or_404(CartItem, pk=data.get("item_id"), cart=cart)
    quantity = max(0, min(10, int(data.get("quantity", 1))))
    if quantity == 0: item.delete()
    elif quantity <= item.product.available_inventory: item.quantity = quantity; item.save(update_fields=["quantity", "updated_at"])
    else: return JsonResponse({"error": "Requested quantity is unavailable."}, status=409)
    return JsonResponse(cart_payload(cart))


def cart_view(request):
    return render(request, "store/cart.html", {"cart": get_cart(request)})


@require_POST
def wishlist_toggle(request):
    if not request.user.is_authenticated: return JsonResponse({"error": "Sign in to save favourites.", "login": "/account/login/"}, status=401)
    product = get_object_or_404(Product, pk=request.POST.get("product_id"))
    item, created = WishlistItem.objects.get_or_create(user=request.user, product=product)
    if not created: item.delete()
    return JsonResponse({"saved": created})


def checkout(request):
    cart = get_cart(request)
    if not cart.items.exists(): return redirect("cart")
    form = CheckoutForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try: order = create_order(cart, form.cleaned_data, request.user)
        except ValueError as exc: form.add_error(None, str(exc))
        else:
            if order.payment.provider == "razorpay":
                return render(request, "store/payment.html", {"order": order, "razorpay_key": os.getenv("RAZORPAY_KEY_ID")})
            request.session["last_order"] = order.number
            return redirect("order_success", number=order.number)
    return render(request, "store/checkout.html", {"form": form, "cart": cart})


def order_success(request, number):
    if request.session.get("last_order") != number and not request.user.is_staff: raise Http404
    return render(request, "store/order_success.html", {"order": get_object_or_404(Order.objects.prefetch_related("items"), number=number)})


@require_POST
def payment_verify(request):
    try:
        data = json.loads(request.body)
        order = Order.objects.select_related("payment").get(number=data["order_number"])
    except (ValueError, KeyError, Order.DoesNotExist):
        return JsonResponse({"error": "Invalid payment response."}, status=400)
    payment = order.payment
    if payment.provider != "razorpay" or payment.provider_order_id != data.get("razorpay_order_id"):
        return JsonResponse({"error": "Payment could not be matched."}, status=400)
    try:
        client = razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))
        client.utility.verify_payment_signature({"razorpay_order_id": data["razorpay_order_id"], "razorpay_payment_id": data["razorpay_payment_id"], "razorpay_signature": data["razorpay_signature"]})
    except (KeyError, razorpay.errors.SignatureVerificationError):
        return JsonResponse({"error": "Payment verification failed."}, status=400)
    payment.provider_payment_id = data["razorpay_payment_id"]
    payment.status = "captured"
    payment.save(update_fields=["provider_payment_id", "status", "updated_at"])
    request.session["last_order"] = order.number
    return JsonResponse({"redirect": reverse("order_success", args=[order.number])})


@csrf_exempt
@require_POST
def razorpay_webhook(request):
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not secret:
        return JsonResponse({"error": "Webhook is not configured."}, status=503)
    try:
        client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID", "webhook"), os.getenv("RAZORPAY_KEY_SECRET", "webhook")))
        client.utility.verify_webhook_signature(request.body.decode(), request.headers.get("X-Razorpay-Signature", ""), secret)
    except razorpay.errors.SignatureVerificationError:
        return JsonResponse({"error": "Invalid signature."}, status=400)
    payload = json.loads(request.body)
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    if payload.get("event") == "payment.captured":
        from .models import Payment
        Payment.objects.filter(provider_order_id=entity.get("order_id")).update(provider_payment_id=entity.get("id", ""), status="captured")
    return JsonResponse({"received": True})


def track_order(request):
    form, order = TrackingForm(request.POST or None), None
    if request.method == "POST" and form.is_valid():
        order = Order.objects.filter(number__iexact=form.cleaned_data["order_number"], email__iexact=form.cleaned_data["email"]).prefetch_related("items").first()
        if not order: form.add_error(None, "We couldn't match those details.")
    return render(request, "store/track.html", {"form": form, "order": order})


@require_POST
def newsletter(request):
    email = request.POST.get("email", "").strip().lower()
    if "@" not in email or not request.POST.get("consent"): return JsonResponse({"error": "Enter a valid email and accept the consent checkbox."}, status=400)
    subscriber, created = Subscriber.objects.get_or_create(email=email)
    if not created and subscriber.is_active: return JsonResponse({"message": "You're already on the Seek List."})
    subscriber.is_active = True; subscriber.consent = True; subscriber.save()
    return JsonResponse({"message": "Welcome to the Seek List."})


def finder(request):
    products = []
    if request.GET:
        query = Q(is_active=True)
        for value in (request.GET.get("gender"), request.GET.get("note"), request.GET.get("occasion")):
            if value: query &= (Q(gender=value) | Q(notes__slug=value) | Q(occasions__slug=value) | Q(fragrance_family__iexact=value))
        products = Product.objects.filter(query).distinct()[:5]
        if not products: products = Product.objects.filter(is_active=True, is_bestseller=True)[:3]
    return render(request, "store/finder.html", {"products": products, "notes": FragranceNote.objects.all(), "occasions": Occasion.objects.all()})


def contact(request):
    form = ContactForm(request.POST or None)
    if request.method == "POST" and form.is_valid(): form.save(); messages.success(request, "Your note reached us. We'll reply within one business day."); return redirect("contact")
    return render(request, "store/contact.html", {"form": form})


@login_required
def account(request):
    return render(request, "store/account.html", {"orders": request.user.orders.prefetch_related("items"), "wishlist": request.user.wishlist_items.select_related("product")})


def static_page(request, page):
    allowed = {"about", "gifting", "bundles", "discovery-sets", "faq", "journal", "careers"}
    if page not in allowed: raise Http404
    return render(request, f"store/{page}.html", {"products": Product.objects.filter(is_active=True, is_giftable=True)[:4]})


def health(request): return JsonResponse({"status": "ok"})


def robots(request): return HttpResponse("User-agent: *\nAllow: /\nSitemap: /sitemap.xml", content_type="text/plain")


def sitemap(request):
    urls = [request.build_absolute_uri(p) for p in ["/", "/shop/", "/gifting/", "/about/", "/contact/"]]
    urls += [request.build_absolute_uri(f"/products/{p.slug}/") for p in Product.objects.filter(is_active=True)]
    body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" + "".join(f"<url><loc>{u}</loc></url>" for u in urls) + "</urlset>"
    return HttpResponse(body, content_type="application/xml")
