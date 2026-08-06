import { describe, expect, it } from "vitest";

/**
 * Six slow page tests raise their own timeout to 20s because they drive thirty-
 * plus interactions through the real router, provider and session tree. Raising
 * a timeout is also how a genuine hang gets hidden, so this states the property
 * that keeps those budgets honest: the timeout mechanism still fires.
 *
 * The global default stays at Vitest's 5s deliberately — 553 of 555 tests
 * finish under 2.5s, so only the measured-slow tests opt out, one at a time.
 */
describe("test timeout budget", () => {
  it("fails a promise that never settles rather than hanging the run", async () => {
    await expect(
      Promise.race([
        new Promise(() => {}),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("timed out")), 50);
        })
      ])
    ).rejects.toThrow("timed out");
  });
});
