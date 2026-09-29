import os
import secrets
import razorpay
from django.db import transaction
from django.utils import timezone
from .models import Cart, Order, OrderItem, Payment


def get_cart(request):
    if not request.session.session_key:
        request.session.create()
    lookup = {"checked_out": False}
    if request.user.is_authenticated:
        lookup["user"] = request.user
    else:
        lookup["session_key"] = request.session.session_key
    cart, _ = Cart.objects.get_or_create(**lookup)
    return cart


def cart_payload(cart):
    return {
        "count": sum(i.quantity for i in cart.items.all()),
        "subtotal": str(cart.subtotal), "shipping": str(cart.shipping), "total": str(cart.total),
    }


@transaction.atomic
def create_order(cart, cleaned_data, user=None):
    items = list(cart.items.select_related("product").select_for_update())
    if not items:
        raise ValueError("Your bag is empty.")
    for item in items:
        if item.quantity > item.product.available_inventory:
            raise ValueError(f"Only {item.product.available_inventory} of {item.product.name} remain.")
    order = Order.objects.create(
        number=f"SEEK{timezone.now():%y%m%d}{secrets.token_hex(3).upper()}", user=user if getattr(user, "is_authenticated", False) else None,
        email=cleaned_data["email"], phone=cleaned_data["phone"], full_name=cleaned_data["full_name"],
        address=cleaned_data["address"], city=cleaned_data["city"], state=cleaned_data["state"], postal_code=cleaned_data["postal_code"],
        subtotal=cart.subtotal, shipping=cart.shipping, total=cart.total,
    )
    for item in items:
        OrderItem.objects.create(order=order, product=item.product, name=item.product.name, sku=item.product.sku, unit_price=item.product.price, quantity=item.quantity)
        item.product.inventory -= item.quantity
        item.product.save(update_fields=["inventory"])
    provider = "razorpay" if cleaned_data["payment_method"] == "online" and os.getenv("RAZORPAY_KEY_ID") else "cod"
    payment = Payment.objects.create(order=order, provider=provider, status="pending" if provider == "razorpay" else "authorized", amount=order.total)
    if provider == "razorpay":
        client = razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))
        provider_order = client.order.create({"amount": int(order.total * 100), "currency": "INR", "receipt": order.number, "notes": {"order_number": order.number}})
        payment.provider_order_id = provider_order["id"]
        payment.save(update_fields=["provider_order_id"])
    cart.checked_out = True
    cart.save(update_fields=["checked_out"])
    return order

