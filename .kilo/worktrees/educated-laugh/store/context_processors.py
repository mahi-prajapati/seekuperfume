from .services import get_cart


def store_context(request):
    try:
        cart = get_cart(request)
        count = sum(i.quantity for i in cart.items.all())
    except Exception:
        cart, count = None, 0
    return {"active_cart": cart, "cart_count": count}

