import { describe, expect, it } from "vitest";
import { calculateOrderTotal, validatePrice } from "../src/services/pricing.js";

describe("pricing invariants", () => {
  it("calculates integer-paise totals on the server", () => {
    expect(calculateOrderTotal([{ price: 129900, quantity: 2, taxPercentage: 18 }], 10000, 0, 9900)).toEqual({ subtotal: 259800, discount: 10000, tax: 39631, shipping: 0, giftWrap: 9900, total: 259700 });
  });
  it("rejects a selling price above MRP", () => expect(() => validatePrice(200000, 150000)).toThrow("cannot exceed"));
  it("derives discount percentage", () => expect(validatePrice(149900, 199900).discountPercentage).toBe(25.01));
});

