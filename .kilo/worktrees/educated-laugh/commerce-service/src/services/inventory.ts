import mongoose from "mongoose";
import { Product } from "../models/catalog.js";
import { InventoryTransaction } from "../models/commerce.js";
import { ApiError } from "../utils/http.js";

export async function adjustInventory(input: { productId: string; variantId: string; delta: number; type: string; reason: string; performedBy: string; referenceType?: string; referenceId?: string }) {
  if (!input.reason.trim()) throw new ApiError(422, "A reason is required for inventory changes.", "REASON_REQUIRED");
  const session = await mongoose.startSession();
  try {
    let result: unknown;
    await session.withTransaction(async () => {
      const product = await Product.findOne({ _id: input.productId, "variants._id": input.variantId }).session(session);
      if (!product) throw new ApiError(404, "Product variant not found.", "VARIANT_NOT_FOUND");
      const variant = product.variants.id(input.variantId);
      if (!variant) throw new ApiError(404, "Product variant not found.", "VARIANT_NOT_FOUND");
      const before = variant.inventory;
      const after = before + input.delta;
      if (after < variant.reservedInventory || after < 0) throw new ApiError(409, "Inventory cannot fall below reserved quantity.", "INVENTORY_CONFLICT");
      variant.inventory = after;
      await product.save({ session });
      result = await InventoryTransaction.create([{ productId: product.id, variantId: variant.id, sku: variant.sku, type: input.type, quantity: input.delta, beforeQuantity: before, afterQuantity: after, beforeReserved: variant.reservedInventory, afterReserved: variant.reservedInventory, reason: input.reason, referenceType: input.referenceType, referenceId: input.referenceId, performedBy: input.performedBy }], { session });
    });
    return result;
  } finally { await session.endSession(); }
}

