from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch
import hashlib, hmac, json
from .models import Product, CartItem, Order, Payment, Subscriber


class CommerceFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.product = Product.objects.create(name="Test Scent", slug="test-scent", sku="TEST-1", short_description="A test scent", description="Test", gender="unisex", fragrance_family="Woody", top_notes="Bergamot", heart_notes="Iris", base_notes="Cedar", price=1000, mrp=1200, inventory=5)

    def test_home_and_product_render(self):
        self.assertEqual(self.client.get(reverse("home")).status_code, 200)
        self.assertContains(self.client.get(reverse("product_detail", args=[self.product.slug])), "Test Scent")

    def test_add_to_cart_and_server_totals(self):
        response = self.client.post(reverse("cart_add"), data='{"product_id": %s}' % self.product.id, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total"], "1099.00")
        self.assertEqual(CartItem.objects.get().quantity, 1)

    def test_checkout_decrements_inventory(self):
        self.client.post(reverse("cart_add"), data='{"product_id": %s}' % self.product.id, content_type="application/json")
        response = self.client.post(reverse("checkout"), {"full_name":"Test User","email":"test@example.com","phone":"9999999999","address":"123 Studio Road","city":"Mumbai","state":"Maharashtra","postal_code":"400001","payment_method":"cod"})
        self.assertEqual(response.status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.inventory, 4)
        self.assertEqual(Order.objects.count(), 1)

    def test_order_tracking_requires_matching_email(self):
        Order.objects.create(number="SEEK123", email="right@example.com", phone="9", full_name="A", address="A", city="A", state="A", postal_code="400001", subtotal=100, total=100)
        response = self.client.post(reverse("track_order"), {"order_number":"SEEK123", "email":"wrong@example.com"})
        self.assertNotContains(response, "Confirmed")

    def test_newsletter_deduplicates(self):
        for _ in range(2): self.client.post(reverse("newsletter"), {"email":"hello@example.com", "consent":"1"})
        self.assertEqual(Subscriber.objects.count(), 1)

    def test_razorpay_signature_is_verified_server_side(self):
        order = Order.objects.create(number="SEEKPAY", email="pay@example.com", phone="9", full_name="A", address="A", city="A", state="A", postal_code="400001", subtotal=100, total=100)
        Payment.objects.create(order=order, provider="razorpay", provider_order_id="order_live", amount=100)
        signature = hmac.new(b"test_secret", b"order_live|pay_live", hashlib.sha256).hexdigest()
        payload = {"order_number":"SEEKPAY", "razorpay_order_id":"order_live", "razorpay_payment_id":"pay_live", "razorpay_signature":signature}
        with patch.dict("os.environ", {"RAZORPAY_KEY_ID":"test_key", "RAZORPAY_KEY_SECRET":"test_secret"}):
            response = self.client.post(reverse("payment_verify"), json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, "captured")
