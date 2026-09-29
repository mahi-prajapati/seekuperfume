import { ApiError } from "../utils/http.js";

export function validatePrice(price: number, mrp: number, taxPercentage = 18) {
  if (!Number.isInteger(price) || !Number.isInteger(mrp) || price < 0 || mrp < 0) throw new ApiError(422, "Prices must be non-negative integer paise values.", "INVALID_PRICE");
  if (price > mrp) throw new ApiError(422, "Selling price cannot exceed MRP.", "PRICE_ABOVE_MRP");
  if (taxPercentage < 0 || taxPercentage > 100) throw new ApiError(422, "Tax percentage must be between 0 and 100.", "INVALID_TAX");
  return { price, mrp, discountPercentage: mrp ? Math.round(((mrp - price) / mrp) * 10000) / 100 : 0, taxPercentage };
}

export function calculateOrderTotal(lines: { price: number; quantity: number; taxPercentage: number }[], discount = 0, shipping = 0, giftWrap = 0) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = lines.reduce((sum, line) => sum + Math.round(line.price * line.quantity * line.taxPercentage / (100 + line.taxPercentage)), 0);
  const total = Math.max(0, subtotal - discount + shipping + giftWrap);
  return { subtotal, discount, tax, shipping, giftWrap, total };
}
