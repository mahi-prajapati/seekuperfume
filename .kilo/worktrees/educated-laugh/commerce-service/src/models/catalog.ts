import mongoose, { Schema, model, Types } from "mongoose";

const { models } = mongoose;

const SeoSchema = new Schema({ title: String, description: String, keywords: [String], canonical: String, ogImage: String }, { _id: false });
const MoneySchema = new Schema({ amount: { type: Number, min: 0, required: true }, currency: { type: String, default: "INR" } }, { _id: false });
const MediaSchema = new Schema({ url: { type: String, required: true }, type: { type: String, enum: ["product", "lifestyle", "packaging", "ingredients", "campaign", "banner"], default: "product" }, alt: { type: String, required: true }, caption: String, width: Number, height: Number, sortOrder: { type: Number, default: 0 }, isPrimary: { type: Boolean, default: false } }, { timestamps: true });

const VariantSchema = new Schema({
  sku: { type: String, required: true }, barcode: String, size: { type: Number, required: true, min: 1 }, unit: { type: String, enum: ["ml", "g"], default: "ml" },
  price: { type: Number, required: true, min: 0 }, mrp: { type: Number, required: true, min: 0 }, costPrice: { type: Number, min: 0, select: false },
  taxPercentage: { type: Number, min: 0, max: 100, default: 18 }, inventory: { type: Number, min: 0, default: 0 }, reservedInventory: { type: Number, min: 0, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 }, weightGrams: Number, dimensions: { length: Number, width: Number, height: Number }, isActive: { type: Boolean, default: true },
}, { timestamps: true });
VariantSchema.virtual("availableInventory").get(function () { return Math.max(0, this.inventory - this.reservedInventory); });

const ProductSchema = new Schema({
  legacyId: { type: Number, sparse: true, unique: true }, sku: { type: String, required: true, unique: true, trim: true, uppercase: true }, barcode: String,
  name: { type: String, required: true, trim: true, index: true }, slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, brand: { type: String, default: "SEEKUPERFUMES" },
  shortDescription: { type: String, required: true, maxlength: 280 }, description: { type: String, required: true }, story: String,
  gender: { type: String, enum: ["him", "her", "unisex"], required: true, index: true }, fragranceFamily: { type: String, required: true, index: true }, fragranceSubFamily: String,
  topNotes: [{ type: Types.ObjectId, ref: "FragranceNote" }], heartNotes: [{ type: Types.ObjectId, ref: "FragranceNote" }], baseNotes: [{ type: Types.ObjectId, ref: "FragranceNote" }],
  accords: [String], occasionIds: [{ type: Types.ObjectId, ref: "Occasion" }], seasons: [String], timeOfDay: [String], longevity: String, projection: String,
  variants: { type: [VariantSchema], validate: [(v: unknown[]) => v.length > 0, "At least one variant is required"] },
  media: [MediaSchema], badges: [String], tags: [String], categoryIds: [{ type: Types.ObjectId, ref: "Category" }], collectionIds: [{ type: Types.ObjectId, ref: "Collection" }],
  relatedProductIds: [{ type: Types.ObjectId, ref: "Product" }], recommendedProductIds: [{ type: Types.ObjectId, ref: "Product" }],
  status: { type: String, enum: ["draft", "published", "scheduled", "archived"], default: "draft", index: true },
  isFeatured: { type: Boolean, default: false, index: true }, isBestSeller: { type: Boolean, default: false, index: true }, isNewArrival: { type: Boolean, default: false }, isTrending: { type: Boolean, default: false }, isGiftable: { type: Boolean, default: true }, isLimitedEdition: { type: Boolean, default: false },
  seo: SeoSchema, publishedAt: Date, scheduledFor: Date, salesCount: { type: Number, default: 0 }, viewCount: { type: Number, default: 0 },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true } });
ProductSchema.index({ status: 1, gender: 1, fragranceFamily: 1 });
ProductSchema.index({ name: "text", shortDescription: "text", description: "text", tags: "text", sku: "text" });
ProductSchema.index({ "variants.sku": 1 }, { unique: true });

const TaxonomySchema = new Schema({ name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, lowercase: true }, description: String, image: String, icon: String, color: String, parentId: { type: Types.ObjectId }, featured: { type: Boolean, default: false }, displayOrder: { type: Number, default: 0 }, status: { type: String, enum: ["draft", "published", "archived"], default: "published" }, seo: SeoSchema }, { timestamps: true });
const CollectionSchema = new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true }, description: String, image: String, banner: String, mode: { type: String, enum: ["manual", "smart"], default: "manual" }, productIds: [{ type: Types.ObjectId, ref: "Product" }], rules: Schema.Types.Mixed, manualSort: [{ productId: Types.ObjectId, order: Number }], isActive: { type: Boolean, default: true }, isFeatured: Boolean, seo: SeoSchema }, { timestamps: true });
const PriceHistorySchema = new Schema({ productId: { type: Types.ObjectId, ref: "Product", required: true, index: true }, variantId: Types.ObjectId, oldPrice: Number, newPrice: Number, oldMrp: Number, newMrp: Number, changedBy: { type: Types.ObjectId, ref: "Admin", required: true }, reason: { type: String, required: true } }, { timestamps: { createdAt: true, updatedAt: false } });

export const Product: any = models.Product || model("Product", ProductSchema);
export const Category: any = models.Category || model("Category", TaxonomySchema);
export const FragranceNote: any = models.FragranceNote || model("FragranceNote", TaxonomySchema);
export const Occasion: any = models.Occasion || model("Occasion", TaxonomySchema);
export const Collection: any = models.Collection || model("Collection", CollectionSchema);
export const PriceHistory: any = models.PriceHistory || model("PriceHistory", PriceHistorySchema);
