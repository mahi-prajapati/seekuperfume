from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from store.models import FragranceNote, Occasion, Product, Review


PRODUCTS = [
    ("Vanilla Reverie", "vanilla-reverie", "SEEK-VR-50", "her", "Gourmand", "Bergamot, Pear", "Jasmine, Heliotrope", "Vanilla, Sandalwood, Musk", 1299, 1799, 28, 3, "best-seller"),
    ("Cedar Quiet", "cedar-quiet", "SEEK-CQ-50", "him", "Woody", "Bergamot, Juniper", "Iris, Cypress", "Cedarwood, Vetiver, Musk", 1399, 1899, 21, 2, "best-seller"),
    ("Rose After Rain", "rose-after-rain", "SEEK-RR-50", "her", "Floral", "Pink Pepper, Lychee", "Rose, Peony", "Cashmere Wood, White Musk", 1499, 1999, 17, 1, "new"),
    ("Citrus Elsewhere", "citrus-elsewhere", "SEEK-CE-50", "unisex", "Fresh", "Bergamot, Mandarin", "Neroli, Green Tea", "Amber, Clean Musk", 1199, 1699, 35, 0, "trending"),
    ("Velvet Hour", "velvet-hour", "SEEK-VH-50", "unisex", "Amber", "Saffron, Plum", "Rose, Cacao", "Vanilla, Tonka, Patchouli", 1599, 2199, 12, 3, "exclusive"),
    ("Fig & Sun", "fig-and-sun", "SEEK-FS-50", "unisex", "Fruity", "Fig Leaf, Lemon", "Fig, Coconut Milk", "Cedar, Skin Musk", 1349, 1849, 19, 0, "new"),
    ("Oud in Linen", "oud-in-linen", "SEEK-OL-50", "him", "Oud", "Cardamom, Bergamot", "Orris, Rose", "Oud, Sandalwood, Suede", 1799, 2399, 9, 2, "limited"),
    ("Discovery Wardrobe", "discovery-wardrobe", "SEEK-DW-08", "unisex", "Discovery", "Eight signatures", "Fresh to floral", "Woods to gourmand", 599, 799, 50, 1, "new"),
]


class Command(BaseCommand):
    help = "Create SEEKUPERFUMES demo catalogue and reviews"

    def handle(self, *args, **options):
        notes = {}
        for name, family in [("Vanilla", "Warm & comforting"), ("Fresh", "Bright & effortless"), ("Woody", "Grounded & confident"), ("Floral", "Soft & expressive"), ("Fruity", "Playful & luminous"), ("Citrus", "Clean & energetic"), ("Musky", "Intimate & skin-like"), ("Oud", "Deep & magnetic"), ("Gourmand", "Delicious & enveloping"), ("Chocolate & Coffee", "Rich & addictive")]:
            notes[name.lower().replace(" & ", "-").replace(" ", "-")] = FragranceNote.objects.get_or_create(name=name, slug=name.lower().replace(" & ", "-").replace(" ", "-"), defaults={"family": family})[0]
        occasions = {}
        for name in ["Everyday", "Office", "Date Night", "Party", "Wedding", "Vacation", "Evening", "Gifting"]:
            slug = name.lower().replace(" ", "-"); occasions[slug] = Occasion.objects.get_or_create(name=name, slug=slug, defaults={"tagline": f"Made for {name.lower()} moments"})[0]
        for idx, row in enumerate(PRODUCTS):
            name, slug, sku, gender, family, top, heart, base, price, mrp, stock, image, badge = row
            product, _ = Product.objects.update_or_create(slug=slug, defaults={"name":name,"sku":sku,"gender":gender,"fragrance_family":family,"top_notes":top,"heart_notes":heart,"base_notes":base,"short_description":f"A {family.lower()} eau de parfum that settles close and stays memorable.","description":f"{name} opens with {top}, reveals {heart}, and leaves a lasting trace of {base}.","how_it_smells":f"Luminous at first, expressive at the heart, and grounded in {base}.","ingredients":"Alcohol denat., parfum, aqua and fragrance compounds.","price":price,"mrp":mrp,"inventory":stock,"image_key":image,"badge":badge,"is_active":True,"is_featured":idx<4,"is_bestseller":idx<4,"is_new":idx in (2,5,7),"is_discovery_set":idx==7})
            key = family.lower() if family.lower() in notes else "fresh"
            product.notes.add(notes[key])
            product.occasions.add(occasions["everyday"], occasions["date-night"] if idx % 2 else occasions["office"])
        first = Product.objects.get(slug="vanilla-reverie")
        Review.objects.get_or_create(product=first, name="Aanya", defaults={"title":"Feels distinctly mine","body":"Warm without being heavy. I catch something new every time I wear it.","rating":5,"is_verified":True,"is_approved":True})
        role_permissions = {
            "ADMIN": None,
            "CONTENT_MANAGER": ["view_product", "add_product", "change_product", "view_category", "add_category", "change_category", "view_collection", "add_collection", "change_collection", "view_heroslide", "add_heroslide", "change_heroslide", "view_homepagesection", "add_homepagesection", "change_homepagesection"],
            "ORDER_MANAGER": ["view_order", "change_order", "view_orderitem", "view_payment", "change_payment", "view_product", "change_product", "view_coupon", "add_coupon", "change_coupon"],
            "SUPPORT_AGENT": ["view_order", "change_order", "view_contactmessage", "change_contactmessage", "view_review", "change_review"],
        }
        all_store_permissions = Permission.objects.filter(content_type__app_label="store")
        for role, codenames in role_permissions.items():
            group, _ = Group.objects.get_or_create(name=role)
            group.permissions.set(all_store_permissions if codenames is None else all_store_permissions.filter(codename__in=codenames))
        self.stdout.write(self.style.SUCCESS(f"Seeded {Product.objects.count()} fragrances."))

