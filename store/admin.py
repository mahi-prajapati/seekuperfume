from django.contrib import admin
from .models import *

admin.site.site_header = "SEEKUPERFUMES Studio"
admin.site.site_title = "SEEKUPERFUMES"
admin.site.index_title = "Commerce & content"


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "gender", "price", "inventory", "is_bestseller", "is_active")
    list_filter = ("gender", "fragrance_family", "is_bestseller", "is_new", "is_active")
    search_fields = ("name", "sku", "description", "top_notes", "heart_notes", "base_notes")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("collections", "notes", "occasions")
    inlines = (ProductImageInline,)
    actions = ("mark_active", "mark_bestseller")
    @admin.action(description="Publish selected products")
    def mark_active(self, request, queryset): queryset.update(is_active=True)
    @admin.action(description="Mark as best sellers")
    def mark_bestseller(self, request, queryset): queryset.update(is_bestseller=True)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "full_name", "status", "total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("number", "email", "phone", "full_name")
    readonly_fields = ("number", "subtotal", "shipping", "total", "created_at", "updated_at")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "name", "rating", "is_approved", "created_at")
    list_filter = ("is_approved", "rating")
    actions = ("approve",)
    @admin.action(description="Approve selected reviews")
    def approve(self, request, queryset): queryset.update(is_approved=True)


for model in (Category, Collection, FragranceNote, Occasion, Cart, CartItem, WishlistItem, Coupon, OrderItem, Payment, Subscriber, ContactMessage, HeroSlide, HomepageSection, SocialPost):
    admin.site.register(model)
