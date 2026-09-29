import mongoose, { Schema, model, Types } from "mongoose";

const { models } = mongoose;

const SeoSchema = new Schema({ title: String, description: String, keywords: [String], canonical: String, ogImage: String }, { _id: false });
const ScheduledSchema = { active: { type: Boolean, default: true }, startsAt: Date, endsAt: Date, sortOrder: { type: Number, default: 0 } };

const HeroBannerSchema = new Schema({ eyebrow: String, heading: { type: String, required: true }, subheading: String, desktopImage: { type: String, required: true }, mobileImage: String, video: String, ctaText: String, ctaUrl: String, secondaryCtaText: String, secondaryCtaUrl: String, ...ScheduledSchema }, { timestamps: true });
const HomepageSectionSchema = new Schema({ key: { type: String, required: true, unique: true }, type: { type: String, required: true }, title: String, subtitle: String, body: String, layout: String, productIds: [Types.ObjectId], collectionId: Types.ObjectId, image: String, ctaText: String, ctaUrl: String, background: String, displayCount: Number, mobileLayout: String, desktopLayout: String, draft: Schema.Types.Mixed, ...ScheduledSchema }, { timestamps: true });
const NavigationItemSchema = new Schema({ label: { type: String, required: true }, url: { type: String, required: true }, parentId: Types.ObjectId, location: { type: String, enum: ["header", "drawer", "footer"], required: true }, visibility: Schema.Types.Mixed, ...ScheduledSchema }, { timestamps: true });
const StoreSettingSchema = new Schema({ key: { type: String, required: true, unique: true }, group: { type: String, required: true, index: true }, value: Schema.Types.Mixed, public: { type: Boolean, default: false }, updatedBy: Types.ObjectId }, { timestamps: true });

const ReviewSchema = new Schema({ productId: { type: Types.ObjectId, ref: "Product", required: true, index: true }, customerId: { type: Types.ObjectId, ref: "Customer" }, name: String, rating: { type: Number, min: 1, max: 5, required: true }, title: String, body: { type: String, required: true }, images: [String], verifiedPurchase: Boolean, status: { type: String, enum: ["pending", "approved", "rejected", "spam"], default: "pending", index: true }, moderationNote: String, moderatedBy: Types.ObjectId, moderatedAt: Date }, { timestamps: true });
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
const SubscriberSchema = new Schema({ email: { type: String, required: true, unique: true, lowercase: true }, status: { type: String, enum: ["active", "unsubscribed", "bounced"], default: "active" }, consentAt: Date, source: String, unsubscribeTokenHash: { type: String, select: false } }, { timestamps: true });
const ContactMessageSchema = new Schema({ name: String, email: { type: String, required: true, index: true }, phone: String, subject: String, orderNumber: String, message: String, status: { type: String, enum: ["new", "in_progress", "resolved", "spam"], default: "new", index: true }, assignedTo: Types.ObjectId, internalNotes: [{ body: String, adminId: Types.ObjectId, createdAt: { type: Date, default: Date.now } }] }, { timestamps: true });
const SocialPostSchema = new Schema({ platform: { type: String, enum: ["instagram", "facebook", "pinterest", "youtube", "whatsapp"] }, caption: String, image: String, url: String, active: { type: Boolean, default: true }, sortOrder: Number }, { timestamps: true });
const CareerSchema = new Schema({ title: String, slug: { type: String, unique: true }, department: String, location: String, type: String, description: String, status: { type: String, enum: ["draft", "published", "closed"], default: "draft" }, seo: SeoSchema }, { timestamps: true });

const GiftSetSchema = new Schema({ name: String, slug: { type: String, unique: true }, itemRefs: [{ productId: Types.ObjectId, variantId: Types.ObjectId, quantity: Number }], price: Number, mrp: Number, image: String, active: Boolean, seo: SeoSchema }, { timestamps: true });
const BundleSchema = new Schema({ name: String, slug: { type: String, unique: true }, minItems: Number, maxItems: Number, discountType: String, discountValue: Number, eligibleProductIds: [Types.ObjectId], giftWrapEnabled: Boolean, active: Boolean }, { timestamps: true });
const DiscoverySetSchema = new Schema({ name: String, slug: { type: String, unique: true }, sampleCount: Number, sampleSizeMl: Number, productIds: [Types.ObjectId], price: Number, mrp: Number, active: Boolean, seo: SeoSchema }, { timestamps: true });

const ShippingMethodSchema = new Schema({ name: String, code: { type: String, unique: true }, rate: Number, freeAbove: Number, estimatedDaysMin: Number, estimatedDaysMax: Number, codEnabled: Boolean, active: Boolean }, { timestamps: true });
const ShippingZoneSchema = new Schema({ name: String, postalCodePatterns: [String], stateCodes: [String], methodIds: [Types.ObjectId], active: Boolean }, { timestamps: true });
const ReturnSchema = new Schema({ orderId: { type: Types.ObjectId, ref: "Order", index: true }, items: [{ orderItemId: Types.ObjectId, quantity: Number, reason: String, condition: String }], status: { type: String, enum: ["requested", "approved", "rejected", "in_transit", "received", "refunded"], default: "requested", index: true }, customerNote: String, internalNote: String, timeline: [{ type: String, note: String, actorId: Types.ObjectId, at: { type: Date, default: Date.now } }] }, { timestamps: true });
const NotificationSchema = new Schema({ recipientType: String, recipientId: Types.ObjectId, channel: { type: String, enum: ["in_app", "email", "sms", "whatsapp"] }, templateKey: String, subject: String, body: String, data: Schema.Types.Mixed, status: { type: String, enum: ["queued", "sent", "failed", "read"], default: "queued", index: true }, scheduledFor: Date, sentAt: Date, error: String }, { timestamps: true });
const AnalyticsEventSchema = new Schema({ event: { type: String, required: true, index: true }, sessionId: String, customerId: Types.ObjectId, productId: Types.ObjectId, orderId: Types.ObjectId, properties: Schema.Types.Mixed, occurredAt: { type: Date, default: Date.now } }, { timestamps: false });
AnalyticsEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });
const SystemLogSchema = new Schema({ level: { type: String, enum: ["info", "warn", "error"], index: true }, service: String, message: String, context: Schema.Types.Mixed, requestId: String }, { timestamps: { createdAt: true, updatedAt: false } });
SystemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const HeroBanner: any = models.HeroBanner || model("HeroBanner", HeroBannerSchema);
export const HomepageSection: any = models.HomepageSection || model("HomepageSection", HomepageSectionSchema);
export const NavigationItem: any = models.NavigationItem || model("NavigationItem", NavigationItemSchema);
export const StoreSetting: any = models.StoreSetting || model("StoreSetting", StoreSettingSchema);
export const Review: any = models.Review || model("Review", ReviewSchema);
export const NewsletterSubscriber: any = models.NewsletterSubscriber || model("NewsletterSubscriber", SubscriberSchema);
export const ContactMessage: any = models.ContactMessage || model("ContactMessage", ContactMessageSchema);
export const SocialPost: any = models.SocialPost || model("SocialPost", SocialPostSchema);
export const Career: any = models.Career || model("Career", CareerSchema);
export const GiftSet: any = models.GiftSet || model("GiftSet", GiftSetSchema);
export const Bundle: any = models.Bundle || model("Bundle", BundleSchema);
export const DiscoverySet: any = models.DiscoverySet || model("DiscoverySet", DiscoverySetSchema);
export const ShippingMethod: any = models.ShippingMethod || model("ShippingMethod", ShippingMethodSchema);
export const ShippingZone: any = models.ShippingZone || model("ShippingZone", ShippingZoneSchema);
export const ReturnRequest: any = models.ReturnRequest || model("ReturnRequest", ReturnSchema);
export const Notification: any = models.Notification || model("Notification", NotificationSchema);
export const AnalyticsEvent: any = models.AnalyticsEvent || model("AnalyticsEvent", AnalyticsEventSchema);
export const SystemLog: any = models.SystemLog || model("SystemLog", SystemLogSchema);
