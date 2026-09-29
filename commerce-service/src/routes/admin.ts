import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin, requirePermission } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { Product, PriceHistory, Category, Collection, FragranceNote, Occasion } from "../models/catalog.js";
import { Customer, InventoryTransaction, Order, Payment, Refund, Coupon } from "../models/commerce.js";
import { Review, HeroBanner, HomepageSection, NavigationItem, NewsletterSubscriber, ContactMessage, StoreSetting, GiftSet, Bundle, DiscoverySet, ShippingMethod, ShippingZone, ReturnRequest, SocialPost, Career, Notification } from "../models/operations.js";
import { AuditLog } from "../models/admin.js";
import { asyncHandler, ApiError, ok } from "../utils/http.js";
import { audit } from "../services/audit.js";
import { adjustInventory } from "../services/inventory.js";
import { assertOrderTransition } from "../services/orders.js";
import { validatePrice } from "../services/pricing.js";
import type { AdminRequest } from "../types.js";

const router = Router();
router.use(requireAdmin, requireCsrf);
const id = z.string().regex(/^[a-f\d]{24}$/i);
const variantSchema = z.object({ sku: z.string().min(2).max(60), barcode: z.string().optional(), size: z.number().positive(), unit: z.enum(["ml", "g"]).default("ml"), price: z.number().int().nonnegative(), mrp: z.number().int().nonnegative(), costPrice: z.number().int().nonnegative().optional(), taxPercentage: z.number().min(0).max(100).default(18), inventory: z.number().int().nonnegative().default(0), reservedInventory: z.number().int().nonnegative().default(0), lowStockThreshold: z.number().int().nonnegative().default(5), isActive: z.boolean().default(true) });
const productSchema = z.object({ sku: z.string().min(2).max(60), name: z.string().min(2).max(160), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), shortDescription: z.string().min(10).max(280), description: z.string().min(20), story: z.string().optional(), gender: z.enum(["him", "her", "unisex"]), fragranceFamily: z.string().min(2), fragranceSubFamily: z.string().optional(), topNotes: z.array(id).default([]), heartNotes: z.array(id).default([]), baseNotes: z.array(id).default([]), occasionIds: z.array(id).default([]), categoryIds: z.array(id).default([]), collectionIds: z.array(id).default([]), accords: z.array(z.string()).default([]), tags: z.array(z.string()).default([]), longevity: z.string().optional(), projection: z.string().optional(), variants: z.array(variantSchema).min(1), media: z.array(z.object({ url: z.string().min(1), type: z.enum(["product", "lifestyle", "packaging", "ingredients", "campaign", "banner"]).default("product"), alt: z.string().min(2), caption: z.string().optional(), sortOrder: z.number().int().default(0), isPrimary: z.boolean().default(false) })).default([]), status: z.enum(["draft", "published", "scheduled", "archived"]).default("draft"), isFeatured: z.boolean().default(false), isBestSeller: z.boolean().default(false), isNewArrival: z.boolean().default(false), isTrending: z.boolean().default(false), isGiftable: z.boolean().default(true), isLimitedEdition: z.boolean().default(false), seo: z.object({ title: z.string().optional(), description: z.string().max(320).optional(), keywords: z.array(z.string()).optional(), canonical: z.string().optional(), ogImage: z.string().optional() }).optional() });

router.get("/dashboard", requirePermission("dashboard.read"), asyncHandler(async (_req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [sales] = await Order.aggregate([{ $match: { createdAt: { $gte: start }, paymentStatus: "captured" } }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, aov: { $avg: "$total" } } }]);
  const [pipeline, lowStock, customers, recentOrders, pendingReviews] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Product.aggregate([{ $match: { status: "published" } }, { $unwind: "$variants" }, { $match: { $expr: { $lte: [{ $subtract: ["$variants.inventory", "$variants.reservedInventory"] }, "$variants.lowStockThreshold"] } } }, { $project: { name: 1, sku: "$variants.sku", available: { $subtract: ["$variants.inventory", "$variants.reservedInventory"] } } }, { $limit: 8 }]),
    Customer.countDocuments(), Order.find().sort({ createdAt: -1 }).limit(8).lean(), Review.countDocuments({ status: "pending" })
  ]);
  return ok(res, { revenueToday: sales?.revenue || 0, ordersToday: sales?.orders || 0, aov: Math.round(sales?.aov || 0), customers, pipeline, lowStock, recentOrders, pendingReviews });
}));

router.get("/products", requirePermission("products.read"), asyncHandler(async (req, res) => {
  const query = z.object({ q: z.string().optional(), status: z.string().optional(), stock: z.enum(["low", "out"]).optional(), cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).default(30) }).parse(req.query);
  const filter: any = { ...(query.status ? { status: query.status } : {}), ...(query.q ? { $or: [{ name: new RegExp(query.q, "i") }, { sku: new RegExp(query.q, "i") }, { "variants.sku": new RegExp(query.q, "i") }] } : {}) };
  if (query.cursor) filter._id = { $lt: query.cursor };
  if (query.stock === "out") filter.variants = { $elemMatch: { inventory: 0 } };
  if (query.stock === "low") filter.$expr = { $gt: [{ $size: { $filter: { input: "$variants", as: "v", cond: { $lte: [{ $subtract: ["$$v.inventory", "$$v.reservedInventory"] }, "$$v.lowStockThreshold"] } } } }, 0] };
  const rows = await Product.find(filter).sort({ _id: -1 }).limit(query.limit + 1).lean(); const hasMore = rows.length > query.limit; if (hasMore) rows.pop();
  return ok(res, rows, { nextCursor: hasMore ? String(rows.at(-1)?._id) : null, hasMore });
}));
router.post("/products", requirePermission("products.write"), asyncHandler(async (req: AdminRequest, res) => {
  const input = productSchema.parse(req.body); input.variants.forEach(v => validatePrice(v.price, v.mrp, v.taxPercentage));
  if (input.status === "published") (input as any).publishedAt = new Date();
  const product = await Product.create(input); await audit(req, { action: "product.create", resourceType: "product", resourceId: product.id, after: product.toObject() });
  return res.status(201).json({ success: true, data: product });
}));
router.get("/products/:id", requirePermission("products.read"), asyncHandler(async (req, res) => { const product = await Product.findById(req.params.id).lean(); if (!product) throw new ApiError(404, "Product not found.", "NOT_FOUND"); return ok(res, product); }));
router.patch("/products/:id", requirePermission("products.write"), asyncHandler(async (req: AdminRequest, res) => {
  const input = productSchema.partial().parse(req.body); input.variants?.forEach(v => { if (v.price !== undefined && v.mrp !== undefined) validatePrice(v.price, v.mrp, v.taxPercentage); });
  const before = await Product.findById(req.params.id).lean(); if (!before) throw new ApiError(404, "Product not found.", "NOT_FOUND");
  const product = await Product.findOneAndUpdate({ _id: req.params.id, __v: req.body.version ?? before.__v }, { $set: input, $inc: { __v: 1 } }, { new: true, runValidators: true });
  if (!product) throw new ApiError(409, "This product was changed by another administrator. Refresh before saving.", "VERSION_CONFLICT");
  await audit(req, { action: "product.update", resourceType: "product", resourceId: product.id, before, after: product.toObject(), reason: req.body.reason }); return ok(res, product);
}));
router.post("/products/:productId/variants/:variantId/price", requirePermission("products.write"), asyncHandler(async (req: AdminRequest, res) => {
  const input = z.object({ price: z.number().int(), mrp: z.number().int(), reason: z.string().min(5), taxPercentage: z.number().min(0).max(100).default(18) }).parse(req.body); validatePrice(input.price, input.mrp, input.taxPercentage);
  const product = await Product.findById(req.params.productId); const variant = product?.variants.id(req.params.variantId); if (!product || !variant) throw new ApiError(404, "Variant not found.", "NOT_FOUND");
  const before = { price: variant.price, mrp: variant.mrp }; variant.price = input.price; variant.mrp = input.mrp; variant.taxPercentage = input.taxPercentage; await product.save();
  await PriceHistory.create({ productId: product.id, variantId: variant.id, oldPrice: before.price, newPrice: input.price, oldMrp: before.mrp, newMrp: input.mrp, changedBy: req.admin!.id, reason: input.reason });
  await audit(req, { action: "price.change", resourceType: "product", resourceId: product.id, before, after: input, reason: input.reason }); return ok(res, variant);
}));
router.post("/inventory/adjust", requirePermission("inventory.adjust"), asyncHandler(async (req: AdminRequest, res) => { const input = z.object({ productId: id, variantId: id, delta: z.number().int().refine(v => v !== 0), type: z.enum(["restock", "return", "cancellation", "manual_adjustment", "damaged", "lost"]), reason: z.string().min(5), referenceType: z.string().optional(), referenceId: z.string().optional() }).parse(req.body); const result = await adjustInventory({ ...input, performedBy: req.admin!.id }); await audit(req, { action: "inventory.adjust", resourceType: "product", resourceId: input.productId, after: input, reason: input.reason }); return ok(res, result); }));
router.get("/inventory/transactions", requirePermission("inventory.read"), asyncHandler(async (req, res) => ok(res, await InventoryTransaction.find(req.query.productId ? { productId: req.query.productId } : {}).sort({ createdAt: -1 }).limit(100).lean())));

router.get("/orders", requirePermission("orders.read"), asyncHandler(async (req, res) => { const filter: any = {}; if (req.query.status) filter.orderStatus = req.query.status; if (req.query.q) filter.$or = [{ orderNumber: new RegExp(String(req.query.q), "i") }, { email: new RegExp(String(req.query.q), "i") }]; return ok(res, await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean()); }));
router.patch("/orders/:id/status", requirePermission("orders.manage"), asyncHandler(async (req: AdminRequest, res) => { const input = z.object({ status: z.string(), reason: z.string().min(5) }).parse(req.body); const order = await Order.findById(req.params.id); if (!order) throw new ApiError(404, "Order not found.", "NOT_FOUND"); const before = order.orderStatus; assertOrderTransition(before, input.status); order.orderStatus = input.status as any; order.timeline.push({ type: "status", label: input.status, note: input.reason, actorId: new mongoose.Types.ObjectId(req.admin!.id), at: new Date() }); await order.save(); await audit(req, { action: "order.status", resourceType: "order", resourceId: order.id, before: { status: before }, after: { status: input.status }, reason: input.reason }); return ok(res, order); }));
router.get("/payments", requirePermission("payments.read"), asyncHandler(async (_req, res) => ok(res, await Payment.find().sort({ createdAt: -1 }).limit(100).populate("orderId", "orderNumber email").lean())));
router.get("/customers", requirePermission("customers.read"), asyncHandler(async (req, res) => { const q = String(req.query.q || "").trim(); const filter = q ? { $or: [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }, { phone: new RegExp(q, "i") }] } : {}; return ok(res, await Customer.find(filter).sort({ lifetimeValue: -1 }).limit(100).lean()); }));
router.get("/reviews", requirePermission("reviews.moderate"), asyncHandler(async (req, res) => ok(res, await Review.find(req.query.status ? { status: req.query.status } : {}).sort({ createdAt: -1 }).limit(100).populate("productId", "name sku").lean())));
router.patch("/reviews/:id", requirePermission("reviews.moderate"), asyncHandler(async (req: AdminRequest, res) => { const input = z.object({ status: z.enum(["approved", "rejected", "spam"]), moderationNote: z.string().optional() }).parse(req.body); const review = await Review.findByIdAndUpdate(req.params.id, { ...input, moderatedBy: req.admin!.id, moderatedAt: new Date() }, { new: true }); if (!review) throw new ApiError(404, "Review not found.", "NOT_FOUND"); await audit(req, { action: "review.moderate", resourceType: "review", resourceId: review.id, after: input }); return ok(res, review); }));

const resources: Record<string, any> = { categories: Category, collections: Collection, notes: FragranceNote, occasions: Occasion, heroes: HeroBanner, sections: HomepageSection, navigation: NavigationItem, coupons: Coupon, subscribers: NewsletterSubscriber, messages: ContactMessage, settings: StoreSetting, giftsets: GiftSet, bundles: Bundle, discoverysets: DiscoverySet, shippingmethods: ShippingMethod, shippingzones: ShippingZone, returns: ReturnRequest, social: SocialPost, careers: Career, notifications: Notification };
router.get("/resources/:resource", requirePermission("dashboard.read"), asyncHandler(async (req, res) => { const resource = String(req.params.resource); const Model = resources[resource]; if (!Model) throw new ApiError(404, "Resource not found."); return ok(res, await Model.find().sort({ sortOrder: 1, createdAt: -1 }).limit(200).lean()); }));
router.post("/resources/:resource", requirePermission("cms.manage"), asyncHandler(async (req: AdminRequest, res) => { const resource = String(req.params.resource); const Model = resources[resource]; if (!Model || ["subscribers", "messages"].includes(resource)) throw new ApiError(404, "Resource is not writable here."); const record = await Model.create(req.body); await audit(req, { action: `${resource}.create`, resourceType: resource, resourceId: record.id, after: record.toObject() }); return res.status(201).json({ success: true, data: record }); }));
router.patch("/resources/:resource/:id", requirePermission("cms.manage"), asyncHandler(async (req: AdminRequest, res) => { const resource = String(req.params.resource); const Model = resources[resource]; if (!Model) throw new ApiError(404, "Resource not found."); const before = await Model.findById(req.params.id).lean(); const record = await Model.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }); if (!record) throw new ApiError(404, "Record not found."); await audit(req, { action: `${resource}.update`, resourceType: resource, resourceId: record.id, before, after: record.toObject() }); return ok(res, record); }));

router.get("/search", requirePermission("dashboard.read"), asyncHandler(async (req, res) => { const q = String(req.query.q || "").trim(); if (q.length < 2) return ok(res, {}); const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); const [products, orders, customers, reviews] = await Promise.all([Product.find({ $or: [{ name: rx }, { sku: rx }, { "variants.sku": rx }] }).limit(8).lean(), Order.find({ $or: [{ orderNumber: rx }, { email: rx }] }).limit(8).lean(), Customer.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }).limit(8).lean(), Review.find({ $or: [{ title: rx }, { body: rx }] }).limit(8).lean()]); return ok(res, { products, orders, customers, reviews }); }));
router.get("/audit", requirePermission("audit.read"), asyncHandler(async (_req, res) => ok(res, await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean())));
router.get("/reports/sales.csv", requirePermission("reports.read"), asyncHandler(async (_req, res) => { const rows = await Order.find().sort({ createdAt: -1 }).limit(10000).lean(); const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`; const csv = ["Order,Date,Customer,Status,Payment,Total", ...rows.map((o: any) => [o.orderNumber, o.createdAt.toISOString(), o.email, o.orderStatus, o.paymentStatus, (o.total / 100).toFixed(2)].map(escape).join(","))].join("\n"); res.set({ "content-type": "text/csv", "content-disposition": "attachment; filename=seek-sales.csv" }).send(csv); }));
export default router;
