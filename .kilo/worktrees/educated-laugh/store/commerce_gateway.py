"""Read-only adapter for the Mongo commerce API during staged storefront cutover."""
from dataclasses import dataclass, field
from decimal import Decimal
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from django.conf import settings


class CommerceUnavailable(RuntimeError):
    pass


def _get(path, params=None):
    base = getattr(settings, "COMMERCE_API_URL", "").rstrip("/")
    if not base:
        raise CommerceUnavailable("COMMERCE_API_URL is not configured")
    url = f"{base}/{path.lstrip('/')}"
    if params: url += "?" + urlencode({k: v for k, v in params.items() if v not in (None, "")})
    try:
        with urlopen(Request(url, headers={"Accept": "application/json"}), timeout=2.5) as response:
            payload = json.load(response)
    except Exception as exc:
        raise CommerceUnavailable("Commerce service is unavailable") from exc
    if not payload.get("success"):
        raise CommerceUnavailable(payload.get("error", {}).get("message", "Commerce request failed"))
    return payload["data"]


@dataclass
class RemoteVariant:
    id: str
    sku: str
    size: int
    price: Decimal
    mrp: Decimal
    inventory: int
    reserved_inventory: int


@dataclass
class RemoteProduct:
    id: str
    name: str
    slug: str
    sku: str
    short_description: str
    description: str
    gender: str
    fragrance_family: str
    top_notes: str
    heart_notes: str
    base_notes: str
    price: Decimal
    mrp: Decimal
    inventory: int
    reserved_inventory: int
    volume_ml: int
    image_key: int = 0
    badge: str = ""
    is_bestseller: bool = False
    is_new: bool = False
    media_url: str = ""
    variant_id: str = ""
    raw: dict = field(default_factory=dict)

    @property
    def discount_percentage(self): return round((self.mrp - self.price) * 100 / self.mrp) if self.mrp else 0
    @property
    def available_inventory(self): return max(0, self.inventory - self.reserved_inventory)
    @property
    def average_rating(self): return 4.8
    def get_gender_display(self): return self.gender.title()


def _note_names(values):
    return ", ".join(v.get("name", "") if isinstance(v, dict) else str(v) for v in values)


def _map_product(item):
    variant = next((v for v in item.get("variants", []) if v.get("isActive", True)), item.get("variants", [{}])[0] if item.get("variants") else {})
    return RemoteProduct(id=str(item["_id"]), name=item["name"], slug=item["slug"], sku=item["sku"], short_description=item.get("shortDescription", ""), description=item.get("description", ""), gender=item.get("gender", "unisex"), fragrance_family=item.get("fragranceFamily", ""), top_notes=_note_names(item.get("topNotes", [])), heart_notes=_note_names(item.get("heartNotes", [])), base_notes=_note_names(item.get("baseNotes", [])), price=Decimal(variant.get("price", 0)) / 100, mrp=Decimal(variant.get("mrp", 0)) / 100, inventory=variant.get("inventory", 0), reserved_inventory=variant.get("reservedInventory", 0), volume_ml=variant.get("size", 50), badge=(item.get("badges") or [""])[0], is_bestseller=item.get("isBestSeller", False), is_new=item.get("isNew", False), media_url=next((m.get("url", "") for m in item.get("media", []) if m.get("isPrimary")), ""), variant_id=str(variant.get("_id", "")), raw=item)


def catalog(params=None): return [_map_product(item) for item in _get("catalog/products", params)]
def product(slug): return _map_product(_get(f"catalog/products/{slug}"))
def homepage(): return _get("storefront/home")
