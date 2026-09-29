from decimal import Decimal
import secrets
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True


class NamedSlugModel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    class Meta:
        abstract = True
        ordering = ("name",)
    def __str__(self):
        return self.name


class Category(NamedSlugModel):
    description = models.TextField(blank=True)


class Collection(NamedSlugModel):
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)


class FragranceNote(NamedSlugModel):
    family = models.CharField(max_length=80, blank=True)


class Occasion(NamedSlugModel):
    tagline = models.CharField(max_length=160, blank=True)


class Product(TimeStampedModel):
    GENDERS = (("him", "Him"), ("her", "Her"), ("unisex", "Unisex"))
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    sku = models.CharField(max_length=50, unique=True)
    short_description = models.CharField(max_length=240)
    description = models.TextField()
    gender = models.CharField(max_length=10, choices=GENDERS, default="unisex", db_index=True)
    fragrance_family = models.CharField(max_length=80, db_index=True)
    top_notes = models.CharField(max_length=240)
    heart_notes = models.CharField(max_length=240)
    base_notes = models.CharField(max_length=240)
    how_it_smells = models.TextField(blank=True)
    ingredients = models.TextField(blank=True)
    longevity = models.CharField(max_length=80, default="8–10 hours")
    projection = models.CharField(max_length=80, default="Balanced")
    volume_ml = models.PositiveIntegerField(default=50)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    mrp = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    inventory = models.PositiveIntegerField(default=0)
    reserved_inventory = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    badge = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    is_bestseller = models.BooleanField(default=False, db_index=True)
    is_new = models.BooleanField(default=False, db_index=True)
    is_giftable = models.BooleanField(default=True)
    is_discovery_set = models.BooleanField(default=False)
    image_key = models.PositiveSmallIntegerField(default=0)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    collections = models.ManyToManyField(Collection, blank=True, related_name="products")
    notes = models.ManyToManyField(FragranceNote, blank=True, related_name="products")
    occasions = models.ManyToManyField(Occasion, blank=True, related_name="products")
    seo_title = models.CharField(max_length=180, blank=True)
    seo_description = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ("-is_bestseller", "name")
        indexes = [models.Index(fields=["is_active", "gender"]), models.Index(fields=["is_active", "is_bestseller"])]

    def __str__(self): return self.name
    @property
    def discount_percentage(self): return round((self.mrp - self.price) * 100 / self.mrp) if self.mrp else 0
    @property
    def available_inventory(self): return max(0, self.inventory - self.reserved_inventory)
    @property
    def average_rating(self):
        value = self.reviews.filter(is_approved=True).aggregate(models.Avg("rating"))["rating__avg"]
        return round(value or 4.8, 1)


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/%Y/%m")
    alt_text = models.CharField(max_length=180)
    sort_order = models.PositiveSmallIntegerField(default=0)
    class Meta:
        ordering = ("sort_order",)


class Cart(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="carts")
    session_key = models.CharField(max_length=40, blank=True, db_index=True)
    checked_out = models.BooleanField(default=False)
    coupon_code = models.CharField(max_length=40, blank=True)
    gift_wrap = models.BooleanField(default=False)
    gift_message = models.CharField(max_length=300, blank=True)
    @property
    def subtotal(self): return sum((i.line_total for i in self.items.select_related("product")), Decimal("0"))
    @property
    def shipping(self): return Decimal("0") if self.subtotal >= Decimal("1499") or not self.items.exists() else Decimal("99")
    @property
    def total(self): return self.subtotal + self.shipping + (Decimal("99") if self.gift_wrap else Decimal("0"))


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(10)])
    class Meta:
        constraints = [models.UniqueConstraint(fields=["cart", "product"], name="unique_cart_product")]
    @property
    def line_total(self): return self.product.price * self.quantity


class WishlistItem(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "product"], name="unique_wishlist_product")]


class Coupon(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    percent_off = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(90)])
    is_active = models.BooleanField(default=True)


class Order(TimeStampedModel):
    STATUSES = (("confirmed", "Confirmed"), ("processing", "Processing"), ("packed", "Packed"), ("shipped", "Shipped"), ("out-for-delivery", "Out for delivery"), ("delivered", "Delivered"), ("cancelled", "Cancelled"))
    number = models.CharField(max_length=24, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20)
    full_name = models.CharField(max_length=160)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=12)
    status = models.CharField(max_length=30, choices=STATUSES, default="confirmed")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    tracking_number = models.CharField(max_length=80, blank=True)
    courier = models.CharField(max_length=80, blank=True)
    def __str__(self): return self.number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, null=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveSmallIntegerField()
    @property
    def line_total(self): return self.unit_price * self.quantity


class Payment(TimeStampedModel):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    provider = models.CharField(max_length=30, default="mock")
    provider_order_id = models.CharField(max_length=120, blank=True)
    provider_payment_id = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=30, default="pending")
    amount = models.DecimalField(max_digits=10, decimal_places=2)


class Review(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=140)
    body = models.TextField()
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    is_verified = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False, db_index=True)


class Subscriber(TimeStampedModel):
    email = models.EmailField(unique=True)
    consent = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    unsubscribe_token = models.CharField(max_length=64, unique=True, default=secrets.token_hex)


class ContactMessage(TimeStampedModel):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=160)
    order_number = models.CharField(max_length=30, blank=True)
    message = models.TextField()
    resolved = models.BooleanField(default=False)


class HeroSlide(TimeStampedModel):
    eyebrow = models.CharField(max_length=80, default="Seek your signature")
    headline = models.CharField(max_length=180)
    subheadline = models.CharField(max_length=240)
    cta_text = models.CharField(max_length=60, default="Shop collection")
    cta_url = models.CharField(max_length=180, default="/shop/")
    image = models.ImageField(upload_to="hero/", blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)


class HomepageSection(TimeStampedModel):
    key = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    subtitle = models.CharField(max_length=240, blank=True)
    body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)


class SocialPost(TimeStampedModel):
    caption = models.CharField(max_length=240)
    image = models.ImageField(upload_to="social/", blank=True)
    url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
