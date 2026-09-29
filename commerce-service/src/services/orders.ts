import { ApiError } from "../utils/http.js";

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"], confirmed: ["processing", "cancelled"], processing: ["packed", "cancelled"], packed: ["shipped"],
  shipped: ["out_for_delivery", "return_requested"], out_for_delivery: ["delivered", "return_requested"], delivered: ["return_requested"],
  return_requested: ["returned"], returned: ["refunded"], cancelled: [], refunded: [],
};
export function assertOrderTransition(from: string, to: string) {
  if (!(ORDER_TRANSITIONS[from] || []).includes(to)) throw new ApiError(409, `Order cannot move from ${from} to ${to}.`, "INVALID_ORDER_TRANSITION");
}

