import { connectDatabase } from "../src/config/db.js";
import { Role, PERMISSIONS } from "../src/models/admin.js";
import { Product, FragranceNote, Occasion } from "../src/models/catalog.js";
import { HeroBanner, HomepageSection, ShippingMethod, StoreSetting } from "../src/models/operations.js";

await connectDatabase();
const roleMap: Record<string, string[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: PERMISSIONS.filter(p => p !== "admins.manage"),
  CONTENT_MANAGER: ["dashboard.read", "products.read", "products.write", "products.publish", "cms.manage"],
  ORDER_MANAGER: ["dashboard.read", "products.read", "inventory.read", "inventory.adjust", "orders.read", "orders.manage", "payments.read", "refunds.manage", "customers.read"],
  SUPPORT_AGENT: ["dashboard.read", "orders.read", "customers.read", "customers.manage", "reviews.moderate"],
};
for (const [name, permissions] of Object.entries(roleMap)) await Role.findOneAndUpdate({ name }, { $set: { permissions, isSystem: true } }, { upsert: true });
const noteRows: [string, string][] = [["Vanilla", "Warm & comforting"], ["Bergamot", "Bright & sparkling"], ["Rose", "Soft & expressive"], ["Cedarwood", "Dry & grounding"], ["Musk", "Intimate & skin-like"], ["Oud", "Deep & magnetic"]];
const noteIds: Record<string, any> = {};
for (const [name, description] of noteRows) { const slug = name.toLowerCase(); const doc = await FragranceNote.findOneAndUpdate({ slug }, { $set: { name, description, status: "published" } }, { upsert: true, new: true }); noteIds[name] = doc._id; }
const occasions: Record<string, any> = {};
for (const name of ["Everyday", "Office", "Date Night", "Party", "Wedding", "Vacation", "Evening", "Gifting"]) { const slug = name.toLowerCase().replaceAll(" ", "-"); const doc = await Occasion.findOneAndUpdate({ slug }, { $set: { name, description: `Created for ${name.toLowerCase()} moments`, status: "published" } }, { upsert: true, new: true }); occasions[name] = doc._id; }
await Product.findOneAndUpdate({ sku: "SEEK-VR" }, { $set: { name: "Vanilla Reverie", slug: "vanilla-reverie", shortDescription: "A warm gourmand that settles close and stays memorable.", description: "Pear and bergamot open into jasmine before vanilla, sandalwood and musk remain.", gender: "her", fragranceFamily: "Gourmand", topNotes: [noteIds.Bergamot], heartNotes: [noteIds.Rose], baseNotes: [noteIds.Vanilla, noteIds.Musk], occasionIds: [occasions.Everyday, occasions["Date Night"]], variants: [{ sku: "SEEK-VR-50", size: 50, unit: "ml", price: 129900, mrp: 179900, costPrice: 52000, taxPercentage: 18, inventory: 40, reservedInventory: 0, lowStockThreshold: 5, isActive: true }], media: [{ url: "/static/images/product-sheet.webp", type: "product", alt: "Vanilla Reverie perfume bottle", isPrimary: true, sortOrder: 0 }], status: "published", publishedAt: new Date(), isFeatured: true, isBestSeller: true, isGiftable: true, seo: { title: "Vanilla Reverie Eau de Parfum", description: "A warm vanilla, sandalwood and musk signature." } } }, { upsert: true, new: true, runValidators: true });
await HeroBanner.findOneAndUpdate({ heading: "A fragrance that feels like you." }, { $set: { eyebrow: "Seek your signature", subheading: "Discover scents created for every mood, moment and version of you.", desktopImage: "/static/images/hero-seek.webp", ctaText: "Shop the collection", ctaUrl: "/shop/", active: true, sortOrder: 1 } }, { upsert: true });
await HomepageSection.findOneAndUpdate({ key: "best-sellers" }, { $set: { type: "product_grid", title: "Best sellers", subtitle: "The scents people keep coming back for.", displayCount: 4, active: true, sortOrder: 2 } }, { upsert: true });
await ShippingMethod.findOneAndUpdate({ code: "STANDARD" }, { $set: { name: "Standard delivery", rate: 9900, freeAbove: 149900, estimatedDaysMin: 3, estimatedDaysMax: 7, codEnabled: true, active: true } }, { upsert: true });
await StoreSetting.findOneAndUpdate({ key: "store.identity" }, { $set: { group: "store", value: { name: "SEEKUPERFUMES", currency: "INR", timezone: "Asia/Kolkata" }, public: true } }, { upsert: true });
console.log("Commerce seed complete."); process.exit(0);

