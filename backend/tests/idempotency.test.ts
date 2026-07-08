import { describe, expect, it } from "vitest";

describe("idempotency invariant", () => {
  it("returns the same confirmation result for repeated keys", async () => {
    const cache = new Map<string, unknown>();
    let chargeCount = 0;

    async function confirm(idempotencyKey: string) {
      if (cache.has(idempotencyKey)) return cache.get(idempotencyKey);
      chargeCount += 1;
      const result = { orderId: "order-1", ticket: { code: "FLASH-ORDER-1" } };
      cache.set(idempotencyKey, result);
      return result;
    }

    const first = await confirm("idem-1");
    const second = await confirm("idem-1");
    expect(second).toEqual(first);
    expect(chargeCount).toBe(1);
  });
});
