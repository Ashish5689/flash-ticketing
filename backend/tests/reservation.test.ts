import { describe, expect, it } from "vitest";

class AtomicHoldStore {
  private holds = new Map<string, string>();

  async setNx(key: string, value: string) {
    if (this.holds.has(key)) return false;
    this.holds.set(key, value);
    return true;
  }

  async releaseIfOwner(key: string, value: string) {
    if (this.holds.get(key) !== value) return false;
    this.holds.delete(key);
    return true;
  }
}

describe("reservation invariant", () => {
  it("allows exactly one winner for many concurrent attempts at one seat", async () => {
    const store = new AtomicHoldStore();
    const attempts = Array.from({ length: 100 }, (_, index) => store.setNx("hold:event:seat", `user-${index}`));
    const results = await Promise.all(attempts);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("only releases a hold for the owner payload", async () => {
    const store = new AtomicHoldStore();
    await store.setNx("hold:event:seat", "buyer-a");
    expect(await store.releaseIfOwner("hold:event:seat", "buyer-b")).toBe(false);
    expect(await store.releaseIfOwner("hold:event:seat", "buyer-a")).toBe(true);
  });
});
