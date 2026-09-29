import mongoose, { Schema, model, Types } from "mongoose";

const { models } = mongoose;

const AddressSchema = new Schema({ name: String, phone: String, line1: String, line2: String, city: String, state: String, postalCode: String, country: { type: String, default: "IN" } }, { _id: false });
const CustomerSchema = new Schema({ userId: { type: Types.ObjectId, sparse: true, unique: true }, name: String, email: { type: String, required: true, lowercase: true, index: true }, phone: { type: String, index: true }, addresses: [AddressSchema], status: { type: String, enum: ["active", "blocked"], default: "active" }, tags: [String], internalNotes: [{ body: String, adminId: Types.ObjectId, createdAt: { type: Date, default: Date.now } }], orderCount: { type: Number, default: 0 }, lifetimeValue: { type: Number, default: 0 }, lastOrderAt: Date }, { timestamps: true });

const CartItemSchema = new Schema({ productId: { type: Types.ObjectId, ref: "Product", required: true }, variantId: { type: Types.ObjectId, required: true }, quantity: { type: Number, min: 1, max: 10, required: true }, addedPrice: Number }, { timestamps: true });
const CartSchema = new Schema({ customerId: { type: Types.ObjectId, ref: "Customer", sparse: true, index: true }, sessionId: { type: String, sparse: true, index: true }, items: [CartItemSchema], couponCode: String, giftWrap: Boolean, giftMessage: String, status: { type: String, enum: ["active", "converted", "abandoned"], default: "active", index: true }, lastActivityAt: { type: Date, default: Date.now, index: true } }, { timestamps: true });

const OrderItemSchema = new Schema({ productId: { type: Types.ObjectId, ref: "Product", required: true }, variantId: Types.ObjectId, productName: { type: String, required: true }, slug: String, sku: { type: String, required: true }, size: String, image: String, unitPrice: { type: Number, required: true }, mrp: Number, discount: { type: Number, default: 0 }, tax: { type: Number, default: 0 }, quantity: { type: Number, min: 1, required: true }, total: { type: Number, required: true } }, { _id: false });
const TimelineSchema = new Schema({ type: { type: String, required: true }, label: { type: String, required: true }, note: String, actorId: Types.ObjectId, at: { type: Date, default: Date.now } }, { _id: false });
const OrderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true }, customerId: { type: Types.ObjectId, ref: "Customer", index: true }, email: { type: String, required: true, lowercase: true, index: true }, phone: String,
  shippingAddress: { type: AddressSchema, required: true }, billingAddress: AddressSchema, items: { type: [OrderItemSchema], validate: [(v: unknown[]) => v.length > 0, "Order requires items"] },
  subtotal: { type: Number, min: 0, required: true }, discount: { type: Number, min: 0, default: 0 }, tax: { type: Number, min: 0, default: 0 }, shipping: { type: Number, min: 0, default: 0 }, giftWrap: { type: Number, min: 0, default: 0 }, total: { type: Number, min: 0, required: true },
  couponSnapshot: Schema.Types.Mixed, paymentSnapshot: Schema.Types.Mixed,
  orderStatus: { type: String, enum: ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "return_requested", "returned", "refunded"], default: "pending", index: true },
  paymentStatus: { type: String, enum: ["pending", "authorized", "captured", "failed", "refunded", "partially_refunded"], default: "pending", index: true }, shippingStatus: { type: String, default: "unfulfilled", index: true },
  courier: String, trackingNumber: String, customerNote: String, internalNotes: [{ body: String, adminId: Types.ObjectId, createdAt: { type: Date, default: Date.now } }], timeline: [TimelineSchema],
}, { timestamps: true, optimisticConcurrency: true });
OrderSchema.index({ createdAt: -1, orderStatus: 1 });

const PaymentSchema = new Schema({ orderId: { type: Types.ObjectId, ref: "Order", required: true, index: true }, gateway: { type: String, default: "razorpay" }, gatewayOrderId: { type: String, sparse: true, unique: true }, gatewayPaymentId: { type: String, sparse: true, unique: true }, method: String, amount: { type: Number, min: 0, required: true }, currency: { type: String, default: "INR" }, status: { type: String, enum: ["pending", "authorized", "captured", "failed", "refunded", "partially_refunded"], default: "pending", index: true }, verifiedAt: Date, failureCode: String, failureDescription: String, gatewaySnapshot: Schema.Types.Mixed }, { timestamps: true });
const RefundSchema = new Schema({ orderId: { type: Types.ObjectId, ref: "Order", required: true, index: true }, paymentId: { type: Types.ObjectId, ref: "Payment", required: true }, gatewayRefundId: { type: String, sparse: true, unique: true }, amount: { type: Number, min: 1, required: true }, reason: { type: String, required: true }, status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" }, initiatedBy: { type: Types.ObjectId, ref: "Admin", required: true }, gatewaySnapshot: Schema.Types.Mixed }, { timestamps: true });

const InventoryTransactionSchema = new Schema({ productId: { type: Types.ObjectId, ref: "Product", required: true, index: true }, variantId: { type: Types.ObjectId, required: true, index: true }, sku: { type: String, required: true, index: true }, type: { type: String, enum: ["sale", "restock", "return", "cancellation", "manual_adjustment", "damaged", "lost", "reserved", "released"], required: true }, quantity: { type: Number, required: true }, beforeQuantity: Number, afterQuantity: Number, beforeReserved: Number, afterReserved: Number, reason: { type: String, required: true }, referenceType: String, referenceId: String, performedBy: Types.ObjectId }, { timestamps: { createdAt: true, updatedAt: false } });
InventoryTransactionSchema.index({ createdAt: -1 });

const CouponSchema = new Schema({ code: { type: String, required: true, unique: true, uppercase: true, trim: true }, type: { type: String, enum: ["percentage", "fixed", "free_shipping"], required: true }, value: { type: Number, min: 0, required: true }, minimumOrder: { type: Number, min: 0, default: 0 }, maximumDiscount: { type: Number, min: 0 }, startsAt: Date, expiresAt: Date, usageLimit: Number, perCustomerLimit: { type: Number, default: 1 }, applicableProductIds: [Types.ObjectId], applicableCategoryIds: [Types.ObjectId], newCustomersOnly: Boolean, stackable: { type: Boolean, default: false }, usageCount: { type: Number, default: 0 }, enabled: { type: Boolean, default: true, index: true } }, { timestamps: true });
const CouponUsageSchema = new Schema({ couponId: { type: Types.ObjectId, ref: "Coupon", required: true }, customerId: { type: Types.ObjectId, ref: "Customer", required: true }, orderId: { type: Types.ObjectId, ref: "Order", required: true }, discount: { type: Number, required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
CouponUsageSchema.index({ couponId: 1, customerId: 1 });

export const Customer: any = models.Customer || model("Customer", CustomerSchema);
export const Cart: any = models.Cart || model("Cart", CartSchema);
export const Order: any = models.Order || model("Order", OrderSchema);
export const Payment: any = models.Payment || model("Payment", PaymentSchema);
export const Refund: any = models.Refund || model("Refund", RefundSchema);
export const InventoryTransaction: any = models.InventoryTransaction || model("InventoryTransaction", InventoryTransactionSchema);
export const Coupon: any = models.Coupon || model("Coupon", CouponSchema);
export const CouponUsage: any = models.CouponUsage || model("CouponUsage", CouponUsageSchema);
