import { describe, expect, it } from "vitest";
import { assertOrderTransition } from "../src/services/orders.js";

describe("order state machine", () => {
  it("allows the normal fulfilment sequence", () => {
    expect(() => assertOrderTransition("confirmed", "processing")).not.toThrow();
    expect(() => assertOrderTransition("packed", "shipped")).not.toThrow();
  });
  it("blocks invalid financial/history rewinds", () => expect(() => assertOrderTransition("delivered", "pending")).toThrow("cannot move"));
});

