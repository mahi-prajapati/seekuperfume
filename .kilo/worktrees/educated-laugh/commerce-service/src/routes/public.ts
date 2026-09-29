import { Router } from "express";
import { z } from "zod";
import { Product, Category, Collection, FragranceNote, Occasion } from "../models/catalog.js";
import { HeroBanner, HomepageSection, NavigationItem, Review } from "../models/operations.js";
import { asyncHandler, ApiError, ok } from "../utils/http.js";

const router = Router();
router.get("/catalog/products", asyncHandler(async (req, res) => {
  const query = z.object({ q: z.string().max(100).optional(), gender: z.enum(["him", "her", "unisex"]).optional(), family: z.string().max(80).optional(), collection: z.string().optional(), cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(48).default(24), sort: z.enum(["featured", "newest", "price_asc", "price_desc", "best_selling"]).default("featured") }).parse(req.query);
  const filter: any = { status: "published", ...(query.gender ? { gender: query.gender } : {}), ...(query.family ? { fragranceFamily: query.family } : {}) };
  if (query.q) filter.$text = { $search: query.q };
  if (query.cursor) filter._id = { $lt: query.cursor };
  if (query.collection) { const collection = await Collection.findOne({ slug: query.collection, isActive: true }, { productIds: 1 }); filter._id = { $in: collection?.productIds || [] }; }
  const sorts: any = { featured: { isFeatured: -1, _id: -1 }, newest: { publishedAt: -1, _id: -1 }, price_asc: { "variants.0.price": 1 }, price_desc: { "variants.0.price": -1 }, best_selling: { salesCount: -1 } };
  const products = await Product.find(filter).sort(sorts[query.sort]).limit(query.limit + 1).lean();
  const hasMore = products.length > query.limit; if (hasMore) products.pop();
  return ok(res, products, { nextCursor: hasMore ? String(products.at(-1)?._id) : null, hasMore });
}));
router.get("/catalog/products/:slug", asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, status: "published" }).populate("topNotes heartNotes baseNotes occasionIds categoryIds collectionIds").lean();
  if (!product) throw new ApiError(404, "Fragrance not found.", "PRODUCT_NOT_FOUND");
  return ok(res, product);
}));
router.get("/storefront/home", asyncHandler(async (_req, res) => {
  const now = new Date(); const active = { active: true, $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }] };
  const [heroes, sections, navigation] = await Promise.all([HeroBanner.find(active).sort("sortOrder").lean(), HomepageSection.find(active).sort("sortOrder").lean(), NavigationItem.find(active).sort("sortOrder").lean()]);
  return ok(res, { heroes, sections, navigation });
}));
router.get("/taxonomy", asyncHandler(async (_req, res) => ok(res, { categories: await Category.find({ status: "published" }).sort("displayOrder").lean(), notes: await FragranceNote.find({ status: "published" }).sort("displayOrder").lean(), occasions: await Occasion.find({ status: "published" }).sort("displayOrder").lean() })));
router.get("/products/:id/reviews", asyncHandler(async (req, res) => ok(res, await Review.find({ productId: req.params.id, status: "approved" }).sort({ createdAt: -1 }).limit(50).lean())));
export default router;
